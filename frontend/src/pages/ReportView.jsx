import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pb } from '../pb';
import { useT } from '../i18n/index.jsx';
import { formatDate, formatMoney, lineTotal, monthKey } from '../lib/calc';
import { fetchStockMap } from '../lib/stock';
import StatusBadge from '../components/StatusBadge.jsx';
import AreaTrend from '../components/charts/AreaTrend.jsx';
import RankBars from '../components/charts/RankBars.jsx';
import AvailabilityBar from '../components/charts/AvailabilityBar.jsx';

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 3);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Fetch invoiced order lines in a date range (order.invoice_date). */
async function fetchInvoicedLines(from, to) {
  const filter = pb.filter(
    "order.invoice_date >= {:from} && order.invoice_date <= {:to} && order.status != 'cancelled' && order.status != 'new'",
    { from: `${from} 00:00:00`, to: `${to} 23:59:59` }
  );
  const res = await pb.collection('order_details').getList(1, 500, {
    filter,
    expand: 'order,order.employee,product',
    sort: 'created',
  });
  return res.items;
}

export default function ReportView() {
  const { reportId } = useParams();
  const { t, lang } = useT();
  const [range, setRange] = useState(defaultRange);
  const [groupBy, setGroupBy] = useState('employee');
  const [belowOnly, setBelowOnly] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const titleKey = {
    'sales-by-period': 'reports.sales_title',
    'top-products': 'reports.top_title',
    'stock-on-hand': 'reports.stock_title',
    'outstanding-pos': 'reports.outpo_title',
  }[reportId];

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    const run = async () => {
      try {
        if (reportId === 'sales-by-period' || reportId === 'top-products') {
          const lines = await fetchInvoicedLines(range.from, range.to);
          if (alive) setData(lines);
        } else if (reportId === 'stock-on-hand') {
          const [prods, stock] = await Promise.all([
            pb.collection('products').getList(1, 500, { sort: 'product_name' }),
            fetchStockMap(),
          ]);
          if (alive)
            setData(
              prods.items.map((p) => {
                const s = stock[p.id] || { onHand: 0, onHold: 0, available: 0 };
                return { ...p, ...s, low: (p.reorder_level || 0) > 0 && s.available < p.reorder_level };
              })
            );
        } else if (reportId === 'outstanding-pos') {
          const [pos, lines] = await Promise.all([
            pb.collection('purchase_orders').getList(1, 200, {
              filter: "status = 'submitted' || status = 'approved'",
              sort: '-created',
              expand: 'supplier',
            }),
            pb.collection('purchase_order_details').getList(1, 500, {
              filter: "purchase_order.status = 'submitted' || purchase_order.status = 'approved'",
              expand: 'product',
            }),
          ]);
          if (alive) setData({ pos: pos.items, lines: lines.items });
        }
      } catch (err) {
        if (alive) setError(err?.message || String(err));
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [reportId, range.from, range.to]);

  const content = useMemo(() => {
    if (!data) return null;

    if (reportId === 'sales-by-period') {
      const byMonth = {};
      const byGroup = {};
      for (const l of data) {
        const order = l.expand?.order;
        if (!order) continue;
        const m = monthKey(order.invoice_date);
        const revenue = lineTotal(l);
        byMonth[m] = (byMonth[m] || 0) + revenue;
        const gk =
          groupBy === 'employee'
            ? `${order.expand?.employee?.first_name || ''} ${order.expand?.employee?.last_name || ''}`.trim() || '—'
            : l.expand?.product?.product_name || '—';
        const rowKey = `${m}|${gk}`;
        byGroup[rowKey] = (byGroup[rowKey] || 0) + revenue;
      }
      const chartRows = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([m, v]) => ({ label: m, value: v }));
      const tableRows = Object.entries(byGroup)
        .map(([k, v]) => {
          const [m, g] = k.split('|');
          return { month: m, group: g, revenue: v };
        })
        .sort((a, b) => a.month.localeCompare(b.month) || b.revenue - a.revenue);
      if (chartRows.length === 0) return <div className="empty-state"><div className="empty-state-title">{t('reports.no_data')}</div></div>;
      return (
        <>
          <AreaTrend
            rows={chartRows.map((r) => ({ month: r.label, value: r.value }))}
            series={[{ key: 'value', label: t('reports.revenue'), color: 'var(--color-sage)' }]}
            format={(v) => formatMoney(v, lang)}
            chips={chartRows.map((r) => (
              <span key={r.label} className="area-chip">
                <span className="area-chip-month">{r.label}</span>
                <span className="area-chip-dot" style={{ background: 'var(--color-sage)' }} />
                {formatMoney(r.value, lang)}
              </span>
            ))}
          />
          <table className="nw-table report-table">
            <thead>
              <tr>
                <th>{t('reports.month')}</th>
                <th>{groupBy === 'employee' ? t('reports.by_employee') : t('reports.by_product')}</th>
                <th className="nw-table-th--right">{t('reports.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i}>
                  <td>{r.month}</td>
                  <td>{r.group}</td>
                  <td className="nw-table-td--right">{formatMoney(r.revenue, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }

    if (reportId === 'top-products') {
      const byProduct = {};
      for (const l of data) {
        const name = l.expand?.product?.product_name || '—';
        const cur = (byProduct[name] ||= { name, qty: 0, revenue: 0 });
        cur.qty += Number(l.quantity) || 0;
        cur.revenue += lineTotal(l);
      }
      const rows = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);
      if (rows.length === 0) return <div className="empty-state"><div className="empty-state-title">{t('reports.no_data')}</div></div>;
      return (
        <>
          <RankBars
            rows={rows.slice(0, 10).map((r) => ({ label: r.name, value: r.revenue, sub: r.qty }))}
            format={(v) => formatMoney(v, lang)}
          />
          <table className="nw-table report-table">
            <thead>
              <tr>
                <th>{t('orders.product')}</th>
                <th className="nw-table-th--right">{t('reports.qty_sold')}</th>
                <th className="nw-table-th--right">{t('reports.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td className="nw-table-td--right">{r.qty}</td>
                  <td className="nw-table-td--right">{formatMoney(r.revenue, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }

    if (reportId === 'stock-on-hand') {
      const rows = belowOnly ? data.filter((r) => r.low) : data;
      if (rows.length === 0) return <div className="empty-state"><div className="empty-state-title">{t('reports.no_data')}</div></div>;
      return (
        <table className="nw-table report-table">
          <thead>
            <tr>
              <th>{t('products.code')}</th>
              <th>{t('products.name')}</th>
              <th className="nw-table-th--right">{t('products.on_hand')}</th>
              <th className="nw-table-th--right">{t('products.allocated')}</th>
              <th className="nw-table-th--right">{t('products.available')}</th>
              <th className="nw-table-th--right">{t('products.reorder_level')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.low ? 'nw-row--warn' : ''}>
                <td>{r.product_code}</td>
                <td>
                  <Link to={`/products/${r.id}`}>{r.product_name}</Link>
                </td>
                <td className="nw-table-td--right">{r.onHand}</td>
                <td className="nw-table-td--right">{r.onHold}</td>
                <td className="nw-table-td--right">{r.available}</td>
                <td className="nw-table-td--right">{r.reorder_level ?? 0}</td>
                <td>
                  <AvailabilityBar available={r.available} reorder={r.reorder_level || 0} target={r.target_level || 0} />{' '}
                  {r.low && <span className="type-chip type-chip--warn">{t('products.low_stock')}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (reportId === 'outstanding-pos') {
      const { pos, lines } = data;
      const byPo = {};
      for (const l of lines) {
        const cur = (byPo[l.purchase_order] ||= { ordered: 0, received: 0 });
        cur.ordered += Number(l.quantity) || 0;
        if (l.posted_to_inventory) cur.received += Number(l.quantity) || 0;
      }
      const rows = pos
        .map((po) => ({ po, ...(byPo[po.id] || { ordered: 0, received: 0 }) }))
        .filter((r) => r.ordered > r.received || r.po.status === 'submitted');
      if (rows.length === 0) return <div className="empty-state"><div className="empty-state-title">{t('reports.no_data')}</div></div>;
      return (
        <table className="nw-table report-table">
          <thead>
            <tr>
              <th>{t('po.number')}</th>
              <th>{t('po.supplier')}</th>
              <th>{t('common.status')}</th>
              <th>{t('po.expected_date')}</th>
              <th className="nw-table-th--right">{t('reports.ordered')}</th>
              <th className="nw-table-th--right">{t('reports.received')}</th>
              <th className="nw-table-th--right">{t('reports.outstanding')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.po.id}>
                <td>
                  <Link to={`/purchase-orders/${r.po.id}`}>{r.po.po_number}</Link>
                </td>
                <td>{r.po.expand?.supplier?.company_name || ''}</td>
                <td>
                  <StatusBadge domain="po" status={r.po.status} />
                </td>
                <td>{formatDate(r.po.expected_date, lang)}</td>
                <td className="nw-table-td--right">{r.ordered}</td>
                <td className="nw-table-td--right">{r.received}</td>
                <td className="nw-table-td--right">{r.ordered - r.received}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  }, [data, reportId, groupBy, belowOnly, lang, t]);

  const showRange = reportId === 'sales-by-period' || reportId === 'top-products';

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/reports" className="back-link">
            ← {t('reports.title')}
          </Link>
          <h1 className="page-title">{titleKey ? t(titleKey) : reportId}</h1>
        </div>
      </div>

      <div className="report-controls">
        {showRange && (
          <>
            <label className="report-control">
              {t('common.from')}
              <input
                className="input"
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </label>
            <label className="report-control">
              {t('common.to')}
              <input
                className="input"
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </label>
          </>
        )}
        {reportId === 'sales-by-period' && (
          <label className="report-control">
            {t('reports.group_by')}
            <select className="input" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="employee">{t('reports.by_employee')}</option>
              <option value="product">{t('reports.by_product')}</option>
            </select>
          </label>
        )}
        {reportId === 'stock-on-hand' && (
          <label className="checkbox report-control">
            <input type="checkbox" checked={belowOnly} onChange={(e) => setBelowOnly(e.target.checked)} />
            {t('inv.below_reorder_only')}
          </label>
        )}
      </div>

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}
      {!error && data === null && <div className="skeleton page-skeleton" />}
      {!error && data !== null && content}
    </div>
  );
}
