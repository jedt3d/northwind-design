import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { pb, currentUser, currentRole } from '../pb';
import { useT } from '../i18n/index.jsx';
import { fetchStockMap } from '../lib/stock';
import { formatDate, formatMoney } from '../lib/calc';
import {
  soldLineRevenue,
  poLineCost,
  topProductsByRevenue,
  topCategoriesByRevenue,
  topCustomers,
  topSuppliers,
  categoryInventory,
  monthlyOrderPoSeries,
} from '../lib/analytics';
import StatusBadge from '../components/StatusBadge.jsx';

function Panel({ title, empty, items, renderItem }) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      {items === null ? (
        <div className="skeleton panel-skeleton" />
      ) : items.length === 0 ? (
        <div className="panel-empty">{empty}</div>
      ) : (
        <ul className="panel-list">{items.map(renderItem)}</ul>
      )}
    </section>
  );
}

/** Same CSS-bar pattern as ReportView, with a pastel token color per panel. */
function BarChart({ rows, color = 'blue', format }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="bar-chart">
      {rows.map((r, i) => (
        <div key={i} className="bar-row">
          <span className="bar-label" title={r.label}>
            {r.label}
          </span>
          <span className="bar-track">
            <span
              className={`bar-fill bar-fill--${color}`}
              style={{ width: `${(Math.max(r.value, 0) / max) * 100}%` }}
            />
          </span>
          <span className="bar-value">{format ? format(r) : r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Paired bars (orders vs POs) per month, counts scaled to a common max. */
function PairedBarChart({ rows, lang, ordersLabel, posLabel }) {
  const max = Math.max(...rows.flatMap((r) => [r.orders, r.pos]), 1);
  return (
    <div>
      <div className="chart-legend">
        <span>
          <span className="chart-legend-swatch chart-legend-swatch--blue" />
          {ordersLabel}
        </span>
        <span>
          <span className="chart-legend-swatch chart-legend-swatch--yellow" />
          {posLabel}
        </span>
      </div>
      <div className="bar-chart">
        {rows.map((r) => (
          <div key={r.month} className="pair-group">
            <div className="bar-row">
              <span className="bar-label">{r.month}</span>
              <span className="bar-track">
                <span className="bar-fill bar-fill--blue" style={{ width: `${(r.orders / max) * 100}%` }} />
              </span>
              <span className="bar-value">
                {r.orders} · {formatMoney(r.orderValue, lang)}
              </span>
            </div>
            <div className="bar-row">
              <span className="bar-label" />
              <span className="bar-track">
                <span className="bar-fill bar-fill--yellow" style={{ width: `${(r.pos / max) * 100}%` }} />
              </span>
              <span className="bar-value">
                {r.pos} · {formatMoney(r.poValue, lang)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartPanel({ title, loading, empty, hasData, wide, children }) {
  return (
    <section className={`panel${wide ? ' panel--wide' : ''}`}>
      <h2 className="panel-title">{title}</h2>
      {loading ? (
        <div className="skeleton panel-skeleton" />
      ) : !hasData ? (
        <div className="panel-empty">{empty}</div>
      ) : (
        children
      )}
    </section>
  );
}

export default function Dashboard() {
  const { t, lang } = useT();
  const role = currentRole();
  const me = currentUser();
  const [lowStock, setLowStock] = useState(null);
  const [approvals, setApprovals] = useState(null);
  const [myOrders, setMyOrders] = useState(null);
  const [recentPos, setRecentPos] = useState(null);
  const [raw, setRaw] = useState(null);
  const [analyticsError, setAnalyticsError] = useState('');

  const showLowStock = ['purchasing', 'warehouse', 'manager', 'admin'].includes(role);
  const showApprovals = ['manager', 'admin'].includes(role);
  const showOrders = ['sales', 'manager', 'admin'].includes(role);
  const showPos = ['purchasing', 'warehouse', 'manager', 'admin'].includes(role);

  useEffect(() => {
    let alive = true;
    if (showLowStock) {
      Promise.all([
        pb.collection('products').getList(1, 200, { filter: 'discontinued = false', sort: 'product_name' }),
        fetchStockMap(),
      ])
        .then(([prods, stock]) => {
          if (!alive) return;
          const low = prods.items
            .map((p) => ({ ...p, available: stock[p.id] ? stock[p.id].available : 0 }))
            .filter((p) => (p.reorder_level || 0) > 0 && p.available < p.reorder_level);
          setLowStock(low.slice(0, 8));
        })
        .catch(() => alive && setLowStock([]));
    }
    if (showApprovals) {
      pb.collection('purchase_orders')
        .getList(1, 8, { filter: "status = 'submitted'", sort: '-created', expand: 'supplier' })
        .then((r) => alive && setApprovals(r.items))
        .catch(() => alive && setApprovals([]));
    }
    if (showOrders && me) {
      pb.collection('orders')
        .getList(1, 8, {
          filter: pb.filter('employee = {:me}', { me: me.id }),
          sort: '-created',
          expand: 'customer',
        })
        .then((r) => alive && setMyOrders(r.items))
        .catch(() => alive && setMyOrders([]));
    }
    if (showPos) {
      pb.collection('purchase_orders')
        .getList(1, 8, { sort: '-created', expand: 'supplier' })
        .then((r) => alive && setRecentPos(r.items))
        .catch(() => alive && setRecentPos([]));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Analytics section — visible to all roles. 6 batched fetches, one Promise.all.
  useEffect(() => {
    let alive = true;
    setRaw(null);
    setAnalyticsError('');
    Promise.all([
      pb.collection('order_details').getList(1, 500, { expand: 'order,order.customer,product.category' }),
      pb.collection('purchase_order_details').getList(1, 500, { expand: 'purchase_order,purchase_order.supplier' }),
      pb.collection('products').getList(1, 500, { expand: 'category' }),
      pb.collection('inventory_transactions').getList(1, 500, {}),
      pb.collection('orders').getList(1, 500, { sort: '-order_date' }),
      pb.collection('purchase_orders').getList(1, 500, { sort: '-created' }),
    ])
      .then(([orderLines, poLines, products, txs, orders, pos]) => {
        if (!alive) return;
        setRaw({
          orderLines: orderLines.items,
          poLines: poLines.items,
          products: products.items,
          txs: txs.items,
          orders: orders.items,
          pos: pos.items,
        });
      })
      .catch((err) => {
        if (alive) setAnalyticsError(err?.message || String(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  const analytics = useMemo(() => {
    if (!raw) return null;
    const txByProduct = {};
    for (const tx of raw.txs) (txByProduct[tx.product] ||= []).push(tx);
    const inv = categoryInventory(raw.products, txByProduct);
    const orderRevenueByOrderId = {};
    for (const l of raw.orderLines) {
      orderRevenueByOrderId[l.order] = (orderRevenueByOrderId[l.order] || 0) + soldLineRevenue(l);
    }
    const poCostByPoId = {};
    for (const l of raw.poLines) {
      poCostByPoId[l.purchase_order] = (poCostByPoId[l.purchase_order] || 0) + poLineCost(l);
    }
    return {
      invByValue: inv.slice(0, 5),
      invByQty: [...inv].sort((a, b) => b.qty - a.qty).slice(0, 5),
      monthly: monthlyOrderPoSeries(raw.orders, raw.pos, orderRevenueByOrderId, poCostByPoId, 6),
      products: topProductsByRevenue(raw.orderLines, 10),
      categories: topCategoriesByRevenue(raw.orderLines, 10),
      customers: topCustomers(raw.orderLines, 5),
      suppliers: topSuppliers(raw.poLines, 5),
    };
  }, [raw]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('dash.title')}</h1>
      </div>
      <div className="dash-grid">
        {showLowStock && (
          <Panel
            title={t('dash.low_stock')}
            empty={t('dash.low_stock_empty')}
            items={lowStock}
            renderItem={(p) => (
              <li key={p.id} className="panel-row">
                <Link to={`/products/${p.id}`} className="panel-link">
                  <span className="panel-main">{p.product_name}</span>
                  <span className="panel-sub">
                    {t('dash.available_short')}: <strong className={p.available <= 0 ? 'text-danger' : ''}>{p.available}</strong>{' '}
                    · {t('dash.reorder_at', { n: p.reorder_level })}
                  </span>
                </Link>
              </li>
            )}
          />
        )}
        {showApprovals && (
          <Panel
            title={t('dash.awaiting_approval')}
            empty={t('dash.awaiting_approval_empty')}
            items={approvals}
            renderItem={(po) => (
              <li key={po.id} className="panel-row">
                <Link to={`/purchase-orders/${po.id}`} className="panel-link">
                  <span className="panel-main">
                    {po.po_number} · {po.expand?.supplier?.company_name || ''}
                  </span>
                  <span className="panel-sub">
                    <StatusBadge domain="po" status={po.status} /> {formatDate(po.created, lang)}
                  </span>
                </Link>
              </li>
            )}
          />
        )}
        {showOrders && (
          <Panel
            title={t('dash.my_recent_orders')}
            empty={t('dash.my_recent_orders_empty')}
            items={myOrders}
            renderItem={(o) => (
              <li key={o.id} className="panel-row">
                <Link to={`/orders/${o.id}`} className="panel-link">
                  <span className="panel-main">
                    {o.order_number} · {o.expand?.customer?.company_name || ''}
                  </span>
                  <span className="panel-sub">
                    <StatusBadge domain="order" status={o.status} /> {formatDate(o.order_date, lang)}
                  </span>
                </Link>
              </li>
            )}
          />
        )}
        {showPos && (
          <Panel
            title={t('dash.recent_pos')}
            empty={t('dash.recent_pos_empty')}
            items={recentPos}
            renderItem={(po) => (
              <li key={po.id} className="panel-row">
                <Link to={`/purchase-orders/${po.id}`} className="panel-link">
                  <span className="panel-main">
                    {po.po_number} · {po.expand?.supplier?.company_name || ''}
                  </span>
                  <span className="panel-sub">
                    <StatusBadge domain="po" status={po.status} /> {formatDate(po.created, lang)}
                  </span>
                </Link>
              </li>
            )}
          />
        )}
      </div>

      <h2 className="dash-analytics-title">{t('dash.analytics')}</h2>
      {analyticsError && (
        <div className="banner banner--error" role="alert">
          {analyticsError}
        </div>
      )}
      {!analyticsError && (
        <div className="dash-grid dash-grid--analytics">
          <ChartPanel
            title={t('dash.top_cat_value')}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.invByValue.length > 0}
          >
            {analytics && (
              <BarChart
                rows={analytics.invByValue.map((r) => ({ label: r.category, value: r.value }))}
                color="blue"
                format={(r) => formatMoney(r.value, lang)}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.top_cat_qty')}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.invByQty.length > 0}
          >
            {analytics && (
              <BarChart
                rows={analytics.invByQty.map((r) => ({ label: r.category, value: r.qty }))}
                color="green"
                format={(r) => r.value}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.orders_vs_pos')}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.monthly.length > 0}
            wide
          >
            {analytics && (
              <PairedBarChart
                rows={analytics.monthly}
                lang={lang}
                ordersLabel={t('dash.legend_orders')}
                posLabel={t('dash.legend_pos')}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.top_products')}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.products.length > 0}
          >
            {analytics && (
              <BarChart
                rows={analytics.products.map((r) => ({ label: r.name, value: r.revenue, qty: r.qty }))}
                color="purple"
                format={(r) => `${formatMoney(r.value, lang)} (${r.qty})`}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.top_categories')}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.categories.length > 0}
          >
            {analytics && (
              <BarChart
                rows={analytics.categories.map((r) => ({ label: r.name, value: r.revenue, qty: r.qty }))}
                color="pink"
                format={(r) => `${formatMoney(r.value, lang)} (${r.qty})`}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.top_customers')}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.customers.length > 0}
          >
            {analytics && (
              <BarChart
                rows={analytics.customers.map((r) => ({ label: r.name, value: r.revenue }))}
                color="green"
                format={(r) => formatMoney(r.value, lang)}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.top_suppliers')}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.suppliers.length > 0}
          >
            {analytics && (
              <BarChart
                rows={analytics.suppliers.map((r) => ({ label: r.name, value: r.spend }))}
                color="red"
                format={(r) => formatMoney(r.value, lang)}
              />
            )}
          </ChartPanel>
        </div>
      )}
    </div>
  );
}
