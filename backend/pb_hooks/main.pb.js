/// Northwind business rules — PocketBase v0.39 JS hooks.
/// Helpers live in utils.js (required inside each handler VM).

// ---------------------------------------------------------------- orders

onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  if (!e.record.get("order_number")) {
    e.record.set("order_number", u.seqNumber(e.app, "orders", "order_number", "SO-"));
  }
  if (!e.record.get("status")) e.record.set("status", "new");
  if (e.record.get("status") !== "new") {
    throw new BadRequestError("New orders must start in status 'new'.");
  }
  if (!u.hasDate(e.record.get("order_date"))) e.record.set("order_date", u.nowStr());
  e.next();
}, "orders");

onRecordUpdateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const oldRec = e.record.original();
  const oldStatus = oldRec.get("status");
  const newStatus = e.record.get("status");

  if (["closed", "cancelled"].includes(oldStatus)) {
    throw new BadRequestError("Closed or cancelled orders are read-only.");
  }

  if (newStatus !== oldStatus) {
    const transitions = {
      new: ["invoiced", "cancelled"],
      invoiced: ["shipped", "cancelled"],
      shipped: ["closed"],
    };
    if (!(transitions[oldStatus] || []).includes(newStatus)) {
      throw new BadRequestError(`Illegal status transition ${oldStatus} → ${newStatus}.`);
    }

    if (newStatus === "invoiced") {
      const lines = e.app.findRecordsByFilter("order_details", "order = {:o}", "", 500, 0, { o: e.record.id });
      if (lines.length === 0) throw new BadRequestError("Cannot invoice an order without line items.");
      for (const l of lines) {
        if (l.get("status") !== "allocated") {
          throw new BadRequestError("Cannot invoice: every line must be Allocated (BR-O2).");
        }
      }
      if (!u.hasDate(e.record.get("invoice_date"))) e.record.set("invoice_date", u.nowStr());
    }

    if (newStatus === "shipped") {
      if (!e.record.get("shipper")) throw new BadRequestError("Shipping requires a shipper (BR-O3).");
      if (e.record.get("shipping_fee") === null || e.record.get("shipping_fee") === undefined) {
        e.record.set("shipping_fee", 0);
      }
      if (!u.hasDate(e.record.get("shipped_date"))) e.record.set("shipped_date", u.nowStr());
    }
  } else if (oldStatus !== "new" && oldStatus !== "invoiced") {
    throw new BadRequestError("Shipped orders are read-only except for closing.");
  }

  // BR-O7 date ordering
  if (!u.dateOk(e.record.get("order_date"), e.record.get("invoice_date")) ||
      !u.dateOk(e.record.get("invoice_date"), e.record.get("shipped_date"))) {
    throw new BadRequestError("Dates must satisfy order ≤ invoice ≤ shipped (BR-O7).");
  }

  e.next();

  // post-transition side effects
  if (newStatus !== oldStatus) {
    const lines = e.app.findRecordsByFilter("order_details", "order = {:o}", "", 500, 0, { o: e.record.id });
    if (newStatus === "invoiced") {
      for (const l of lines) {
        const txs = e.app.findRecordsByFilter(
          "inventory_transactions",
          "related_order_detail = {:d} && transaction_type = 'on_hold'",
          "",
          10,
          0,
          { d: l.id }
        );
        for (const tx of txs) {
          tx.set("transaction_type", "sold");
          tx.set("comments", "sold at invoice");
          e.app.save(tx);
        }
        l.set("status", "invoiced");
        e.app.save(l);
      }
    }
    if (newStatus === "shipped") {
      for (const l of lines) {
        l.set("status", "shipped");
        e.app.save(l);
      }
    }
    if (newStatus === "cancelled") {
      for (const l of lines) {
        u.deleteHoldTxForDetail(e.app, l.id);
        l.set("status", "none");
        l.set("date_allocated", "");
        e.app.save(l);
      }
    }
  }
}, "orders");

onRecordDeleteRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const status = e.record.get("status");
  u.requireStatus(status, ["new", "invoiced", "cancelled"], "Shipped orders cannot be deleted (BR-O5).");
  const txs = e.app.findRecordsByFilter("inventory_transactions", "related_order = {:o}", "", 500, 0, {
    o: e.record.id,
  });
  for (const tx of txs) e.app.delete(tx);
  e.next();
}, "orders");

// ---------------------------------------------------------------- order details

onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const order = e.app.findRecordById("orders", e.record.get("order"));
  u.requireStatus(order.get("status"), ["new"], "Line items can only be added while the order is New (BR-O4).");

  const product = e.app.findRecordById("products", e.record.get("product"));
  if (product.get("discontinued")) {
    throw new BadRequestError("Discontinued products cannot be ordered (BR-O8).");
  }
  if (!e.record.get("unit_price")) {
    e.record.set("unit_price", product.get("list_price")); // BR-O6 price snapshot
  }
  if (!e.record.get("discount")) e.record.set("discount", 0);
  e.record.set("status", "none");
  e.next();
  u.classifyAndHold(e.app, e.record);
}, "order_details");

onRecordUpdateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const order = e.app.findRecordById("orders", e.record.get("order"));
  u.requireStatus(order.get("status"), ["new"], "Line items are locked once the order leaves New (BR-O4).");
  const oldRec = e.record.original();
  const changed =
    oldRec.get("product") !== e.record.get("product") || oldRec.get("quantity") !== e.record.get("quantity");
  if (changed) {
    const product = e.app.findRecordById("products", e.record.get("product"));
    if (product.get("discontinued")) throw new BadRequestError("Discontinued products cannot be ordered (BR-O8).");
    u.deleteHoldTxForDetail(e.app, e.record.id);
  }
  e.next();
  if (changed) u.classifyAndHold(e.app, e.record);
}, "order_details");

onRecordDeleteRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const order = e.app.findRecordById("orders", e.record.get("order"));
  u.requireStatus(order.get("status"), ["new"], "Line items are locked once the order leaves New (BR-O4).");
  u.deleteHoldTxForDetail(e.app, e.record.id);
  e.next();
}, "order_details");

// ---------------------------------------------------------------- purchase orders

onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  if (!e.record.get("po_number")) {
    e.record.set("po_number", u.seqNumber(e.app, "purchase_orders", "po_number", "PO-"));
  }
  if (!e.record.get("status")) e.record.set("status", "new");
  if (e.record.get("status") !== "new") throw new BadRequestError("New purchase orders must start in status 'new'.");
  const supplier = e.app.findRecordById("companies", e.record.get("supplier"));
  if (!supplier.get("company_type").includes("supplier")) {
    throw new BadRequestError("Purchase orders require a company of type supplier.");
  }
  e.next();
}, "purchase_orders");

onRecordUpdateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const oldRec = e.record.original();
  const oldStatus = oldRec.get("status");
  const newStatus = e.record.get("status");

  if (["closed", "cancelled"].includes(oldStatus)) {
    throw new BadRequestError("Closed or cancelled purchase orders are read-only.");
  }

  if (newStatus !== oldStatus) {
    const transitions = {
      new: ["submitted", "cancelled"],
      submitted: ["approved", "cancelled"],
      approved: ["closed", "cancelled"],
    };
    if (!(transitions[oldStatus] || []).includes(newStatus)) {
      throw new BadRequestError(`Illegal PO status transition ${oldStatus} → ${newStatus}.`);
    }

    if (newStatus === "submitted" && !u.hasDate(e.record.get("submitted_date"))) {
      e.record.set("submitted_date", u.nowStr());
    }

    if (newStatus === "approved") {
      if (!["manager", "admin"].includes(u.roleOf(e))) {
        throw new BadRequestError("Only managers or admins may approve purchase orders (BR-P2).");
      }
      e.record.set("approved_by", e.auth.id);
      e.record.set("approved_date", u.nowStr());
    }

    if (newStatus === "closed") {
      const lines = e.app.findRecordsByFilter("purchase_order_details", "purchase_order = {:p}", "", 500, 0, {
        p: e.record.id,
      });
      for (const l of lines) {
        if (!l.get("posted_to_inventory")) {
          throw new BadRequestError("Cannot close: all lines must be received first.");
        }
      }
    }

    if (newStatus === "cancelled") {
      const posted = e.app.findRecordsByFilter(
        "purchase_order_details",
        "purchase_order = {:p} && posted_to_inventory = true",
        "",
        1,
        0,
        { p: e.record.id }
      );
      if (posted.length > 0) throw new BadRequestError("Cannot cancel a PO that already received stock.");
    }
  }

  e.next();
}, "purchase_orders");

onRecordDeleteRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  u.requireStatus(e.record.get("status"), ["new", "cancelled"], "Only draft or cancelled POs can be deleted.");
  e.next();
}, "purchase_orders");

// ---------------------------------------------------------------- purchase order details

onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const po = e.app.findRecordById("purchase_orders", e.record.get("purchase_order"));
  u.requireStatus(po.get("status"), ["new"], "PO lines can only be added while the PO is a draft.");
  e.record.set("posted_to_inventory", false);
  if (!e.record.get("unit_cost")) {
    const product = e.app.findRecordById("products", e.record.get("product"));
    e.record.set("unit_cost", product.get("standard_cost") || 0);
  }
  e.next();
}, "purchase_order_details");

onRecordUpdateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const po = e.app.findRecordById("purchase_orders", e.record.get("purchase_order"));
  const oldRec = e.record.original();
  const receivingNow = !oldRec.get("posted_to_inventory") && u.hasDate(e.record.get("date_received"));

  if (receivingNow) {
    u.requireStatus(po.get("status"), ["approved"], "Stock can only be received on an approved PO (BR-P3).");
    e.record.set("posted_to_inventory", true);
    e.next();
    u.makeTx(e.app, {
      type: "purchased",
      product: e.record.get("product"),
      quantity: e.record.get("quantity"),
      po: po.id,
      comments: "PO receipt " + po.get("po_number"),
    });
    u.reallocateWaitingLines(e.app, e.record.get("product"));
    return;
  }

  u.requireStatus(po.get("status"), ["new"], "PO lines are locked once the PO is submitted.");
  e.next();
}, "purchase_order_details");

onRecordDeleteRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const po = e.app.findRecordById("purchase_orders", e.record.get("purchase_order"));
  u.requireStatus(po.get("status"), ["new"], "PO lines are locked once the PO is submitted.");
  e.next();
}, "purchase_order_details");

// ---------------------------------------------------------------- inventory (manual adjustments)

onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const type = e.record.get("transaction_type");
  if (!["purchased", "sold"].includes(type)) {
    throw new BadRequestError("Manual entries must be adjustments of type 'purchased' (in) or 'sold' (out).");
  }
  if (!e.record.get("comments")) {
    throw new BadRequestError("Manual adjustments require a comment (BR-I4).");
  }
  if (!u.hasDate(e.record.get("transaction_date"))) e.record.set("transaction_date", u.nowStr());
  if (type === "sold") {
    const stock = u.stockOf(e.app, e.record.get("product"));
    if (stock.available < e.record.get("quantity")) {
      throw new BadRequestError("Adjustment rejected: stock cannot go negative (BR-I1).");
    }
  }
  e.next();
}, "inventory_transactions");

// ---------------------------------------------------------------- referential guards

onRecordUpdateRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const oldTypes = e.record.original().get("company_type") || [];
  const newTypes = e.record.get("company_type") || [];
  const removed = oldTypes.filter((t) => !newTypes.includes(t));
  for (const t of removed) {
    let inUse = false;
    if (t === "customer") {
      inUse = e.app.findRecordsByFilter("orders", "customer = {:c}", "", 1, 0, { c: e.record.id }).length > 0;
    } else if (t === "shipper") {
      inUse = e.app.findRecordsByFilter("orders", "shipper = {:c}", "", 1, 0, { c: e.record.id }).length > 0;
    } else if (t === "supplier") {
      inUse =
        e.app.findRecordsByFilter("purchase_orders", "supplier = {:c}", "", 1, 0, { c: e.record.id }).length > 0 ||
        e.app.findRecordsByFilter("products", "supplier = {:c}", "", 1, 0, { c: e.record.id }).length > 0;
    }
    if (inUse) throw new BadRequestError(`Type '${t}' is in use and cannot be removed (BR-C1).`);
  }
  e.next();
}, "companies");

onRecordDeleteRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const id = e.record.id;
  const hasOrders = e.app.findRecordsByFilter("orders", "customer = {:c} || shipper = {:c}", "", 1, 0, { c: id });
  const hasPOs = e.app.findRecordsByFilter("purchase_orders", "supplier = {:c}", "", 1, 0, { c: id });
  const hasProducts = e.app.findRecordsByFilter("products", "supplier = {:c}", "", 1, 0, { c: id });
  if (hasOrders.length || hasPOs.length || hasProducts.length) {
    throw new BadRequestError("Company is referenced by documents and cannot be deleted (BR-C2).");
  }
  e.next();
}, "companies");

onRecordDeleteRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const id = e.record.id;
  const refs =
    e.app.findRecordsByFilter("orders", "employee = {:x}", "", 1, 0, { x: id }).length +
    e.app.findRecordsByFilter("purchase_orders", "created_by = {:x} || approved_by = {:x}", "", 1, 0, { x: id })
      .length;
  if (refs > 0) {
    throw new BadRequestError("Employee has documents — deactivate instead of deleting (BR-E1).");
  }
  e.next();
}, "employees");

onRecordDeleteRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  const id = e.record.id;
  const refs =
    e.app.findRecordsByFilter("order_details", "product = {:x}", "", 1, 0, { x: id }).length +
    e.app.findRecordsByFilter("purchase_order_details", "product = {:x}", "", 1, 0, { x: id }).length +
    e.app.findRecordsByFilter("inventory_transactions", "product = {:x}", "", 1, 0, { x: id }).length;
  if (refs > 0) {
    throw new BadRequestError("Product has movement history — mark it discontinued instead of deleting.");
  }
  e.next();
}, "products");

// block login for deactivated employees
onRecordAuthRequest((e) => {
  const u = require(`${__hooks}/utils.js`);
  if (e.record.collection().name === "employees" && !e.record.get("active")) {
    throw new BadRequestError("This account is deactivated.");
  }
  e.next();
});
