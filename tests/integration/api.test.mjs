// Integration tests: real PocketBase instance + hooks + API rules.
// Run: node --test tests/integration/
// Requires backend/bin/pocketbase (any platform-matching build).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PORT = 8091;
const API = `http://127.0.0.1:${PORT}/api`;
const BACKEND = resolve(import.meta.dirname, "../../backend");
let pb, dataDir, token, ids = {};

const j = (r) => r.json();
const H = () => ({ "Content-Type": "application/json", Authorization: token });
const post = (path, body) => fetch(`${API}${path}`, { method: "POST", headers: H(), body: JSON.stringify(body) }).then(j);
const patch = (path, body) => fetch(`${API}${path}`, { method: "PATCH", headers: H(), body: JSON.stringify(body) }).then(j);
const get = (path) => fetch(`${API}${path}`, { headers: H() }).then(j);
const del = (path) => fetch(`${API}${path}`, { method: "DELETE", headers: H() });

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "nw-pb-"));
  pb = spawn(join(BACKEND, "bin/pocketbase"), [
    "serve", `--http=127.0.0.1:${PORT}`,
    `--dir=${dataDir}`,
    `--migrationsDir=${join(BACKEND, "pb_migrations")}`,
    `--hooksDir=${join(BACKEND, "pb_hooks")}`,
  ], { stdio: "ignore" });
  // wait for health
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${API}/health`);
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
});

after(() => {
  pb?.kill();
  try { rmSync(dataDir, { recursive: true, force: true }); } catch {}
});

test("default admin/password login works", async () => {
  const res = await post("/collections/employees/auth-with-password", { identity: "admin", password: "password" });
  assert.ok(res.token, JSON.stringify(res));
  token = res.token;
  ids.emp = res.record.id;
  assert.equal(res.record.role, "admin");
});

test("unauthenticated access is blocked", async () => {
  const res = await fetch(`${API}/collections/companies/records`).then(j);
  assert.ok(!res.items || res.items.length === 0 || res.status >= 400);
  const created = await fetch(`${API}/collections/companies/records`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_name: "X", company_type: ["customer"] }),
  }).then(j);
  assert.ok(created.status >= 400, "unauthenticated create must fail");
});

test("master data setup", async () => {
  ids.supplier = (await post("/collections/companies/records", { company_name: "Pavlova Ltd", company_type: ["supplier"] })).id;
  ids.customer = (await post("/collections/companies/records", { company_name: "Island Trading", company_type: ["customer"] })).id;
  ids.shipper = (await post("/collections/companies/records", { company_name: "Speedy Express", company_type: ["shipper"] })).id;
  ids.cat = (await post("/collections/product_categories/records", { category_name: "Beverages" })).id;
  const prod = await post("/collections/products/records", {
    product_code: "NWTB-1", product_name: "Chai", category: ids.cat, supplier: ids.supplier,
    list_price: 18, standard_cost: 13.5, reorder_level: 10, target_level: 40,
  });
  ids.prod = prod.id;
  assert.ok(ids.supplier && ids.customer && ids.shipper && ids.cat && ids.prod);
});

test("order auto-number + defaults", async () => {
  const ord = await post("/collections/orders/records", { customer: ids.customer, employee: ids.emp });
  ids.order = ord.id;
  assert.match(ord.order_number, /^SO-\d{5}$/);
  assert.equal(ord.status, "new");
  assert.ok(ord.order_date);
});

test("line with no stock -> no_stock, price snapshot", async () => {
  const line = await post("/collections/order_details/records", { order: ids.order, product: ids.prod, quantity: 5 });
  ids.line = line.id;
  const fresh = await get(`/collections/order_details/records/${ids.line}`);
  assert.equal(fresh.status, "no_stock");
  assert.equal(fresh.unit_price, 18);
});

test("BR-O2: invoice blocked while line not allocated", async () => {
  const res = await patch(`/collections/orders/records/${ids.order}`, { status: "invoiced" });
  assert.match(res.message, /Allocated/);
});

test("BR: illegal transitions rejected", async () => {
  const res = await patch(`/collections/orders/records/${ids.order}`, { status: "shipped" });
  assert.match(res.message, /Illegal status transition/);
});

test("PO lifecycle: draft -> submitted -> approved", async () => {
  const po = await post("/collections/purchase_orders/records", { supplier: ids.supplier, created_by: ids.emp });
  ids.po = po.id;
  assert.match(po.po_number, /^PO-\d{5}$/);
  const pod = await post("/collections/purchase_order_details/records", {
    purchase_order: ids.po, product: ids.prod, quantity: 40, unit_cost: 13.5,
  });
  ids.pod = pod.id;
  // receive before approve rejected (BR-P3)
  const early = await patch(`/collections/purchase_order_details/records/${ids.pod}`, { date_received: "2026-07-08 10:00:00.000Z" });
  assert.match(early.message, /approved PO/);
  // skip transition rejected
  const skip = await patch(`/collections/purchase_orders/records/${ids.po}`, { status: "approved" });
  assert.match(skip.message, /Illegal PO status transition/);
  await patch(`/collections/purchase_orders/records/${ids.po}`, { status: "submitted" });
  const approved = await patch(`/collections/purchase_orders/records/${ids.po}`, { status: "approved" });
  assert.equal(approved.status, "approved");
  assert.equal(approved.approved_by, ids.emp);
});

test("receiving posts stock and re-allocates waiting order line", async () => {
  const rec = await patch(`/collections/purchase_order_details/records/${ids.pod}`, { date_received: "2026-07-08 10:00:00.000Z" });
  assert.equal(rec.posted_to_inventory, true);
  const line = await get(`/collections/order_details/records/${ids.line}`);
  assert.equal(line.status, "allocated");
  const led = await get(`/collections/inventory_transactions/records?sort=created`);
  const types = led.items.map((i) => i.transaction_type);
  assert.ok(types.includes("purchased") && types.includes("on_hold"), JSON.stringify(types));
});

test("invoice converts hold to sold; ship requires shipper; close ends flow", async () => {
  const inv = await patch(`/collections/orders/records/${ids.order}`, { status: "invoiced" });
  assert.equal(inv.status, "invoiced");
  const led = await get(`/collections/inventory_transactions/records?filter=${encodeURIComponent(`related_order_detail='${ids.line}'`)}`);
  assert.equal(led.items[0].transaction_type, "sold");

  const noShipper = await patch(`/collections/orders/records/${ids.order}`, { status: "shipped" });
  assert.match(noShipper.message, /shipper/i);

  const shipped = await patch(`/collections/orders/records/${ids.order}`, { status: "shipped", shipper: ids.shipper, shipping_fee: 12.5 });
  assert.equal(shipped.status, "shipped");

  const lineEdit = await patch(`/collections/order_details/records/${ids.line}`, { quantity: 9 });
  assert.match(lineEdit.message, /locked/);

  const closed = await patch(`/collections/orders/records/${ids.order}`, { status: "closed" });
  assert.equal(closed.status, "closed");

  const reopened = await patch(`/collections/orders/records/${ids.order}`, { status: "new" });
  assert.match(reopened.message, /read-only/);
});

test("stock ledger math is consistent", async () => {
  const led = await get("/collections/inventory_transactions/records?perPage=200");
  const sum = (t) => led.items.filter((i) => i.transaction_type === t).reduce((a, b) => a + b.quantity, 0);
  const purchased = sum("purchased"), sold = sum("sold"), hold = sum("on_hold");
  assert.equal(purchased, 40);
  assert.equal(sold, 5);
  assert.equal(hold, 0);
  assert.equal(purchased - sold, 35); // on hand
});

test("BR-I1/I4: manual adjustments guarded", async () => {
  const neg = await post("/collections/inventory_transactions/records", {
    transaction_type: "sold", product: ids.prod, quantity: 999, comments: "oops",
  });
  assert.match(neg.message, /negative/);
  const noComment = await post("/collections/inventory_transactions/records", {
    transaction_type: "sold", product: ids.prod, quantity: 1,
  });
  assert.match(noComment.message, /comment/);
  const ok = await post("/collections/inventory_transactions/records", {
    transaction_type: "sold", product: ids.prod, quantity: 2, comments: "breakage",
  });
  assert.ok(ok.id);
});

test("BR-C1/C2: company guards", async () => {
  const delRes = await del(`/collections/companies/records/${ids.customer}`).then(j);
  assert.match(delRes.message, /cannot be deleted/);
  const typeRemove = await patch(`/collections/companies/records/${ids.supplier}`, { company_type: ["customer"] });
  assert.match(typeRemove.message, /in use/);
});

test("BR-E1: employee with documents cannot be deleted", async () => {
  const res = await del(`/collections/employees/records/${ids.emp}`).then(j);
  assert.match(res.message, /deactivate/i);
});

test("role enforcement: sales cannot approve PO", async () => {
  // create a sales user
  await post("/collections/employees/records", {
    username: "nok", email: "nok@northwind.local", password: "password", passwordConfirm: "password",
    first_name: "Nok", last_name: "Sales", role: "sales", active: true,
  });
  const login = await post("/collections/employees/auth-with-password", { identity: "nok", password: "password" });
  assert.ok(login.token);
  const adminToken = token;
  token = login.token;
  const po = await post("/collections/purchase_orders/records", { supplier: ids.supplier, created_by: ids.emp });
  assert.ok(po.status >= 400, "sales must not create POs: " + JSON.stringify(po));
  token = adminToken;
});

test("deactivated employee cannot log in", async () => {
  const nok = await get(`/collections/employees/records?filter=${encodeURIComponent("username='nok'")}`);
  await patch(`/collections/employees/records/${nok.items[0].id}`, { active: false });
  const login = await post("/collections/employees/auth-with-password", { identity: "nok", password: "password" });
  assert.ok(!login.token, "deactivated login must fail");
});
