import { describe, it, expect } from 'vitest';
import {
  soldLineRevenue,
  poLineCost,
  topProductsByRevenue,
  topCategoriesByRevenue,
  topCustomers,
  topSuppliers,
  categoryInventory,
  monthlyOrderPoSeries,
  lifetimeTotals,
} from './analytics';

// ---- fixture helpers -------------------------------------------------------

function soldLine({
  product = 'p1',
  productName = 'Chai',
  category = { id: 'c1', category_name: 'Beverages' },
  customer = 'cust1',
  customerName = 'Alpha Co',
  status = 'invoiced',
  quantity = 1,
  unit_price = 10,
  discount = 0,
} = {}) {
  return {
    product,
    quantity,
    unit_price,
    discount,
    expand: {
      order: {
        status,
        customer,
        expand: { customer: { id: customer, company_name: customerName } },
      },
      product: {
        id: product,
        product_name: productName,
        expand: { category },
      },
    },
  };
}

function poLine({
  supplier = 'sup1',
  supplierName = 'Supply Inc',
  status = 'approved',
  quantity = 1,
  unit_cost = 5,
} = {}) {
  return {
    quantity,
    unit_cost,
    expand: {
      purchase_order: {
        status,
        supplier,
        expand: { supplier: { id: supplier, company_name: supplierName } },
      },
    },
  };
}

// ---- soldLineRevenue / poLineCost ------------------------------------------

describe('soldLineRevenue', () => {
  it('is qty × unit_price × (1 − discount)', () => {
    expect(soldLineRevenue({ quantity: 4, unit_price: 25 })).toBe(100);
    expect(soldLineRevenue({ quantity: 10, unit_price: 10, discount: 0.25 })).toBe(75);
  });
  it('tolerates junk input', () => {
    expect(soldLineRevenue(null)).toBe(0);
    expect(soldLineRevenue({})).toBe(0);
    expect(soldLineRevenue({ quantity: 'x', unit_price: 'y', discount: 'z' })).toBe(0);
  });
});

describe('poLineCost', () => {
  it('is qty × unit_cost', () => {
    expect(poLineCost({ quantity: 3, unit_cost: 7 })).toBe(21);
    expect(poLineCost(null)).toBe(0);
  });
});

// ---- topProductsByRevenue ---------------------------------------------------

describe('topProductsByRevenue', () => {
  it('groups by product, sums qty and revenue', () => {
    const rows = topProductsByRevenue([
      soldLine({ product: 'p1', productName: 'Chai', quantity: 2, unit_price: 10 }),
      soldLine({ product: 'p1', productName: 'Chai', quantity: 3, unit_price: 10, discount: 0.5 }),
      soldLine({ product: 'p2', productName: 'Syrup', quantity: 1, unit_price: 100 }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'p2', name: 'Syrup', qty: 1, revenue: 100 });
    expect(rows[1]).toMatchObject({ id: 'p1', name: 'Chai', qty: 5, revenue: 35 });
  });

  it('excludes lines whose parent order is new or cancelled', () => {
    const rows = topProductsByRevenue([
      soldLine({ product: 'p1', status: 'new', quantity: 5, unit_price: 100 }),
      soldLine({ product: 'p1', status: 'cancelled', quantity: 5, unit_price: 100 }),
      soldLine({ product: 'p1', status: 'shipped', quantity: 1, unit_price: 10 }),
      soldLine({ product: 'p1', status: 'closed', quantity: 1, unit_price: 10 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].revenue).toBe(20);
    expect(rows[0].qty).toBe(2);
  });

  it('applies top-N cutoff in descending revenue order', () => {
    const lines = ['a', 'b', 'c', 'd'].map((p, i) =>
      soldLine({ product: p, productName: p, quantity: 1, unit_price: (i + 1) * 10 })
    );
    const rows = topProductsByRevenue(lines, 2);
    expect(rows.map((r) => r.id)).toEqual(['d', 'c']);
  });

  it('handles empty/null input', () => {
    expect(topProductsByRevenue([], 10)).toEqual([]);
    expect(topProductsByRevenue(null, 10)).toEqual([]);
  });
});

// ---- topCategoriesByRevenue -------------------------------------------------

describe('topCategoriesByRevenue', () => {
  const bev = { id: 'c1', category_name: 'Beverages' };
  const oil = { id: 'c2', category_name: 'Oils' };

  it('groups by product category across products', () => {
    const rows = topCategoriesByRevenue([
      soldLine({ product: 'p1', category: bev, quantity: 1, unit_price: 10 }),
      soldLine({ product: 'p2', category: bev, quantity: 2, unit_price: 10 }),
      soldLine({ product: 'p3', category: oil, quantity: 1, unit_price: 100 }),
    ]);
    expect(rows[0]).toMatchObject({ id: 'c2', name: 'Oils', revenue: 100, qty: 1 });
    expect(rows[1]).toMatchObject({ id: 'c1', name: 'Beverages', revenue: 30, qty: 3 });
  });

  it('filters non-sold statuses and applies cutoff', () => {
    const rows = topCategoriesByRevenue(
      [
        soldLine({ category: bev, status: 'new', quantity: 9, unit_price: 999 }),
        soldLine({ category: bev, status: 'invoiced', quantity: 1, unit_price: 5 }),
        soldLine({ category: oil, status: 'closed', quantity: 1, unit_price: 50 }),
      ],
      1
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Oils');
  });
});

// ---- topCustomers -----------------------------------------------------------

describe('topCustomers', () => {
  it('sums revenue per customer, sold statuses only, ordered desc', () => {
    const rows = topCustomers([
      soldLine({ customer: 'a', customerName: 'Alpha', quantity: 1, unit_price: 10 }),
      soldLine({ customer: 'a', customerName: 'Alpha', quantity: 1, unit_price: 15 }),
      soldLine({ customer: 'b', customerName: 'Beta', quantity: 1, unit_price: 100 }),
      soldLine({ customer: 'c', customerName: 'Gamma', status: 'cancelled', quantity: 1, unit_price: 999 }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
    expect(rows[0]).toMatchObject({ name: 'Beta', revenue: 100 });
    expect(rows[1].revenue).toBe(25);
  });

  it('respects n cutoff', () => {
    const lines = ['a', 'b', 'c'].map((c, i) =>
      soldLine({ customer: c, customerName: c, quantity: 1, unit_price: (i + 1) * 10 })
    );
    expect(topCustomers(lines, 2).map((r) => r.id)).toEqual(['c', 'b']);
  });
});

// ---- topSuppliers -----------------------------------------------------------

describe('topSuppliers', () => {
  it('sums qty × unit_cost per supplier for approved/closed POs only', () => {
    const rows = topSuppliers([
      poLine({ supplier: 's1', supplierName: 'One', status: 'approved', quantity: 2, unit_cost: 10 }),
      poLine({ supplier: 's1', supplierName: 'One', status: 'closed', quantity: 1, unit_cost: 5 }),
      poLine({ supplier: 's2', supplierName: 'Two', status: 'approved', quantity: 10, unit_cost: 10 }),
      poLine({ supplier: 's3', supplierName: 'Three', status: 'new', quantity: 99, unit_cost: 99 }),
      poLine({ supplier: 's3', supplierName: 'Three', status: 'submitted', quantity: 99, unit_cost: 99 }),
      poLine({ supplier: 's3', supplierName: 'Three', status: 'cancelled', quantity: 99, unit_cost: 99 }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(['s2', 's1']);
    expect(rows[0].spend).toBe(100);
    expect(rows[1].spend).toBe(25);
  });

  it('respects n cutoff and empty input', () => {
    expect(topSuppliers([], 5)).toEqual([]);
    const lines = ['a', 'b', 'c'].map((s, i) =>
      poLine({ supplier: s, supplierName: s, quantity: 1, unit_cost: (i + 1) * 10 })
    );
    expect(topSuppliers(lines, 1).map((r) => r.id)).toEqual(['c']);
  });
});

// ---- categoryInventory ------------------------------------------------------

describe('categoryInventory', () => {
  const prod = (id, cat, cost) => ({
    id,
    standard_cost: cost,
    category: cat.id,
    expand: { category: cat },
  });
  const bev = { id: 'c1', category_name: 'Beverages' };
  const oil = { id: 'c2', category_name: 'Oils' };

  it('computes on-hand (purchased − sold) × standard_cost, grouped per category', () => {
    const products = [prod('p1', bev, 2), prod('p2', bev, 10), prod('p3', oil, 1)];
    const tx = {
      p1: [
        { transaction_type: 'purchased', quantity: 10 },
        { transaction_type: 'sold', quantity: 4 },
        { transaction_type: 'on_hold', quantity: 3 }, // ignored for on-hand
      ],
      p2: [{ transaction_type: 'purchased', quantity: 5 }],
      p3: [
        { transaction_type: 'purchased', quantity: 100 },
        { transaction_type: 'sold', quantity: 90 },
      ],
    };
    const rows = categoryInventory(products, tx);
    expect(rows[0]).toMatchObject({ category: 'Beverages', qty: 11, value: 62 }); // 6×2 + 5×10
    expect(rows[1]).toMatchObject({ category: 'Oils', qty: 10, value: 10 });
  });

  it('sorts by value desc and handles products with no transactions', () => {
    const rows = categoryInventory([prod('p1', bev, 5), prod('p2', oil, 1)], {
      p2: [{ transaction_type: 'purchased', quantity: 3 }],
    });
    expect(rows.map((r) => r.category)).toEqual(['Oils', 'Beverages']);
    expect(rows[1]).toMatchObject({ qty: 0, value: 0 });
  });

  it('handles empty input', () => {
    expect(categoryInventory([], {})).toEqual([]);
    expect(categoryInventory(null, null)).toEqual([]);
  });
});

// ---- monthlyOrderPoSeries ---------------------------------------------------

describe('monthlyOrderPoSeries', () => {
  it('returns [] on empty data', () => {
    expect(monthlyOrderPoSeries([], [], {}, {})).toEqual([]);
    expect(monthlyOrderPoSeries(null, null)).toEqual([]);
  });

  it('buckets orders by order_date and POs by created, with values from the maps', () => {
    const orders = [
      { id: 'o1', order_date: '2026-05-10 00:00:00.000Z' },
      { id: 'o2', order_date: '2026-05-20 00:00:00.000Z' },
      { id: 'o3', order_date: '2026-06-01 00:00:00.000Z' },
    ];
    const pos = [
      { id: 'q1', created: '2026-05-02 00:00:00.000Z' },
      { id: 'q2', created: '2026-06-15 00:00:00.000Z' },
    ];
    const rows = monthlyOrderPoSeries(orders, pos, { o1: 100, o2: 50, o3: 10 }, { q1: 30, q2: 70 });
    expect(rows).toEqual([
      { month: '2026-05', orders: 2, pos: 1, orderValue: 150, poValue: 30 },
      { month: '2026-06', orders: 1, pos: 1, orderValue: 10, poValue: 70 },
    ]);
  });

  it('spans gaps with zero months and caps at `months` most recent', () => {
    const orders = [];
    for (let m = 1; m <= 8; m++) {
      orders.push({ id: `o${m}`, order_date: `2026-0${m}-05 00:00:00.000Z` });
    }
    const rows = monthlyOrderPoSeries(orders, [], {}, {}, 6);
    expect(rows).toHaveLength(6);
    expect(rows[0].month).toBe('2026-03');
    expect(rows[5].month).toBe('2026-08');
  });

  it('fills empty months inside the window with zeros', () => {
    const orders = [
      { id: 'o1', order_date: '2026-02-01 00:00:00.000Z' },
      { id: 'o2', order_date: '2026-04-01 00:00:00.000Z' },
    ];
    const rows = monthlyOrderPoSeries(orders, [], {}, {}, 6);
    expect(rows.map((r) => r.month)).toEqual(['2026-02', '2026-03', '2026-04']);
    expect(rows[1]).toMatchObject({ orders: 0, pos: 0, orderValue: 0, poValue: 0 });
  });

  it('falls back to created when order_date is missing', () => {
    const rows = monthlyOrderPoSeries([{ id: 'o1', created: '2026-01-03 00:00:00.000Z' }], []);
    expect(rows).toHaveLength(1);
    expect(rows[0].month).toBe('2026-01');
    expect(rows[0].orders).toBe(1);
  });
});

// ---- lifetimeTotals ---------------------------------------------------------

describe('lifetimeTotals', () => {
  const oLine = (customer, status, qty, price, discount = 0) => ({
    quantity: qty,
    unit_price: price,
    discount,
    expand: { order: { status, customer } },
  });
  const pLine = (supplier, status, qty, cost) => ({
    quantity: qty,
    unit_cost: cost,
    expand: { purchase_order: { status, supplier } },
  });

  it('combines customer-role sales and supplier-role spend per company', () => {
    const totals = lifetimeTotals(
      [
        oLine('acme', 'invoiced', 2, 10), // 20
        oLine('acme', 'closed', 10, 10, 0.5), // 50
        oLine('other', 'shipped', 1, 7),
      ],
      [
        pLine('acme', 'approved', 3, 10), // acme also supplies us: 30
        pLine('supplyco', 'closed', 2, 25), // 50
      ]
    );
    expect(totals.get('acme')).toEqual({ sales: 70, spend: 30, total: 100 });
    expect(totals.get('other')).toEqual({ sales: 7, spend: 0, total: 7 });
    expect(totals.get('supplyco')).toEqual({ sales: 0, spend: 50, total: 50 });
  });

  it('excludes new/cancelled orders and new/submitted/cancelled POs', () => {
    const totals = lifetimeTotals(
      [oLine('acme', 'new', 9, 100), oLine('acme', 'cancelled', 9, 100)],
      [pLine('acme', 'new', 9, 100), pLine('acme', 'submitted', 9, 100), pLine('acme', 'cancelled', 9, 100)]
    );
    expect(totals.has('acme')).toBe(false);
  });

  it('handles empty input', () => {
    const totals = lifetimeTotals([], []);
    expect(totals.size).toBe(0);
    expect(lifetimeTotals(null, null).size).toBe(0);
  });
});
