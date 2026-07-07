import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pb, currentUser, currentRole } from '../pb';
import { useT } from '../i18n/index.jsx';
import { fetchStockMap } from '../lib/stock';
import { formatDate } from '../lib/calc';
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

export default function Dashboard() {
  const { t, lang } = useT();
  const role = currentRole();
  const me = currentUser();
  const [lowStock, setLowStock] = useState(null);
  const [approvals, setApprovals] = useState(null);
  const [myOrders, setMyOrders] = useState(null);
  const [recentPos, setRecentPos] = useState(null);

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
    </div>
  );
}
