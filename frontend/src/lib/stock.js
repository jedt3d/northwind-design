import { pb } from '../pb';
import { stockFromTransactions } from './calc';

/**
 * One batched fetch of inventory_transactions (perPage 500), grouped client-side.
 * Returns { [productId]: {onHand, onHold, available} }.
 */
export async function fetchStockMap() {
  const res = await pb.collection('inventory_transactions').getList(1, 500, { sort: '-created' });
  const byProduct = {};
  for (const tx of res.items) {
    (byProduct[tx.product] ||= []).push(tx);
  }
  const map = {};
  for (const [pid, txs] of Object.entries(byProduct)) {
    map[pid] = stockFromTransactions(txs);
  }
  return map;
}

/** Stock numbers for a single product. */
export async function fetchStockFor(productId) {
  const res = await pb.collection('inventory_transactions').getList(1, 500, {
    filter: pb.filter('product = {:p}', { p: productId }),
  });
  return stockFromTransactions(res.items);
}

/** On-order = quantity on approved PO lines not yet posted to inventory. */
export async function fetchOnOrder(productId) {
  const res = await pb.collection('purchase_order_details').getList(1, 500, {
    filter: pb.filter("product = {:p} && posted_to_inventory = false && purchase_order.status = 'approved'", {
      p: productId,
    }),
  });
  return res.items.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
}
