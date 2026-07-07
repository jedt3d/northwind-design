// Pure business/display helpers — no imports, fully unit-testable.

/** Total for one order/PO line: qty * price * (1 - discount). */
export function lineTotal(line) {
  if (!line) return 0;
  const qty = Number(line.quantity) || 0;
  const price = Number(line.unit_price != null ? line.unit_price : line.unit_cost) || 0;
  const discount = Number(line.discount) || 0;
  return qty * price * (1 - discount);
}

/** Order totals: subtotal = Σ qty*price*(1-discount); total = subtotal + fee + taxes. */
export function orderTotals(lines, shippingFee = 0, taxes = 0) {
  const subtotal = (lines || []).reduce((s, l) => s + lineTotal(l), 0);
  const fee = Number(shippingFee) || 0;
  const tax = Number(taxes) || 0;
  return { subtotal, shippingFee: fee, taxes: tax, total: subtotal + fee + tax };
}

/** Derive stock numbers from raw inventory_transactions rows. */
export function stockFromTransactions(txs) {
  let purchased = 0;
  let sold = 0;
  let onHold = 0;
  for (const t of txs || []) {
    const q = Number(t.quantity) || 0;
    if (t.transaction_type === 'purchased') purchased += q;
    else if (t.transaction_type === 'sold') sold += q;
    else if (t.transaction_type === 'on_hold') onHold += q;
  }
  const onHand = purchased - sold;
  return { onHand, onHold, available: onHand - onHold };
}

/** Suggested reorder quantity: bring available back up to target_level. */
export function suggestedReorderQty(product, available) {
  const target = Number(product && product.target_level) || 0;
  const avail = Number(available) || 0;
  return Math.max(0, target - avail);
}

export const ORDER_TRANSITIONS = {
  new: ['invoiced', 'cancelled'],
  invoiced: ['shipped', 'cancelled'],
  shipped: ['closed'],
  closed: [],
  cancelled: [],
};

export const PO_TRANSITIONS = {
  new: ['submitted', 'cancelled'],
  submitted: ['approved', 'cancelled'],
  approved: ['closed', 'cancelled'],
  closed: [],
  cancelled: [],
};

/** canTransition('order'|'po', from, to) — mirrors the server-side state machines. */
export function canTransition(kind, from, to) {
  const map = kind === 'po' ? PO_TRANSITIONS : ORDER_TRANSITIONS;
  return (map[from] || []).includes(to);
}

/**
 * Which status action buttons an order detail page shows, and whether each is enabled.
 * Returns [{key, enabled, reason}] — reason is an i18n key explaining a disabled button.
 * Visibility only; the server enforces the real rules.
 */
export function visibleOrderActions(order, lines, role) {
  const actions = [];
  if (!order || !['sales', 'manager', 'admin'].includes(role)) return actions;
  const ls = lines || [];
  switch (order.status) {
    case 'new': {
      const hasLines = ls.length > 0;
      const allAllocated = hasLines && ls.every((l) => l.status === 'allocated');
      actions.push({
        key: 'invoice',
        enabled: allAllocated,
        reason: !hasLines ? 'orders.err_no_lines' : !allAllocated ? 'orders.err_not_allocated' : null,
      });
      actions.push({ key: 'cancel', enabled: true, reason: null });
      break;
    }
    case 'invoiced':
      actions.push({ key: 'ship', enabled: true, reason: null });
      actions.push({ key: 'cancel', enabled: true, reason: null });
      break;
    case 'shipped':
      actions.push({ key: 'close', enabled: true, reason: null });
      break;
    default:
      break;
  }
  return actions;
}

/** Same idea for purchase orders. Approve is manager/admin only. */
export function visiblePoActions(po, lines, role) {
  const actions = [];
  if (!po) return actions;
  const purch = ['purchasing', 'manager', 'admin'].includes(role);
  const mgr = ['manager', 'admin'].includes(role);
  const ls = lines || [];
  const hasLines = ls.length > 0;
  const allPosted = hasLines && ls.every((l) => l.posted_to_inventory);
  const anyPosted = ls.some((l) => l.posted_to_inventory);
  switch (po.status) {
    case 'new':
      if (purch) {
        actions.push({ key: 'submit', enabled: hasLines, reason: hasLines ? null : 'po.err_no_lines' });
        actions.push({ key: 'cancel', enabled: true, reason: null });
      }
      break;
    case 'submitted':
      if (mgr) actions.push({ key: 'approve', enabled: true, reason: null });
      if (purch) actions.push({ key: 'cancel', enabled: true, reason: null });
      break;
    case 'approved':
      if (purch) {
        actions.push({ key: 'close', enabled: allPosted, reason: allPosted ? null : 'po.err_not_received' });
        actions.push({ key: 'cancel', enabled: !anyPosted, reason: anyPosted ? 'po.err_received_no_cancel' : null });
      }
      break;
    default:
      break;
  }
  return actions;
}

/** Can this PO line show a Receive button for this user? */
export function canReceive(po, line, role) {
  return (
    !!po &&
    po.status === 'approved' &&
    !!line &&
    !line.posted_to_inventory &&
    ['warehouse', 'purchasing', 'manager', 'admin'].includes(role)
  );
}

function localeTag(locale) {
  if (locale === 'th') return 'th-TH';
  if (locale === 'ja') return 'ja-JP';
  return 'en-US';
}

/** Money: always 2 decimals, locale digit grouping. */
export function formatMoney(value, locale = 'en') {
  const n = Number(value);
  return new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

/** Dates via Intl.DateTimeFormat. Accepts PB "YYYY-MM-DD hh:mm:ss.sssZ" strings. */
export function formatDate(value, locale = 'en', style = 'short') {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const opts =
    style === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat(localeTag(locale), opts).format(d);
}

/** 'YYYY-MM' bucket for report grouping. */
export function monthKey(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Date -> PB datetime string "YYYY-MM-DD 00:00:00". */
export function pbDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.toISOString().slice(0, 10)} 00:00:00`;
}
