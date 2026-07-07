// 9-month business history simulator. Run against a FRESH instance (migrations only):
//   node backend/seed/simulate.mjs http://127.0.0.1:8090
// Creates master data, then replays month-by-month purchasing (POs -> approve -> receive)
// and direct sales to customers (orders -> allocate -> invoice -> ship -> close),
// with the inventory ledger backdated to match. All writes go through the real API
// so every business rule is exercised; only transaction *dates* are corrected via
// the superuser account (the ledger is immutable to normal users).
const BASE = process.argv[2] || "http://127.0.0.1:8090";
const API = `${BASE}/api`;
let token = "", suToken = "";

const H = (t) => ({ "Content-Type": "application/json", Authorization: t });
async function req(method, path, body, su = false) {
  const res = await fetch(`${API}${path}`, {
    method, headers: H(su ? suToken : token), body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data).slice(0, 250)}`);
  return data;
}
const post = (p, b) => req("POST", p, b);
const patch = (p, b) => req("PATCH", p, b);
const get = (p) => req("GET", p);
const suPatch = (p, b) => req("PATCH", p, b, true);

// deterministic PRNG so reruns produce the same story
let seed = 20260708;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickW = (pairs) => { // [[item, weight], ...]
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let r = rnd() * total;
  for (const [item, w] of pairs) { r -= w; if (r <= 0) return item; }
  return pairs[pairs.length - 1][0];
};
const D = (y, m, day, h = 9) => {
  const dt = new Date(Date.UTC(y, m, day, h, ri(0, 59), ri(0, 59)));
  return dt.toISOString().replace("T", " ");
};

// ---- auth ------------------------------------------------------------------
const login = await post("/collections/employees/auth-with-password", { identity: "admin", password: "password" });
token = login.token;
const adminId = login.record.id;
const su = await post("/collections/_superusers/auth-with-password", { identity: "admin@northwind.local", password: "northwind-admin-2026" });
suToken = su.token;

if ((await get("/collections/companies/records?perPage=1")).totalItems > 0) {
  console.log("Database is not empty — simulate.mjs needs a fresh instance. Aborting.");
  process.exit(1);
}

// ---- master data (same catalog as seed.mjs) --------------------------------
console.log("Master data…");
const employees = { admin: adminId };
for (const e of [
  ["nok", "Nok", "Srisuwan", "Sales Representative", "sales", "th"],
  ["ken", "Ken", "Tanaka", "Purchasing Specialist", "purchasing", "ja"],
  ["ploy", "Ploy", "Chaiyaporn", "Warehouse Coordinator", "warehouse", "th"],
  ["suda", "Suda", "Wattana", "Operations Manager", "manager", "en"],
]) {
  const rec = await post("/collections/employees/records", {
    username: e[0], email: `${e[0]}@northwind.raawww.com`, password: "password", passwordConfirm: "password",
    first_name: e[1], last_name: e[2], job_title: e[3], role: e[4], language: e[5], active: true,
  });
  employees[e[0]] = rec.id;
}

const companies = {};
for (const c of [
  ["Exotic Liquids", ["supplier"], "London", "UK"],
  ["New Orleans Cajun Delights", ["supplier"], "New Orleans", "USA"],
  ["Tokyo Traders", ["supplier"], "Tokyo", "Japan"],
  ["Pavlova, Ltd.", ["supplier"], "Melbourne", "Australia"],
  ["Alfreds Futterkiste", ["customer"], "Berlin", "Germany"],
  ["Around the Horn", ["customer"], "London", "UK"],
  ["Berglunds snabbköp", ["customer"], "Luleå", "Sweden"],
  ["Bangkok Gourmet Foods", ["customer"], "Bangkok", "Thailand"],
  ["Osaka Fine Foods", ["customer"], "Osaka", "Japan"],
  ["Island Trading", ["customer"], "Cowes", "UK"],
  ["Speedy Express", ["shipper"], "Seattle", "USA"],
  ["United Package", ["shipper"], "Portland", "USA"],
]) {
  const rec = await post("/collections/companies/records", {
    company_name: c[0], company_type: c[1], city: c[2], country: c[3], phone: "+1-555-0100",
  });
  companies[c[0]] = rec.id;
}
const shippers = [companies["Speedy Express"], companies["United Package"]];
const customers = [
  ["Alfreds Futterkiste", 26], ["Around the Horn", 22], ["Bangkok Gourmet Foods", 18],
  ["Osaka Fine Foods", 14], ["Island Trading", 12], ["Berglunds snabbköp", 8],
].map(([n, w]) => [companies[n], w]);

const cats = {};
for (const c of [
  ["Beverages", "Soft drinks, coffees, teas, beers"], ["Condiments", "Sweet and savory sauces, relishes, spreads"],
  ["Confections", "Desserts, candies, and sweet breads"], ["Dairy Products", "Cheeses"],
  ["Grains & Cereals", "Breads, crackers, pasta, and cereal"], ["Meat & Poultry", "Prepared meats"],
  ["Produce", "Dried fruit and bean curd"], ["Seafood", "Seaweed and fish"],
]) cats[c[0]] = (await post("/collections/product_categories/records", { category_name: c[0], description: c[1] })).id;

// [code, name, cat, supplier, list, cost, reorder, target, popularity]
const productRows = [
  ["NWTB-1", "Chai", "Beverages", "Exotic Liquids", 18, 13.5, 15, 60, 9],
  ["NWTB-2", "Chang", "Beverages", "Exotic Liquids", 19, 14.25, 25, 100, 10],
  ["NWTCO-3", "Aniseed Syrup", "Condiments", "Exotic Liquids", 10, 7.5, 10, 40, 3],
  ["NWTCO-4", "Cajun Seasoning", "Condiments", "New Orleans Cajun Delights", 22, 16.5, 10, 40, 5],
  ["NWTO-5", "Olive Oil", "Condiments", "New Orleans Cajun Delights", 21.35, 16.01, 10, 40, 6],
  ["NWTJP-6", "Boysenberry Spread", "Condiments", "New Orleans Cajun Delights", 25, 18.75, 25, 100, 4],
  ["NWTDFN-7", "Dried Pears", "Produce", "Tokyo Traders", 30, 22.5, 10, 40, 3],
  ["NWTS-8", "Curry Sauce", "Condiments", "Tokyo Traders", 40, 30, 10, 40, 4],
  ["NWTDFN-14", "Walnuts", "Produce", "Tokyo Traders", 23.25, 17.44, 10, 40, 4],
  ["NWTCFV-17", "Fruit Cocktail", "Produce", "Pavlova, Ltd.", 39, 29.25, 10, 40, 2],
  ["NWTBGM-19", "Chocolate Biscuits Mix", "Confections", "Pavlova, Ltd.", 9.2, 6.9, 8, 30, 5],
  ["NWTJP-6b", "Marmalade", "Confections", "Pavlova, Ltd.", 81, 60.75, 10, 40, 2],
  ["NWTBGM-21", "Scones", "Confections", "Pavlova, Ltd.", 10, 7.5, 8, 30, 4],
  ["NWTB-34", "Sasquatch Ale", "Beverages", "Exotic Liquids", 14, 10.5, 15, 60, 6],
  ["NWTB-43", "Coffee", "Beverages", "Tokyo Traders", 46, 34.5, 25, 100, 8],
  ["NWTCA-48", "Chocolate", "Confections", "Pavlova, Ltd.", 12.75, 9.56, 25, 100, 7],
  ["NWTDFN-51", "Dried Apples", "Produce", "Tokyo Traders", 53, 39.75, 10, 40, 3],
  ["NWTG-52", "Long Grain Rice", "Grains & Cereals", "Tokyo Traders", 7, 5.25, 25, 100, 6],
  ["NWTP-56", "Gnocchi", "Grains & Cereals", "Pavlova, Ltd.", 38, 28.5, 30, 120, 7],
  ["NWTP-57", "Ravioli", "Grains & Cereals", "Pavlova, Ltd.", 19.5, 14.63, 20, 80, 5],
];
const products = {}; // code -> {id, supplier, cost, popularity}
for (const p of productRows) {
  const rec = await post("/collections/products/records", {
    product_code: p[0], product_name: p[1], category: cats[p[2]], supplier: companies[p[3]],
    list_price: p[4], standard_cost: p[5], reorder_level: p[6], target_level: p[7],
  });
  products[p[0]] = { id: rec.id, supplier: companies[p[3]], supplierName: p[3], cost: p[5], pop: p[8] };
}

// ---- helpers over the API ---------------------------------------------------
async function fixTxDates(filter, dateStr) {
  const txs = await get(`/collections/inventory_transactions/records?perPage=200&filter=${encodeURIComponent(filter)}`);
  for (const tx of txs.items) {
    await suPatch(`/collections/inventory_transactions/records/${tx.id}`, { transaction_date: dateStr });
  }
}

async function runPO(supplierId, lines, y, m, opts = {}) {
  // lines: [{productId, qty, cost}]
  const createDay = ri(1, 4);
  const po = await post("/collections/purchase_orders/records", {
    supplier: supplierId, created_by: employees.ken,
    expected_date: D(y, m, createDay + 10), notes: opts.notes || "",
  });
  const lineIds = [];
  for (const l of lines) {
    const rec = await post("/collections/purchase_order_details/records", {
      purchase_order: po.id, product: l.productId, quantity: l.qty, unit_cost: l.cost,
    });
    lineIds.push(rec.id);
  }
  await patch(`/collections/purchase_orders/records/${po.id}`, { status: "submitted", submitted_date: D(y, m, createDay) });
  if (opts.stopAt === "submitted") return po;
  await patch(`/collections/purchase_orders/records/${po.id}`, { status: "approved" });
  if (opts.stopAt === "approved") return po;
  const recvDate = D(y, m, ri(createDay + 3, createDay + 9));
  for (const id of lineIds) {
    await patch(`/collections/purchase_order_details/records/${id}`, { date_received: recvDate });
  }
  await fixTxDates(`related_purchase_order='${po.id}'`, recvDate);
  await patch(`/collections/purchase_orders/records/${po.id}`, { status: "closed" });
  return po;
}

let skippedLines = 0;
async function runOrder(customerId, employeeId, lines, y, m, finalStatus) {
  const day = ri(2, 26);
  const orderDate = D(y, m, day, 8);
  const ord = await post("/collections/orders/records", { customer: customerId, employee: employeeId, order_date: orderDate });
  let allAllocated = true, added = 0;
  for (const l of lines) {
    try {
      const rec = await post("/collections/order_details/records", { order: ord.id, product: l.productId, quantity: l.qty });
      added++;
      const fresh = await get(`/collections/order_details/records/${rec.id}`);
      if (fresh.status !== "allocated") allAllocated = false;
    } catch { skippedLines++; }
  }
  if (added === 0) { await fetch(`${API}/collections/orders/records/${ord.id}`, { method: "DELETE", headers: H(token) }); return null; }
  // backdate the on_hold allocations to the order date
  await fixTxDates(`related_order='${ord.id}' && transaction_type='on_hold'`, orderDate);
  if (finalStatus === "new" || !allAllocated) return ord;

  const invDay = Math.min(day + ri(1, 3), 27);
  const invDate = D(y, m, invDay, 11);
  await patch(`/collections/orders/records/${ord.id}`, { status: "invoiced", invoice_date: invDate });
  await fixTxDates(`related_order='${ord.id}' && transaction_type='sold'`, invDate);
  if (finalStatus === "invoiced") return ord;

  const shipDate = D(y, m, Math.min(invDay + ri(1, 3), 28), 15);
  await patch(`/collections/orders/records/${ord.id}`, {
    status: "shipped", shipper: pick(shippers), shipping_fee: ri(8, 28), shipped_date: shipDate,
  });
  if (finalStatus === "shipped") return ord;
  await patch(`/collections/orders/records/${ord.id}`, { status: "closed" });
  return ord;
}

// ---- the 9-month story -------------------------------------------------------
const now = new Date();
const codes = Object.keys(products);
let orderCount = 0, poCount = 0;

for (let back = 8; back >= 0; back--) {
  const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
  const y = ref.getUTCFullYear(), m = ref.getUTCMonth();
  const isCurrent = back === 0;
  // gentle seasonality + growth toward the present
  const season = 1 + 0.3 * Math.sin(((8 - back) / 9) * Math.PI * 2) + (8 - back) * 0.05;

  // 1) plan demand per product for this month
  const demand = {};
  for (const code of codes) {
    const p = products[code];
    const base = p.pop * 3 * season * (0.75 + rnd() * 0.5);
    demand[code] = Math.max(0, Math.round(base));
  }

  // 2) purchasing first: cover demand ×1.35 buffer, grouped by supplier
  const bySupplier = {};
  for (const code of codes) {
    if (demand[code] === 0) continue;
    const p = products[code];
    const qty = Math.max(10, Math.ceil(demand[code] * 1.35));
    (bySupplier[p.supplier] ||= []).push({ productId: p.id, qty, cost: p.cost });
  }
  for (const [supplierId, lines] of Object.entries(bySupplier)) {
    await runPO(supplierId, lines, y, m);
    poCount++;
  }

  // 3) sales: distribute demand across orders
  const pool = [];
  for (const code of codes) if (demand[code] > 0) pool.push({ code, remaining: demand[code] });
  const nOrders = ri(5, 8);
  for (let i = 0; i < nOrders && pool.some((p) => p.remaining > 0); i++) {
    const lines = [];
    const nLines = ri(1, 4);
    for (let j = 0; j < nLines; j++) {
      const candidates = pool.filter((p) => p.remaining > 0);
      if (!candidates.length) break;
      const c = pickW(candidates.map((p) => [p, products[p.code].pop]));
      const qty = Math.min(c.remaining, ri(2, Math.max(3, Math.ceil(c.remaining / 2))));
      c.remaining -= qty;
      lines.push({ productId: products[c.code].id, qty });
    }
    if (!lines.length) continue;
    let finalStatus = "closed";
    if (isCurrent) finalStatus = pick(["new", "new", "invoiced", "shipped", "closed"]);
    else if (back === 1) finalStatus = pick(["closed", "closed", "closed", "shipped"]);
    const emp = pickW([[employees.nok, 6], [employees.suda, 2], [employees.admin, 2]]);
    const done = await runOrder(pickW(customers), emp, lines, y, m, finalStatus);
    if (done) orderCount++;
  }

  // 4) occasional warehouse write-off
  if (back % 3 === 1) {
    const code = pick(codes.filter((c) => demand[c] > 2));
    try {
      const adj = await post("/collections/inventory_transactions/records", {
        transaction_type: "sold", product: products[code].id, quantity: ri(1, 3),
        comments: "Damaged in warehouse — write-off", transaction_date: D(y, m, ri(10, 25)),
      });
      void adj;
    } catch {}
  }
  console.log(`Month ${y}-${String(m + 1).padStart(2, "0")} done (season ${season.toFixed(2)})`);
}

// 5) current open items for the dashboard: a PO awaiting approval + a no-stock order
const openPo = await post("/collections/purchase_orders/records", {
  supplier: companies["Pavlova, Ltd."], created_by: employees.ken,
  expected_date: D(now.getUTCFullYear(), now.getUTCMonth(), Math.min(now.getUTCDate() + 12, 28)),
  notes: "Restock biscuit mix",
});
await post("/collections/purchase_order_details/records", {
  purchase_order: openPo.id, product: products["NWTBGM-19"].id, quantity: 40, unit_cost: 6.9,
});
await patch(`/collections/purchase_orders/records/${openPo.id}`, { status: "submitted" });
poCount++;

const big = await post("/collections/orders/records", { customer: companies["Island Trading"], employee: employees.nok });
await post("/collections/order_details/records", { order: big.id, product: products["NWTJP-6b"].id, quantity: 60 }); // deliberately exceeds stock
orderCount++;

console.log(`Simulation complete: ${orderCount} orders, ${poCount} purchase orders, ${skippedLines} lines skipped for stock.`);
const led = await get("/collections/inventory_transactions/records?perPage=1");
console.log(`Ledger entries: ${led.totalItems}`);
