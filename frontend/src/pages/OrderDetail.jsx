import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { pb, errMsg, currentRole } from '../pb';
import { useT } from '../i18n/index.jsx';
import { formatDate, formatMoney, lineTotal, orderTotals, visibleOrderActions } from '../lib/calc';
import { fetchStockMap } from '../lib/stock';
import StatusBadge from '../components/StatusBadge.jsx';
import LookupSelect from '../components/LookupSelect.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormField from '../components/FormField.jsx';
import { useToast } from '../components/Toast.jsx';

export default function OrderDetail() {
  const { id } = useParams();
  const { t, lang } = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const role = currentRole();

  const [order, setOrder] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stockMap, setStockMap] = useState({});

  // add-line form
  const [newProduct, setNewProduct] = useState(null); // {id,label,record}
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState('');
  // inline line edit
  const [editLineId, setEditLineId] = useState(null);
  const [editQty, setEditQty] = useState(1);
  const [editPrice, setEditPrice] = useState(0);
  // ship panel
  const [shipOpen, setShipOpen] = useState(false);
  const [shipper, setShipper] = useState(null);
  const [shipFee, setShipFee] = useState('0');
  // confirms
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ord, lns] = await Promise.all([
        pb.collection('orders').getOne(id, { expand: 'customer,employee,shipper' }),
        pb.collection('order_details').getList(1, 200, {
          filter: pb.filter('order = {:o}', { o: id }),
          sort: 'created',
          expand: 'product',
        }),
      ]);
      setOrder(ord);
      setLines(lns.items);
      setError('');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
    fetchStockMap()
      .then(setStockMap)
      .catch(() => {});
  }, [load]);

  const patchStatus = async (body) => {
    setBusy(true);
    try {
      await pb.collection('orders').update(id, body);
      await load();
      toast(t('common.saved'), 'success');
      return true;
    } catch (err) {
      toast(errMsg(err), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const actions = visibleOrderActions(order, lines, role);
  const actionOf = (key) => actions.find((a) => a.key === key);

  const runAction = async (key) => {
    if (key === 'invoice') await patchStatus({ status: 'invoiced' });
    else if (key === 'close') await patchStatus({ status: 'closed' });
    else if (key === 'cancel') setConfirmCancel(true);
    else if (key === 'ship') setShipOpen(true);
  };

  const doShip = async () => {
    if (!shipper) {
      toast(t('orders.need_shipper'), 'error');
      return;
    }
    const ok = await patchStatus({
      status: 'shipped',
      shipper: shipper.id,
      shipping_fee: Number(shipFee) || 0,
    });
    if (ok) setShipOpen(false);
  };

  const doCancel = async () => {
    setConfirmCancel(false);
    await patchStatus({ status: 'cancelled' });
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      await pb.collection('orders').delete(id);
      toast(t('common.deleted'), 'success');
      navigate('/orders');
    } catch (err) {
      toast(errMsg(err), 'error');
      setBusy(false);
    }
  };

  const fetchProducts = async (q) => {
    const parts = ['discontinued = false'];
    if (q) parts.push(pb.filter('(product_code ~ {:q} || product_name ~ {:q})', { q }));
    const r = await pb.collection('products').getList(1, 20, { filter: parts.join(' && '), sort: 'product_name' });
    return r.items.map((p) => ({
      id: p.id,
      label: `${p.product_code} · ${p.product_name}`,
      sub: `${t('products.available')}: ${stockMap[p.id] ? stockMap[p.id].available : 0} · ${formatMoney(p.list_price, lang)}`,
      record: p,
    }));
  };

  const addLine = async (e) => {
    e.preventDefault();
    if (!newProduct) return;
    setBusy(true);
    try {
      await pb.collection('order_details').create({
        order: id,
        product: newProduct.id,
        quantity: Number(newQty) || 1,
        unit_price: newPrice === '' ? undefined : Number(newPrice),
      });
      setNewProduct(null);
      setNewQty(1);
      setNewPrice('');
      await load();
      fetchStockMap().then(setStockMap).catch(() => {});
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const startEditLine = (l) => {
    setEditLineId(l.id);
    setEditQty(l.quantity);
    setEditPrice(l.unit_price);
  };

  const saveEditLine = async (l) => {
    setBusy(true);
    try {
      await pb.collection('order_details').update(l.id, {
        quantity: Number(editQty) || 1,
        unit_price: Number(editPrice) || 0,
      });
      setEditLineId(null);
      await load();
      fetchStockMap().then(setStockMap).catch(() => {});
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeLine = async (l) => {
    setBusy(true);
    try {
      await pb.collection('order_details').delete(l.id);
      await load();
      fetchStockMap().then(setStockMap).catch(() => {});
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="skeleton page-skeleton" />;
  if (error)
    return (
      <div className="banner banner--error" role="alert">
        {error}
      </div>
    );
  if (!order) return null;

  const editable = order.status === 'new' && ['sales', 'manager', 'admin'].includes(role);
  const canDelete = ['new', 'invoiced', 'cancelled'].includes(order.status) && ['sales', 'manager', 'admin'].includes(role);
  const totals = orderTotals(lines, order.shipping_fee, order.taxes);
  const actionLabel = { invoice: 'orders.action_invoice', ship: 'orders.action_ship', close: 'orders.action_close', cancel: 'orders.action_cancel' };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/orders" className="back-link">
            ← {t('orders.title')}
          </Link>
          <h1 className="page-title">
            {order.order_number} <StatusBadge domain="order" status={order.status} />
          </h1>
        </div>
        <div className="page-actions">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              className={`btn ${a.key === 'cancel' ? 'btn--danger' : 'btn--primary'}`}
              disabled={!a.enabled || busy}
              title={a.reason ? t(a.reason) : undefined}
              onClick={() => runAction(a.key)}
            >
              {t(actionLabel[a.key])}
            </button>
          ))}
          {canDelete && (
            <button type="button" className="btn btn--ghost text-danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
              {t('common.delete')}
            </button>
          )}
        </div>
      </div>

      {shipOpen && (
        <section className="panel ship-panel">
          <h2 className="panel-title">{t('orders.ship_title')}</h2>
          <div className="form-grid">
            <FormField label={t('orders.shipper')} required>
              <LookupSelect
                value={shipper ? shipper.id : ''}
                valueLabel={shipper ? shipper.label : ''}
                fetchOptions={async (q) => {
                  const parts = ["company_type ~ 'shipper'"];
                  if (q) parts.push(pb.filter('company_name ~ {:q}', { q }));
                  const r = await pb.collection('companies').getList(1, 20, { filter: parts.join(' && '), sort: 'company_name' });
                  return r.items.map((c) => ({ id: c.id, label: c.company_name }));
                }}
                onChange={setShipper}
              />
            </FormField>
            <FormField label={t('orders.shipping_fee')} htmlFor="ship-fee">
              <input
                id="ship-fee"
                className="input input--num"
                type="number"
                min="0"
                step="0.01"
                value={shipFee}
                onChange={(e) => setShipFee(e.target.value)}
              />
            </FormField>
          </div>
          <div className="form-footer">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={doShip}>
              {t('orders.ship_go')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setShipOpen(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </section>
      )}

      <div className="detail-grid">
        <div className="detail-field">
          <div className="detail-label">{t('orders.customer')}</div>
          <div className="detail-value">
            {order.expand?.customer ? (
              <Link to={`/companies/${order.customer}`}>{order.expand.customer.company_name}</Link>
            ) : (
              '—'
            )}
          </div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('orders.employee')}</div>
          <div className="detail-value">
            {order.expand?.employee
              ? `${order.expand.employee.first_name || ''} ${order.expand.employee.last_name || ''}`.trim()
              : '—'}
          </div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('orders.order_date')}</div>
          <div className="detail-value">{formatDate(order.order_date, lang, 'long') || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('orders.invoice_date')}</div>
          <div className="detail-value">{formatDate(order.invoice_date, lang, 'long') || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('orders.shipped_date')}</div>
          <div className="detail-value">{formatDate(order.shipped_date, lang, 'long') || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('orders.shipper')}</div>
          <div className="detail-value">{order.expand?.shipper?.company_name || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('orders.payment_method')}</div>
          <div className="detail-value">{order.payment_method ? t(`orders.pm_${order.payment_method}`) : '—'}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('common.notes')}</div>
          <div className="detail-value">{order.notes || '—'}</div>
        </div>
      </div>

      <section className="lines-section">
        <h2 className="section-title">{t('orders.lines')}</h2>
        <div className="nw-table-wrap nw-table-wrap--always">
          <table className="nw-table">
            <thead>
              <tr>
                <th>{t('orders.product')}</th>
                <th className="nw-table-th--right">{t('common.quantity')}</th>
                <th className="nw-table-th--right">{t('orders.unit_price')}</th>
                <th className="nw-table-th--right">{t('orders.discount')}</th>
                <th className="nw-table-th--right">{t('orders.line_total')}</th>
                <th>{t('common.status')}</th>
                {editable && <th className="nw-table-th--right">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="nw-table-row">
                  <td>
                    {l.expand?.product ? `${l.expand.product.product_code} · ${l.expand.product.product_name}` : ''}
                  </td>
                  <td className="nw-table-td--right">
                    {editLineId === l.id ? (
                      <input
                        className="input input--num input--inline"
                        type="number"
                        min="1"
                        step="1"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                      />
                    ) : (
                      l.quantity
                    )}
                  </td>
                  <td className="nw-table-td--right">
                    {editLineId === l.id ? (
                      <input
                        className="input input--num input--inline"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                      />
                    ) : (
                      formatMoney(l.unit_price, lang)
                    )}
                  </td>
                  <td className="nw-table-td--right">{l.discount ? `${Math.round(l.discount * 100)}%` : '—'}</td>
                  <td className="nw-table-td--right">{formatMoney(lineTotal(l), lang)}</td>
                  <td>
                    <StatusBadge domain="line" status={l.status} />
                    {l.status === 'no_stock' && editable && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => navigate(`/purchase-orders/new?product=${l.product}&qty=${l.quantity}`)}
                      >
                        {t('orders.create_po_for_line')}
                      </button>
                    )}
                  </td>
                  {editable && (
                    <td className="nw-table-td--right">
                      {editLineId === l.id ? (
                        <>
                          <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => saveEditLine(l)}>
                            {t('common.save')}
                          </button>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditLineId(null)}>
                            {t('common.cancel')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => startEditLine(l)}>
                            {t('common.edit')}
                          </button>
                          <button type="button" className="btn btn--ghost btn--sm text-danger" disabled={busy} onClick={() => removeLine(l)}>
                            {t('common.delete')}
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={editable ? 7 : 6} className="nw-table-empty">
                    {t('orders.err_no_lines')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editable && (
          <form className="addline" onSubmit={addLine}>
            <div className="addline-product">
              <LookupSelect
                value={newProduct ? newProduct.id : ''}
                valueLabel={newProduct ? newProduct.label : ''}
                placeholder={t('orders.add_line')}
                fetchOptions={fetchProducts}
                onChange={(opt) => {
                  setNewProduct(opt);
                  if (opt && opt.record) setNewPrice(String(opt.record.list_price ?? ''));
                }}
              />
            </div>
            <input
              className="input input--num addline-qty"
              type="number"
              min="1"
              step="1"
              aria-label={t('common.quantity')}
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
            />
            <input
              className="input input--num addline-price"
              type="number"
              min="0"
              step="0.01"
              aria-label={t('orders.unit_price')}
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
            <button type="submit" className="btn btn--secondary" disabled={!newProduct || busy}>
              {t('common.add')}
            </button>
          </form>
        )}

        <div className="totals">
          <div className="totals-row">
            <span>{t('common.subtotal')}</span>
            <span>{formatMoney(totals.subtotal, lang)}</span>
          </div>
          <div className="totals-row">
            <span>{t('orders.shipping_fee')}</span>
            <span>{formatMoney(totals.shippingFee, lang)}</span>
          </div>
          <div className="totals-row">
            <span>{t('orders.taxes')}</span>
            <span>{formatMoney(totals.taxes, lang)}</span>
          </div>
          <div className="totals-row totals-row--grand">
            <span>{t('common.total')}</span>
            <span>{formatMoney(totals.total, lang)}</span>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmCancel}
        danger
        body={t('orders.cancel_confirm', { number: order.order_number })}
        confirmLabel={t('orders.action_cancel')}
        onConfirm={doCancel}
        onCancel={() => setConfirmCancel(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        danger
        body={t('orders.delete_confirm', { number: order.order_number })}
        confirmLabel={t('common.delete')}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
