// Pure analytics helpers — take already-fetched (expanded) records, return sorted arrays.
// No fetching in here; Dashboard.jsx / CompaniesList.jsx do the fetching.
import { monthKey } from './calc';

/** Order statuses that count as an actual sale. */
export const SOLD_STATUSES = ['invoiced', 'shipped', 'closed'];
/** PO statuses that count as committed spend. */
export const SPEND_STATUSES = ['approved', 'closed'];

/** Revenue of one order line: qty × unit_price × (1 − discount). */
export function soldLineRevenue(line) {
  if (!line) return 0;
  const qty = Number(line.quantity) || 0;
  const price = Number(line.unit_price) || 0;
  const discount = Number(line.discount) || 0;
  return qty * price * (1 - discount);
}

/** Cost of one PO line: qty × unit_cost. */
export function poLineCost(line) {
  if (!line) return 0;
  return (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0);
}

function isSoldLine(line) {
  const status = line?.expand?.order?.status;
  return SOLD_STATUSES.includes(status);
}

function isSpendLine(line) {
  const status = line?.expand?.purchase_order?.status;
  return SPEND_STATUSES.includes(status);
}

function topN(map, n) {
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue || String(a.name).localeCompare(String(b.name)))
    .slice(0, n);
}

/**
 * Top-N products by revenue over order_details whose parent order was sold.
 * lines need expand 'order' and 'product'. → [{id, name, qty, revenue}]
 */
export function topProductsByRevenue(lines, n = 10) {
  const byProduct = {};
  for (const l of lines || []) {
    if (!isSoldLine(l)) continue;
    const id = l.product || 'unknown';
    const cur = (byProduct[id] ||= { id, name: l.expand?.product?.product_name || '—', qty: 0, revenue: 0 });
    cur.qty += Number(l.quantity) || 0;
    cur.revenue += soldLineRevenue(l);
  }
  return topN(byProduct, n);
}

/**
 * Same rows grouped by the product's category.
 * lines need expand 'order' and 'product.category'. → [{id, name, qty, revenue}]
 */
export function topCategoriesByRevenue(lines, n = 10) {
  const byCat = {};
  for (const l of lines || []) {
    if (!isSoldLine(l)) continue;
    const cat = l.expand?.product?.expand?.category;
    const id = cat?.id || 'unknown';
    const cur = (byCat[id] ||= { id, name: cat?.category_name || '—', qty: 0, revenue: 0 });
    cur.qty += Number(l.quantity) || 0;
    cur.revenue += soldLineRevenue(l);
  }
  return topN(byCat, n);
}

/**
 * Top-N buying customers by revenue (sold statuses only).
 * lines need expand 'order.customer'. → [{id, name, revenue}]
 */
export function topCustomers(lines, n = 5) {
  const byCustomer = {};
  for (const l of lines || []) {
    if (!isSoldLine(l)) continue;
    const order = l.expand?.order;
    const id = order?.customer || 'unknown';
    const cur = (byCustomer[id] ||= {
      id,
      name: order?.expand?.customer?.company_name || '—',
      revenue: 0,
    });
    cur.revenue += soldLineRevenue(l);
  }
  return topN(byCustomer, n);
}

/**
 * Top-N suppliers by our spend (approved/closed POs).
 * poLines need expand 'purchase_order.supplier'. → [{id, name, spend}]
 */
export function topSuppliers(poLines, n = 5) {
  const bySupplier = {};
  for (const l of poLines || []) {
    if (!isSpendLine(l)) continue;
    const po = l.expand?.purchase_order;
    const id = po?.supplier || 'unknown';
    const cur = (bySupplier[id] ||= {
      id,
      name: po?.expand?.supplier?.company_name || '—',
      spend: 0,
    });
    cur.spend += poLineCost(l);
  }
  return Object.values(bySupplier)
    .sort((a, b) => b.spend - a.spend || String(a.name).localeCompare(String(b.name)))
    .slice(0, n);
}

/**
 * Per-category on-hand quantity and inventory cost.
 * products need expand 'category'; txByProduct = { [productId]: inventory_transactions[] }.
 * On-hand per product = Σpurchased − Σsold; value = onHand × standard_cost.
 * → [{id, category, qty, value}] sorted by value desc.
 */
export function categoryInventory(products, txByProduct) {
  const byCat = {};
  for (const p of products || []) {
    let purchased = 0;
    let sold = 0;
    for (const tx of (txByProduct && txByProduct[p.id]) || []) {
      const q = Number(tx.quantity) || 0;
      if (tx.transaction_type === 'purchased') purchased += q;
      else if (tx.transaction_type === 'sold') sold += q;
    }
    const onHand = purchased - sold;
    const cat = p.expand?.category;
    const id = cat?.id || p.category || 'unknown';
    const cur = (byCat[id] ||= { id, category: cat?.category_name || '—', qty: 0, value: 0 });
    cur.qty += onHand;
    cur.value += onHand * (Number(p.standard_cost) || 0);
  }
  return Object.values(byCat).sort(
    (a, b) => b.value - a.value || b.qty - a.qty || String(a.category).localeCompare(String(b.category))
  );
}

/**
 * Monthly counts + values for orders (by order_date, falling back to created)
 * and purchase orders (by created), over the last `months` calendar months
 * ending at the most recent month present in the data. Months before the
 * earliest data month are trimmed, so sparse data yields fewer rows.
 * → [{month, orders, pos, orderValue, poValue}] ascending by month.
 */
export function monthlyOrderPoSeries(orders, pos, orderRevenueByOrderId = {}, poCostByPoId = {}, months = 6) {
  const buckets = {};
  const ensure = (m) => (buckets[m] ||= { month: m, orders: 0, pos: 0, orderValue: 0, poValue: 0 });
  for (const o of orders || []) {
    const m = monthKey(o.order_date || o.created);
    if (!m) continue;
    const b = ensure(m);
    b.orders += 1;
    b.orderValue += Number(orderRevenueByOrderId[o.id]) || 0;
  }
  for (const p of pos || []) {
    const m = monthKey(p.created || p.submitted_date);
    if (!m) continue;
    const b = ensure(m);
    b.pos += 1;
    b.poValue += Number(poCostByPoId[p.id]) || 0;
  }
  const keys = Object.keys(buckets).sort();
  if (keys.length === 0) return [];
  const [y, mo] = keys[keys.length - 1].split('-').map(Number);
  const out = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(y, mo - 1 - i, 1));
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    out.unshift(buckets[k] || { month: k, orders: 0, pos: 0, orderValue: 0, poValue: 0 });
  }
  return out.filter((r) => r.month >= keys[0]);
}

/**
 * Lifetime traded value per company:
 *   sales = revenue from orders where the company is the customer (sold statuses)
 *   spend = our cost on POs where the company is the supplier (approved/closed)
 * orderLines need expand 'order'; poLines need expand 'purchase_order'.
 * → Map(companyId → {sales, spend, total})
 */
export function lifetimeTotals(orderLines, poLines) {
  const map = new Map();
  const entry = (id) => {
    if (!map.has(id)) map.set(id, { sales: 0, spend: 0, total: 0 });
    return map.get(id);
  };
  for (const l of orderLines || []) {
    if (!isSoldLine(l)) continue;
    const customer = l.expand?.order?.customer;
    if (!customer) continue;
    const e = entry(customer);
    e.sales += soldLineRevenue(l);
  }
  for (const l of poLines || []) {
    if (!isSpendLine(l)) continue;
    const supplier = l.expand?.purchase_order?.supplier;
    if (!supplier) continue;
    const e = entry(supplier);
    e.spend += poLineCost(l);
  }
  for (const e of map.values()) e.total = e.sales + e.spend;
  return map;
}
