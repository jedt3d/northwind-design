/// Shared helpers for Northwind hooks (required inside each handler VM).


function hasDate(v) {
  if (!v) return false;
  const s = String(v);
  return s !== "" && !s.startsWith("0001-01-01");
}

function nowStr() {
  return new Date().toISOString().replace("T", " ");
}

function roleOf(e) {
  if (!e.auth) return "";
  if (e.auth.collection().name === "_superusers") return "admin";
  return e.auth.get("role") || "";
}

function sumTx(app, productId, type) {
  const result = new DynamicModel({ total: 0 });
  app
    .db()
    .newQuery(
      "SELECT COALESCE(SUM(quantity),0) AS total FROM inventory_transactions WHERE product = {:p} AND transaction_type = {:t}"
    )
    .bind({ p: productId, t: type })
    .one(result);
  return result.total;
}

function stockOf(app, productId) {
  const purchased = sumTx(app, productId, "purchased");
  const sold = sumTx(app, productId, "sold");
  const onHold = sumTx(app, productId, "on_hold");
  return {
    purchased: purchased,
    sold: sold,
    onHold: onHold,
    onHand: purchased - sold,
    available: purchased - sold - onHold,
  };
}

function onOrderQty(app, productId) {
  const result = new DynamicModel({ total: 0 });
  app
    .db()
    .newQuery(
      "SELECT COALESCE(SUM(d.quantity),0) AS total FROM purchase_order_details d " +
        "JOIN purchase_orders po ON po.id = d.purchase_order " +
        "WHERE d.product = {:p} AND po.status = 'approved' AND d.posted_to_inventory = FALSE"
    )
    .bind({ p: productId })
    .one(result);
  return result.total;
}

function makeTx(app, data) {
  const col = app.findCollectionByNameOrId("inventory_transactions");
  const rec = new Record(col);
  rec.set("transaction_type", data.type);
  rec.set("transaction_date", nowStr());
  rec.set("product", data.product);
  rec.set("quantity", data.quantity);
  if (data.order) rec.set("related_order", data.order);
  if (data.po) rec.set("related_purchase_order", data.po);
  if (data.detail) rec.set("related_order_detail", data.detail);
  if (data.comments) rec.set("comments", data.comments);
  app.save(rec);
  return rec;
}

function deleteHoldTxForDetail(app, detailId) {
  const txs = app.findRecordsByFilter(
    "inventory_transactions",
    "related_order_detail = {:d} && transaction_type = 'on_hold'",
    "-created",
    100,
    0,
    { d: detailId }
  );
  for (const tx of txs) app.delete(tx);
}

function seqNumber(app, collection, field, prefix) {
  const result = new DynamicModel({ total: 0 });
  app
    .db()
    .newQuery("SELECT COUNT(*) AS total FROM " + collection)
    .one(result);
  let n = result.total + 1;
  // ensure uniqueness even after deletions
  for (let i = 0; i < 50; i++) {
    const candidate = prefix + String(n).padStart(5, "0");
    try {
      app.findFirstRecordByData(collection, field, candidate);
      n++; // exists, try next
    } catch {
      return candidate;
    }
  }
  return prefix + Date.now();
}

/// Allocate one order line if stock allows; returns resulting status.
function classifyAndHold(app, detail) {
  const productId = detail.get("product");
  const qty = detail.get("quantity");
  const stock = stockOf(app, productId);
  if (stock.available >= qty) {
    detail.set("status", "allocated");
    detail.set("date_allocated", nowStr());
    app.save(detail);
    makeTx(app, {
      type: "on_hold",
      product: productId,
      quantity: qty,
      order: detail.get("order"),
      detail: detail.id,
      comments: "allocation",
    });
    return "allocated";
  }
  const incoming = onOrderQty(app, productId);
  const status = incoming >= qty ? "on_order" : "no_stock";
  detail.set("status", status);
  detail.set("date_allocated", "");
  app.save(detail);
  return status;
}

/// After stock arrives, satisfy waiting lines oldest-first (BR from Inventory article).
function reallocateWaitingLines(app, productId) {
  const waiting = app.findRecordsByFilter(
    "order_details",
    "product = {:p} && (status = 'no_stock' || status = 'on_order')",
    "+created",
    200,
    0,
    { p: productId }
  );
  for (const line of waiting) {
    const stock = stockOf(app, productId);
    if (stock.available >= line.get("quantity")) {
      classifyAndHold(app, line);
    }
  }
}

function requireStatus(actual, allowed, msg) {
  if (!allowed.includes(actual)) throw new BadRequestError(msg);
}

function dateOk(a, b) {
  if (!hasDate(a) || !hasDate(b)) return true;
  return new Date(String(a)).getTime() <= new Date(String(b)).getTime();
}


module.exports = { hasDate, nowStr, roleOf, sumTx, stockOf, onOrderQty, makeTx, deleteHoldTxForDetail, seqNumber, classifyAndHold, reallocateWaitingLines, requireStatus, dateOk };
