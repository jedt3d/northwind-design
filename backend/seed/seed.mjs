// Demo data seeder. Run against a fresh instance:
//   node backend/seed/seed.mjs http://127.0.0.1:8090
// Idempotent: refuses to run twice.
const BASE = process.argv[2] || "http://127.0.0.1:8090";
const API = `${BASE}/api`;
let token = "";

const H = () => ({ "Content-Type": "application/json", Authorization: token });
async function req(method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: H(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}
const post = (p, b) => req("POST", p, b);
const patch = (p, b) => req("PATCH", p, b);
const get = (p) => req("GET", p);

const login = await post("/collections/employees/auth-with-password", { identity: "admin", password: "password" });
token = login.token;
const adminId = login.record.id;

const existing = await get("/collections/companies/records?perPage=1");
if (existing.totalItems > 0) {
  console.log("Already seeded — aborting.");
  process.exit(0);
}

console.log("Seeding employees…");
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

console.log("Seeding companies…");
const companies = {};
const companyRows = [
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
];
for (const c of companyRows) {
  const rec = await post("/collections/companies/records", {
    company_name: c[0], company_type: c[1], city: c[2], country: c[3],
    phone: "+1-555-0100", email: `contact@${c[0].toLowerCase().replace(/[^a-z]+/g, "")}.example.com`,
  });
  companies[c[0]] = rec.id;
}

console.log("Seeding categories…");
const cats = {};
for (const c of [
  ["Beverages", "Soft drinks, coffees, teas, beers"],
  ["Condiments", "Sweet and savory sauces, relishes, spreads"],
  ["Confections", "Desserts, candies, and sweet breads"],
  ["Dairy Products", "Cheeses"],
  ["Grains & Cereals", "Breads, crackers, pasta, and cereal"],
  ["Meat & Poultry", "Prepared meats"],
  ["Produce", "Dried fruit and bean curd"],
  ["Seafood", "Seaweed and fish"],
]) {
  const rec = await post("/collections/product_categories/records", { category_name: c[0], description: c[1] });
  cats[c[0]] = rec.id;
}

console.log("Seeding products…");
// [code, name, category, supplier, list, cost, reorder, target]
const productRows = [
  ["NWTB-1", "Chai", "Beverages", "Exotic Liquids", 18, 13.5, 10, 40],
  ["NWTB-2", "Chang", "Beverages", "Exotic Liquids", 19, 14.25, 25, 100],
  ["NWTCO-3", "Aniseed Syrup", "Condiments", "Exotic Liquids", 10, 7.5, 10, 40],
  ["NWTCO-4", "Cajun Seasoning", "Condiments", "New Orleans Cajun Delights", 22, 16.5, 10, 40],
  ["NWTO-5", "Olive Oil", "Condiments", "New Orleans Cajun Delights", 21.35, 16.01, 10, 40],
  ["NWTJP-6", "Boysenberry Spread", "Condiments", "New Orleans Cajun Delights", 25, 18.75, 25, 100],
  ["NWTDFN-7", "Dried Pears", "Produce", "Tokyo Traders", 30, 22.5, 10, 40],
  ["NWTS-8", "Curry Sauce", "Condiments", "Tokyo Traders", 40, 30, 10, 40],
  ["NWTDFN-14", "Walnuts", "Produce", "Tokyo Traders", 23.25, 17.44, 10, 40],
  ["NWTCFV-17", "Fruit Cocktail", "Produce", "Pavlova, Ltd.", 39, 29.25, 10, 40],
  ["NWTBGM-19", "Chocolate Biscuits Mix", "Confections", "Pavlova, Ltd.", 9.2, 6.9, 5, 20],
  ["NWTJP-6b", "Marmalade", "Confections", "Pavlova, Ltd.", 81, 60.75, 10, 40],
  ["NWTBGM-21", "Scones", "Confections", "Pavlova, Ltd.", 10, 7.5, 5, 20],
  ["NWTB-34", "Sasquatch Ale", "Beverages", "Exotic Liquids", 14, 10.5, 15, 60],
  ["NWTB-43", "Coffee", "Beverages", "Tokyo Traders", 46, 34.5, 25, 100],
  ["NWTCA-48", "Chocolate", "Confections", "Pavlova, Ltd.", 12.75, 9.56, 25, 100],
  ["NWTDFN-51", "Dried Apples", "Produce", "Tokyo Traders", 53, 39.75, 10, 40],
  ["NWTG-52", "Long Grain Rice", "Grains & Cereals", "Tokyo Traders", 7, 5.25, 25, 100],
  ["NWTP-56", "Gnocchi", "Grains & Cereals", "Pavlova, Ltd.", 38, 28.5, 30, 120],
  ["NWTP-57", "Ravioli", "Grains & Cereals", "Pavlova, Ltd.", 19.5, 14.63, 20, 80],
];
const products = {};
for (const p of productRows) {
  const rec = await post("/collections/products/records", {
    product_code: p[0], product_name: p[1], category: cats[p[2]], supplier: companies[p[3]],
    list_price: p[4], standard_cost: p[5], reorder_level: p[6], target_level: p[7],
  });
  products[p[0]] = rec.id;
}

console.log("Initial stock via received POs…");
const bySupplier = {};
for (const p of productRows) (bySupplier[p[3]] ||= []).push(p);
for (const [supplier, rows] of Object.entries(bySupplier)) {
  const po = await post("/collections/purchase_orders/records", {
    supplier: companies[supplier], created_by: employees.ken, notes: "Initial stock",
  });
  const lineIds = [];
  for (const p of rows) {
    const line = await post("/collections/purchase_order_details/records", {
      purchase_order: po.id, product: products[p[0]], quantity: p[7], unit_cost: p[5],
    });
    lineIds.push(line.id);
  }
  await patch(`/collections/purchase_orders/records/${po.id}`, { status: "submitted" });
  await patch(`/collections/purchase_orders/records/${po.id}`, { status: "approved" });
  for (const id of lineIds) {
    await patch(`/collections/purchase_order_details/records/${id}`, { date_received: new Date().toISOString().replace("T", " ") });
  }
  await patch(`/collections/purchase_orders/records/${po.id}`, { status: "closed" });
}

console.log("Sample orders…");
async function makeOrder(customer, employee, lines, advanceTo, shipper) {
  const ord = await post("/collections/orders/records", { customer: companies[customer], employee: employees[employee] });
  for (const [code, qty] of lines) {
    await post("/collections/order_details/records", { order: ord.id, product: products[code], quantity: qty });
  }
  const steps = { invoiced: ["invoiced"], shipped: ["invoiced", "shipped"], closed: ["invoiced", "shipped", "closed"] }[advanceTo] || [];
  for (const s of steps) {
    const body = { status: s };
    if (s === "shipped") { body.shipper = companies[shipper || "Speedy Express"]; body.shipping_fee = 15; }
    await patch(`/collections/orders/records/${ord.id}`, body);
  }
  return ord;
}
await makeOrder("Alfreds Futterkiste", "nok", [["NWTB-1", 10], ["NWTCO-3", 5]], "closed");
await makeOrder("Around the Horn", "nok", [["NWTB-2", 20], ["NWTCA-48", 10]], "shipped", "United Package");
await makeOrder("Bangkok Gourmet Foods", "nok", [["NWTB-43", 8], ["NWTG-52", 30]], "invoiced");
await makeOrder("Osaka Fine Foods", "nok", [["NWTP-56", 12], ["NWTP-57", 6]], null);
await makeOrder("Island Trading", "nok", [["NWTBGM-19", 25]], null); // exceeds stock (20) -> no_stock line
await makeOrder("Berglunds snabbköp", "nok", [["NWTB-34", 60], ["NWTB-1", 4]], null); // 60 = all stock

console.log("Outstanding PO (submitted, awaiting approval)…");
const openPo = await post("/collections/purchase_orders/records", {
  supplier: companies["Pavlova, Ltd."], created_by: employees.ken, notes: "Restock biscuit mix",
  expected_date: new Date(Date.now() + 14 * 864e5).toISOString().replace("T", " "),
});
await post("/collections/purchase_order_details/records", {
  purchase_order: openPo.id, product: products["NWTBGM-19"], quantity: 40, unit_cost: 6.9,
});
await patch(`/collections/purchase_orders/records/${openPo.id}`, { status: "submitted" });

console.log("Stock adjustment example…");
await post("/collections/inventory_transactions/records", {
  transaction_type: "sold", product: products["NWTCA-48"], quantity: 2, comments: "Damaged in warehouse — write-off",
});

console.log("Seed complete.");
