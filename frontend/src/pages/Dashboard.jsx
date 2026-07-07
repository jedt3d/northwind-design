import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ChevronRight,
  Coins,
  Package,
  PackagePlus,
  PieChart,
  ShoppingCart,
  Tags,
  TrendingUp,
  Users,
} from 'lucide-react';
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
import StatCards from '../components/charts/StatCards.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import AreaTrend from '../components/charts/AreaTrend.jsx';
import RankBars from '../components/charts/RankBars.jsx';
import LeaderList from '../components/charts/LeaderList.jsx';

function Panel({ title, icon: Icon, empty, items, renderItem }) {
  return (
    <section className="panel">
      <h2 className="panel-title">
        {Icon && <Icon aria-hidden="true" />}
        {title}
      </h2>
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

function ChartPanel({ title, icon: Icon, loading, empty, hasData, wide, children }) {
  return (
    <section className={`panel${wide ? ' panel--wide' : ''}`}>
      <h2 className="panel-title">
        {Icon && <Icon aria-hidden="true" />}
        {title}
      </h2>
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
  const [lowCount, setLowCount] = useState(null);
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
          setLowCount(low.length);
        })
        .catch(() => {
          if (alive) {
            setLowStock([]);
            setLowCount(0);
          }
        });
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
      // KPI figures derived from the same fetched data (no extra queries).
      openOrders: raw.orders.filter((o) => ['new', 'invoiced', 'shipped'].includes(o.status)).length,
      posAwaiting: raw.pos.filter((p) => p.status === 'submitted').length,
      stockValue: inv.reduce((s, r) => s + r.value, 0),
    };
  }, [raw]);

  const kpis = [
    {
      icon: ShoppingCart,
      tone: 'sage',
      value: analytics ? analytics.openOrders : '…',
      caption: t('dash.kpi_open_orders'),
    },
    {
      icon: BadgeCheck,
      tone: 'amber',
      value: analytics ? analytics.posAwaiting : '…',
      caption: t('dash.awaiting_approval'),
    },
    ...(showLowStock
      ? [
          {
            icon: AlertTriangle,
            tone: 'coral',
            value: lowCount === null ? '…' : lowCount,
            caption: t('dash.low_stock'),
          },
        ]
      : []),
    {
      icon: Coins,
      tone: 'blue',
      value: analytics ? formatMoney(analytics.stockValue, lang) : '…',
      caption: t('dash.kpi_stock_value'),
    },
  ];

  const monthChips =
    analytics && analytics.monthly.length > 0 ? (
      analytics.monthly.map((r) => (
        <span key={r.month} className="area-chip">
          <span className="area-chip-month">{r.month}</span>
          <span className="area-chip-dot" style={{ background: 'var(--color-sage)' }} />
          {r.orders} · {formatMoney(r.orderValue, lang)}
          <span className="area-chip-dot" style={{ background: 'var(--color-blue)' }} />
          {r.pos} · {formatMoney(r.poValue, lang)}
        </span>
      ))
    ) : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('dash.title')}</h1>
      </div>

      <StatCards items={kpis} />

      <div className="dash-grid">
        {showLowStock && (
          <Panel
            title={t('dash.low_stock')}
            icon={AlertTriangle}
            empty={t('dash.low_stock_empty')}
            items={lowStock}
            renderItem={(p) => (
              <li key={p.id} className="panel-row">
                <Link to={`/products/${p.id}`} className="panel-link">
                  <span className="panel-link-body">
                    <span className="panel-main">{p.product_name}</span>
                    <span className="panel-sub">
                      {t('dash.available_short')}: <strong className={p.available <= 0 ? 'text-danger' : ''}>{p.available}</strong>{' '}
                      · {t('dash.reorder_at', { n: p.reorder_level })}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              </li>
            )}
          />
        )}
        {showApprovals && (
          <Panel
            title={t('dash.awaiting_approval')}
            icon={BadgeCheck}
            empty={t('dash.awaiting_approval_empty')}
            items={approvals}
            renderItem={(po) => (
              <li key={po.id} className="panel-row">
                <Link to={`/purchase-orders/${po.id}`} className="panel-link">
                  <span className="panel-link-body">
                    <span className="panel-main">
                      {po.po_number} · {po.expand?.supplier?.company_name || ''}
                    </span>
                    <span className="panel-sub">
                      <StatusBadge domain="po" status={po.status} /> {formatDate(po.created, lang)}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              </li>
            )}
          />
        )}
        {showOrders && (
          <Panel
            title={t('dash.my_recent_orders')}
            icon={ShoppingCart}
            empty={t('dash.my_recent_orders_empty')}
            items={myOrders}
            renderItem={(o) => (
              <li key={o.id} className="panel-row">
                <Link to={`/orders/${o.id}`} className="panel-link">
                  <span className="panel-link-body">
                    <span className="panel-main">
                      {o.order_number} · {o.expand?.customer?.company_name || ''}
                    </span>
                    <span className="panel-sub">
                      <StatusBadge domain="order" status={o.status} /> {formatDate(o.order_date, lang)}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              </li>
            )}
          />
        )}
        {showPos && (
          <Panel
            title={t('dash.recent_pos')}
            icon={PackagePlus}
            empty={t('dash.recent_pos_empty')}
            items={recentPos}
            renderItem={(po) => (
              <li key={po.id} className="panel-row">
                <Link to={`/purchase-orders/${po.id}`} className="panel-link">
                  <span className="panel-link-body">
                    <span className="panel-main">
                      {po.po_number} · {po.expand?.supplier?.company_name || ''}
                    </span>
                    <span className="panel-sub">
                      <StatusBadge domain="po" status={po.status} /> {formatDate(po.created, lang)}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" />
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
            icon={PieChart}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.invByValue.length > 0}
          >
            {analytics && (
              <DonutChart
                data={analytics.invByValue.map((r) => ({ label: r.category, value: r.value }))}
                centerCaption={t('common.total')}
                format={(v) => formatMoney(v, lang)}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.top_cat_qty')}
            icon={PieChart}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.invByQty.length > 0}
          >
            {analytics && (
              <DonutChart
                data={analytics.invByQty.map((r) => ({ label: r.category, value: r.qty }))}
                centerCaption={t('common.total')}
                colors={[
                  'var(--color-blue)',
                  'var(--color-sage)',
                  'var(--color-amber)',
                  'var(--color-coral)',
                  'var(--color-sage-border)',
                ]}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.orders_vs_pos')}
            icon={TrendingUp}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.monthly.length > 0}
            wide
          >
            {analytics && (
              <AreaTrend
                rows={analytics.monthly}
                series={[
                  { key: 'orderValue', label: t('dash.legend_orders'), color: 'var(--color-sage)' },
                  { key: 'poValue', label: t('dash.legend_pos'), color: 'var(--color-blue)' },
                ]}
                format={(v) => formatMoney(v, lang)}
                chips={monthChips}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.top_products')}
            icon={Package}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.products.length > 0}
          >
            {analytics && (
              <RankBars
                rows={analytics.products.map((r) => ({ label: r.name, value: r.revenue, sub: r.qty }))}
                format={(v) => formatMoney(v, lang)}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.top_categories')}
            icon={Tags}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.categories.length > 0}
          >
            {analytics && (
              <RankBars
                rows={analytics.categories.map((r) => ({ label: r.name, value: r.revenue, sub: r.qty }))}
                format={(v) => formatMoney(v, lang)}
                color="blue"
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.top_customers')}
            icon={Users}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.customers.length > 0}
          >
            {analytics && (
              <LeaderList
                rows={analytics.customers.map((r) => ({ name: r.name, value: r.revenue }))}
                format={(v) => formatMoney(v, lang)}
              />
            )}
          </ChartPanel>

          <ChartPanel
            title={t('dash.top_suppliers')}
            icon={Building2}
            loading={!analytics}
            empty={t('dash.no_data')}
            hasData={!!analytics && analytics.suppliers.length > 0}
          >
            {analytics && (
              <LeaderList
                rows={analytics.suppliers.map((r) => ({ name: r.name, value: r.spend }))}
                format={(v) => formatMoney(v, lang)}
                color="blue"
              />
            )}
          </ChartPanel>
        </div>
      )}
    </div>
  );
}
