import { describe, it, expect } from 'vitest';
import {
  lineTotal,
  orderTotals,
  stockFromTransactions,
  suggestedReorderQty,
  canTransition,
  visibleOrderActions,
  visiblePoActions,
  canReceive,
  formatMoney,
  formatDate,
  monthKey,
} from './calc';

describe('orderTotals', () => {
  it('handles empty lines', () => {
    const t = orderTotals([], 0, 0);
    expect(t.subtotal).toBe(0);
    expect(t.total).toBe(0);
  });
  it('sums qty * price', () => {
    const t = orderTotals([
      { quantity: 2, unit_price: 10 },
      { quantity: 1, unit_price: 5 },
    ]);
    expect(t.subtotal).toBe(25);
    expect(t.total).toBe(25);
  });
  it('applies discounts per line', () => {
    const t = orderTotals([{ quantity: 10, unit_price: 10, discount: 0.25 }]);
    expect(t.subtotal).toBe(75);
  });
  it('adds shipping fee and taxes', () => {
    const t = orderTotals([{ quantity: 1, unit_price: 100 }], 15, 7);
    expect(t.total).toBe(122);
    expect(t.shippingFee).toBe(15);
    expect(t.taxes).toBe(7);
  });
  it('tolerates null/undefined inputs', () => {
    expect(orderTotals(null, undefined, undefined).total).toBe(0);
    expect(orderTotals([{ quantity: null, unit_price: null }]).subtotal).toBe(0);
  });
  it('lineTotal uses unit_cost when unit_price is absent (PO lines)', () => {
    expect(lineTotal({ quantity: 3, unit_cost: 4 })).toBe(12);
  });
});

describe('stockFromTransactions', () => {
  it('returns zeros for empty ledger', () => {
    expect(stockFromTransactions([])).toEqual({ onHand: 0, onHold: 0, available: 0 });
    expect(stockFromTransactions(null)).toEqual({ onHand: 0, onHold: 0, available: 0 });
  });
  it('onHand = purchased - sold; available = onHand - on_hold', () => {
    const txs = [
      { transaction_type: 'purchased', quantity: 100 },
      { transaction_type: 'sold', quantity: 30 },
      { transaction_type: 'on_hold', quantity: 20 },
      { transaction_type: 'waiting', quantity: 999 }, // ignored
    ];
    expect(stockFromTransactions(txs)).toEqual({ onHand: 70, onHold: 20, available: 50 });
  });
  it('can go to zero and negative availability', () => {
    const txs = [
      { transaction_type: 'purchased', quantity: 10 },
      { transaction_type: 'sold', quantity: 10 },
      { transaction_type: 'on_hold', quantity: 5 },
    ];
    expect(stockFromTransactions(txs)).toEqual({ onHand: 0, onHold: 5, available: -5 });
  });
});

describe('suggestedReorderQty', () => {
  it('brings available back to target level', () => {
    expect(suggestedReorderQty({ target_level: 100 }, 30)).toBe(70);
  });
  it('is never negative', () => {
    expect(suggestedReorderQty({ target_level: 10 }, 50)).toBe(0);
  });
  it('handles zero stock and missing product fields', () => {
    expect(suggestedReorderQty({ target_level: 40 }, 0)).toBe(40);
    expect(suggestedReorderQty({}, 0)).toBe(0);
    expect(suggestedReorderQty(null, 5)).toBe(0);
  });
});

describe('canTransition (order)', () => {
  it('allows the legal chain new→invoiced→shipped→closed', () => {
    expect(canTransition('order', 'new', 'invoiced')).toBe(true);
    expect(canTransition('order', 'invoiced', 'shipped')).toBe(true);
    expect(canTransition('order', 'shipped', 'closed')).toBe(true);
  });
  it('allows cancel only from new and invoiced', () => {
    expect(canTransition('order', 'new', 'cancelled')).toBe(true);
    expect(canTransition('order', 'invoiced', 'cancelled')).toBe(true);
    expect(canTransition('order', 'shipped', 'cancelled')).toBe(false);
    expect(canTransition('order', 'closed', 'cancelled')).toBe(false);
  });
  it('rejects illegal jumps and reversals', () => {
    expect(canTransition('order', 'new', 'shipped')).toBe(false);
    expect(canTransition('order', 'new', 'closed')).toBe(false);
    expect(canTransition('order', 'invoiced', 'new')).toBe(false);
    expect(canTransition('order', 'closed', 'new')).toBe(false);
    expect(canTransition('order', 'cancelled', 'new')).toBe(false);
    expect(canTransition('order', 'bogus', 'new')).toBe(false);
  });
});

describe('canTransition (po)', () => {
  it('allows the legal chain new→submitted→approved→closed', () => {
    expect(canTransition('po', 'new', 'submitted')).toBe(true);
    expect(canTransition('po', 'submitted', 'approved')).toBe(true);
    expect(canTransition('po', 'approved', 'closed')).toBe(true);
  });
  it('allows cancel from new, submitted and approved', () => {
    expect(canTransition('po', 'new', 'cancelled')).toBe(true);
    expect(canTransition('po', 'submitted', 'cancelled')).toBe(true);
    expect(canTransition('po', 'approved', 'cancelled')).toBe(true);
    expect(canTransition('po', 'closed', 'cancelled')).toBe(false);
  });
  it('rejects illegal jumps', () => {
    expect(canTransition('po', 'new', 'approved')).toBe(false);
    expect(canTransition('po', 'submitted', 'closed')).toBe(false);
    expect(canTransition('po', 'cancelled', 'submitted')).toBe(false);
  });
});

describe('visibleOrderActions', () => {
  const allocated = [{ status: 'allocated' }, { status: 'allocated' }];
  const mixed = [{ status: 'allocated' }, { status: 'no_stock' }];

  it('returns nothing without an order or for non-sales roles', () => {
    expect(visibleOrderActions(null, [], 'sales')).toEqual([]);
    expect(visibleOrderActions({ status: 'new' }, allocated, 'warehouse')).toEqual([]);
    expect(visibleOrderActions({ status: 'new' }, allocated, 'purchasing')).toEqual([]);
  });

  it('new + all allocated → invoice enabled, cancel enabled', () => {
    const a = visibleOrderActions({ status: 'new' }, allocated, 'sales');
    expect(a.map((x) => x.key)).toEqual(['invoice', 'cancel']);
    expect(a[0].enabled).toBe(true);
    expect(a[0].reason).toBeNull();
    expect(a[1].enabled).toBe(true);
  });

  it('new + a non-allocated line → invoice disabled with reason', () => {
    const a = visibleOrderActions({ status: 'new' }, mixed, 'sales');
    const invoice = a.find((x) => x.key === 'invoice');
    expect(invoice.enabled).toBe(false);
    expect(invoice.reason).toBe('orders.err_not_allocated');
  });

  it('new + no lines → invoice disabled with no-lines reason', () => {
    const a = visibleOrderActions({ status: 'new' }, [], 'manager');
    const invoice = a.find((x) => x.key === 'invoice');
    expect(invoice.enabled).toBe(false);
    expect(invoice.reason).toBe('orders.err_no_lines');
  });

  it('invoiced → ship + cancel', () => {
    const a = visibleOrderActions({ status: 'invoiced' }, allocated, 'admin');
    expect(a.map((x) => x.key)).toEqual(['ship', 'cancel']);
    expect(a.every((x) => x.enabled)).toBe(true);
  });

  it('shipped → close only', () => {
    const a = visibleOrderActions({ status: 'shipped' }, allocated, 'sales');
    expect(a.map((x) => x.key)).toEqual(['close']);
  });

  it('closed / cancelled → no actions', () => {
    expect(visibleOrderActions({ status: 'closed' }, allocated, 'sales')).toEqual([]);
    expect(visibleOrderActions({ status: 'cancelled' }, allocated, 'sales')).toEqual([]);
  });
});

describe('visiblePoActions', () => {
  const posted = [{ posted_to_inventory: true }, { posted_to_inventory: true }];
  const partial = [{ posted_to_inventory: true }, { posted_to_inventory: false }];
  const none = [{ posted_to_inventory: false }];

  it('new PO: submit for purchasing, nothing for sales/warehouse', () => {
    const a = visiblePoActions({ status: 'new' }, none, 'purchasing');
    expect(a.map((x) => x.key)).toEqual(['submit', 'cancel']);
    expect(visiblePoActions({ status: 'new' }, none, 'sales')).toEqual([]);
    expect(visiblePoActions({ status: 'new' }, none, 'warehouse')).toEqual([]);
  });

  it('new PO without lines: submit disabled', () => {
    const a = visiblePoActions({ status: 'new' }, [], 'purchasing');
    expect(a.find((x) => x.key === 'submit').enabled).toBe(false);
  });

  it('submitted: approve only for manager/admin', () => {
    expect(visiblePoActions({ status: 'submitted' }, none, 'manager').map((x) => x.key)).toContain('approve');
    expect(visiblePoActions({ status: 'submitted' }, none, 'admin').map((x) => x.key)).toContain('approve');
    expect(visiblePoActions({ status: 'submitted' }, none, 'purchasing').map((x) => x.key)).not.toContain('approve');
  });

  it('approved: close enabled only when all lines posted', () => {
    const notDone = visiblePoActions({ status: 'approved' }, partial, 'manager');
    expect(notDone.find((x) => x.key === 'close').enabled).toBe(false);
    const done = visiblePoActions({ status: 'approved' }, posted, 'manager');
    expect(done.find((x) => x.key === 'close').enabled).toBe(true);
  });

  it('approved: cancel disabled once anything was received', () => {
    const a = visiblePoActions({ status: 'approved' }, partial, 'purchasing');
    expect(a.find((x) => x.key === 'cancel').enabled).toBe(false);
    const b = visiblePoActions({ status: 'approved' }, none, 'purchasing');
    expect(b.find((x) => x.key === 'cancel').enabled).toBe(true);
  });

  it('closed / cancelled → no actions', () => {
    expect(visiblePoActions({ status: 'closed' }, posted, 'admin')).toEqual([]);
    expect(visiblePoActions({ status: 'cancelled' }, none, 'admin')).toEqual([]);
  });
});

describe('canReceive', () => {
  it('only on approved POs, unposted lines, allowed roles', () => {
    const po = { status: 'approved' };
    const line = { posted_to_inventory: false };
    expect(canReceive(po, line, 'warehouse')).toBe(true);
    expect(canReceive(po, line, 'purchasing')).toBe(true);
    expect(canReceive(po, line, 'sales')).toBe(false);
    expect(canReceive({ status: 'submitted' }, line, 'warehouse')).toBe(false);
    expect(canReceive(po, { posted_to_inventory: true }, 'warehouse')).toBe(false);
  });
});

describe('formatMoney', () => {
  it('always shows 2 decimals', () => {
    expect(formatMoney(15, 'en')).toBe('15.00');
    expect(formatMoney(1234.5, 'en')).toBe('1,234.50');
  });
  it('handles junk input as zero', () => {
    expect(formatMoney(undefined, 'en')).toBe('0.00');
    expect(formatMoney('abc', 'en')).toBe('0.00');
  });
  it('uses locale digit grouping (th/ja)', () => {
    expect(formatMoney(1234.5, 'th')).toContain('1,234.5');
    expect(formatMoney(1234.5, 'ja')).toContain('1,234.5');
  });
});

describe('formatDate', () => {
  it('formats PB "YYYY-MM-DD hh:mm:ss" strings', () => {
    const out = formatDate('2026-07-08 02:35:00.000Z', 'en');
    expect(out).toContain('2026');
    expect(out).toContain('Jul');
  });
  it('returns empty string for blank/invalid values', () => {
    expect(formatDate('', 'en')).toBe('');
    expect(formatDate(null, 'en')).toBe('');
    expect(formatDate('not-a-date', 'en')).toBe('');
  });
  it('localizes month names', () => {
    const th = formatDate('2026-01-15 00:00:00.000Z', 'th');
    expect(th).toMatch(/ม\.ค\.|มกราคม/);
    const ja = formatDate('2026-01-15 00:00:00.000Z', 'ja');
    expect(ja).toContain('1');
  });
});

describe('monthKey', () => {
  it('buckets by UTC month', () => {
    expect(monthKey('2026-07-08 02:35:00.000Z')).toBe('2026-07');
    expect(monthKey('')).toBe('');
  });
});
