/// Northwind schema — all collections per docs/04-data-dictionary.md
/// PocketBase v0.39.x JS migration.
migrate((app) => {
  const AUTH_RULE = "@request.auth.id != ''";
  const ROLE = (roles) => roles.map((r) => `@request.auth.role = '${r}'`).join(" || ");
  const WRITE_SALES = `(${ROLE(["sales", "manager", "admin"])})`;
  const WRITE_PURCH = `(${ROLE(["purchasing", "manager", "admin"])})`;
  const WRITE_WH = `(${ROLE(["warehouse", "manager", "admin"])})`;
  const WRITE_MASTER = `(${ROLE(["sales", "purchasing", "manager", "admin"])})`;
  const ADMIN_ONLY = `(${ROLE(["admin"])})`;
  const MGR_ADMIN = `(${ROLE(["manager", "admin"])})`;

  // ---------- employees (auth collection) ----------
  const employees = new Collection({
    type: "auth",
    name: "employees",
    listRule: AUTH_RULE,
    viewRule: AUTH_RULE,
    createRule: ADMIN_ONLY,
    updateRule: `${ADMIN_ONLY} || id = @request.auth.id`,
    deleteRule: ADMIN_ONLY,
    fields: [
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      { type: "text", name: "username", required: true, min: 2, max: 60 },
      { type: "text", name: "first_name", required: true, max: 100 },
      { type: "text", name: "last_name", required: true, max: 100 },
      { type: "text", name: "job_title", max: 120 },
      { type: "text", name: "phone", max: 40 },
      {
        type: "select",
        name: "role",
        required: true,
        maxSelect: 1,
        values: ["sales", "purchasing", "warehouse", "manager", "admin"],
      },
      { type: "bool", name: "active" },
      { type: "select", name: "language", maxSelect: 1, values: ["en", "th", "ja"] },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_employees_username ON employees (username)"],
    passwordAuth: { enabled: true, identityFields: ["email", "username"] },
  });
  app.save(employees);

  // ---------- companies ----------
  const companies = new Collection({
    type: "base",
    name: "companies",
    listRule: AUTH_RULE,
    viewRule: AUTH_RULE,
    createRule: WRITE_MASTER,
    updateRule: WRITE_MASTER,
    deleteRule: MGR_ADMIN,
    fields: [
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      { type: "text", name: "company_name", required: true, max: 200 },
      {
        type: "select",
        name: "company_type",
        required: true,
        maxSelect: 3,
        values: ["customer", "supplier", "shipper"],
      },
      { type: "text", name: "contact_name", max: 150 },
      { type: "text", name: "contact_title", max: 120 },
      { type: "email", name: "email" },
      { type: "text", name: "phone", max: 40 },
      { type: "text", name: "address", max: 300 },
      { type: "text", name: "city", max: 100 },
      { type: "text", name: "state_province", max: 100 },
      { type: "text", name: "postal_code", max: 20 },
      { type: "text", name: "country", max: 100 },
      { type: "text", name: "tax_id", max: 60 },
      { type: "url", name: "website" },
      { type: "text", name: "notes", max: 2000 },
    ],
    indexes: ["CREATE INDEX idx_companies_name ON companies (company_name)"],
  });
  app.save(companies);

  // ---------- product_categories ----------
  const categories = new Collection({
    type: "base",
    name: "product_categories",
    listRule: AUTH_RULE,
    viewRule: AUTH_RULE,
    createRule: MGR_ADMIN,
    updateRule: MGR_ADMIN,
    deleteRule: ADMIN_ONLY,
    fields: [
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      { type: "text", name: "category_name", required: true, max: 120 },
      { type: "text", name: "description", max: 1000 },
      { type: "file", name: "image", maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_categories_name ON product_categories (category_name)"],
  });
  app.save(categories);

  // ---------- products ----------
  const products = new Collection({
    type: "base",
    name: "products",
    listRule: AUTH_RULE,
    viewRule: AUTH_RULE,
    createRule: WRITE_PURCH,
    updateRule: WRITE_PURCH,
    deleteRule: ADMIN_ONLY,
    fields: [
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      { type: "text", name: "product_code", required: true, max: 40 },
      { type: "text", name: "product_name", required: true, max: 200 },
      { type: "text", name: "description", max: 2000 },
      { type: "relation", name: "category", required: true, maxSelect: 1, collectionId: categories.id },
      { type: "relation", name: "supplier", maxSelect: 1, collectionId: companies.id },
      { type: "number", name: "list_price", required: true, min: 0 },
      { type: "number", name: "standard_cost", min: 0 },
      { type: "number", name: "reorder_level", onlyInt: true, min: 0 },
      { type: "number", name: "target_level", onlyInt: true, min: 0 },
      { type: "text", name: "quantity_per_unit", max: 100 },
      { type: "bool", name: "discontinued" },
      { type: "file", name: "image", maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_products_code ON products (product_code)"],
  });
  app.save(products);

  // ---------- orders ----------
  const orders = new Collection({
    type: "base",
    name: "orders",
    listRule: AUTH_RULE,
    viewRule: AUTH_RULE,
    createRule: WRITE_SALES,
    updateRule: WRITE_SALES,
    deleteRule: WRITE_SALES,
    fields: [
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      { type: "text", name: "order_number", required: true, max: 30 },
      { type: "relation", name: "customer", required: true, maxSelect: 1, collectionId: companies.id },
      { type: "relation", name: "employee", required: true, maxSelect: 1, collectionId: employees.id },
      { type: "relation", name: "shipper", maxSelect: 1, collectionId: companies.id },
      { type: "date", name: "order_date", required: true },
      { type: "date", name: "invoice_date" },
      { type: "date", name: "shipped_date" },
      { type: "date", name: "paid_date" },
      {
        type: "select",
        name: "status",
        required: true,
        maxSelect: 1,
        values: ["new", "invoiced", "shipped", "closed", "cancelled"],
      },
      { type: "text", name: "ship_name", max: 200 },
      { type: "text", name: "ship_address", max: 300 },
      { type: "text", name: "ship_city", max: 100 },
      { type: "text", name: "ship_postal_code", max: 20 },
      { type: "text", name: "ship_country", max: 100 },
      { type: "number", name: "shipping_fee", min: 0 },
      { type: "number", name: "taxes", min: 0 },
      { type: "select", name: "payment_method", maxSelect: 1, values: ["cash", "check", "card", "transfer"] },
      { type: "text", name: "notes", max: 2000 },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_orders_number ON orders (order_number)"],
  });
  app.save(orders);

  // ---------- order_details ----------
  const orderDetails = new Collection({
    type: "base",
    name: "order_details",
    listRule: AUTH_RULE,
    viewRule: AUTH_RULE,
    createRule: WRITE_SALES,
    updateRule: WRITE_SALES,
    deleteRule: WRITE_SALES,
    fields: [
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      { type: "relation", name: "order", required: true, maxSelect: 1, collectionId: orders.id, cascadeDelete: true },
      { type: "relation", name: "product", required: true, maxSelect: 1, collectionId: products.id },
      { type: "number", name: "quantity", required: true, onlyInt: true, min: 1 },
      { type: "number", name: "unit_price", min: 0 },
      { type: "number", name: "discount", min: 0, max: 1 },
      {
        type: "select",
        name: "status",
        maxSelect: 1,
        values: ["none", "allocated", "invoiced", "shipped", "on_order", "no_stock"],
      },
      { type: "date", name: "date_allocated" },
    ],
    indexes: ["CREATE INDEX idx_od_order ON order_details (`order`)"],
  });
  app.save(orderDetails);

  // ---------- purchase_orders ----------
  const purchaseOrders = new Collection({
    type: "base",
    name: "purchase_orders",
    listRule: AUTH_RULE,
    viewRule: AUTH_RULE,
    createRule: WRITE_PURCH,
    updateRule: `${WRITE_PURCH} || ${WRITE_WH}`,
    deleteRule: WRITE_PURCH,
    fields: [
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      { type: "text", name: "po_number", required: true, max: 30 },
      { type: "relation", name: "supplier", required: true, maxSelect: 1, collectionId: companies.id },
      { type: "relation", name: "created_by", required: true, maxSelect: 1, collectionId: employees.id },
      { type: "date", name: "submitted_date" },
      { type: "relation", name: "approved_by", maxSelect: 1, collectionId: employees.id },
      { type: "date", name: "approved_date" },
      {
        type: "select",
        name: "status",
        required: true,
        maxSelect: 1,
        values: ["new", "submitted", "approved", "closed", "cancelled"],
      },
      { type: "date", name: "expected_date" },
      { type: "number", name: "shipping_fee", min: 0 },
      { type: "number", name: "taxes", min: 0 },
      { type: "number", name: "payment_amount", min: 0 },
      { type: "date", name: "payment_date" },
      { type: "select", name: "payment_method", maxSelect: 1, values: ["cash", "check", "card", "transfer"] },
      { type: "text", name: "notes", max: 2000 },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_po_number ON purchase_orders (po_number)"],
  });
  app.save(purchaseOrders);

  // ---------- purchase_order_details ----------
  const poDetails = new Collection({
    type: "base",
    name: "purchase_order_details",
    listRule: AUTH_RULE,
    viewRule: AUTH_RULE,
    createRule: WRITE_PURCH,
    updateRule: `${WRITE_PURCH} || ${WRITE_WH}`,
    deleteRule: WRITE_PURCH,
    fields: [
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      { type: "relation", name: "purchase_order", required: true, maxSelect: 1, collectionId: purchaseOrders.id, cascadeDelete: true },
      { type: "relation", name: "product", required: true, maxSelect: 1, collectionId: products.id },
      { type: "number", name: "quantity", required: true, onlyInt: true, min: 1 },
      { type: "number", name: "unit_cost", required: true, min: 0 },
      { type: "date", name: "date_received" },
      { type: "bool", name: "posted_to_inventory" },
    ],
    indexes: ["CREATE INDEX idx_pod_po ON purchase_order_details (purchase_order)"],
  });
  app.save(poDetails);

  // ---------- inventory_transactions ----------
  const invTx = new Collection({
    type: "base",
    name: "inventory_transactions",
    listRule: AUTH_RULE,
    viewRule: AUTH_RULE,
    createRule: WRITE_WH, // manual adjustments; system entries are written by hooks (bypass rules)
    updateRule: null, // immutable ledger via API
    deleteRule: null,
    fields: [
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      {
        type: "select",
        name: "transaction_type",
        required: true,
        maxSelect: 1,
        values: ["purchased", "sold", "on_hold", "waiting"],
      },
      { type: "date", name: "transaction_date", required: true },
      { type: "relation", name: "product", required: true, maxSelect: 1, collectionId: products.id },
      { type: "number", name: "quantity", required: true, onlyInt: true, min: 1 },
      { type: "relation", name: "related_order", maxSelect: 1, collectionId: orders.id },
      { type: "relation", name: "related_purchase_order", maxSelect: 1, collectionId: purchaseOrders.id },
      { type: "relation", name: "related_order_detail", maxSelect: 1, collectionId: orderDetails.id },
      { type: "text", name: "comments", max: 1000 },
    ],
    indexes: ["CREATE INDEX idx_tx_product ON inventory_transactions (product)"],
  });
  app.save(invTx);
}, (app) => {
  const names = [
    "inventory_transactions",
    "purchase_order_details",
    "purchase_orders",
    "order_details",
    "orders",
    "products",
    "product_categories",
    "companies",
    "employees",
  ];
  for (const n of names) {
    try {
      app.delete(app.findCollectionByNameOrId(n));
    } catch {}
  }
});
