import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, Inbox, Send, XCircle } from 'lucide-react';
import { pb, errMsg, currentRole } from '../pb';
import { useT } from '../i18n/index.jsx';
import { formatDate, formatMoney, visiblePoActions, canReceive } from '../lib/calc';
import StatusBadge from '../components/StatusBadge.jsx';
import LookupSelect from '../components/LookupSelect.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import SegmentedProgress from '../components/charts/SegmentedProgress.jsx';

const ACTION_ICONS = { submit: Send, approve: BadgeCheck, close: CheckCircle2, cancel: XCircle };

function personName(rec) {
  if (!rec) return '—';
  return `${rec.first_name || ''} ${rec.last_name || ''}`.trim() || rec.username || '—';
}

export default function PODetail() {
  const { id } = useParams();
  const { t, lang } = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const role = currentRole();

  const [po, setPo] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [newProduct, setNewProduct] = useState(null);
  const [newQty, setNewQty] = useState(1);
  const [newCost, setNewCost] = useState('');
  const [editLineId, setEditLineId] = useState(null);
  const [editQty, setEditQty] = useState(1);
  const [editCost, setEditCost] = useState(0);

  const load = useCallback(async () => {
    try {
      const [rec, lns] = await Promise.all([
        pb.collection('purchase_orders').getOne(id, { expand: 'supplier,created_by,approved_by' }),
        pb.collection('purchase_order_details').getList(1, 200, {
          filter: pb.filter('purchase_order = {:p}', { p: id }),
          sort: 'created',
          expand: 'product',
        }),
      ]);
      setPo(rec);
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
  }, [load]);

  const patchStatus = async (status) => {
    setBusy(true);
    try {
      await pb.collection('purchase_orders').update(id, { status });
      await load();
      toast(t('common.saved'), 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const actions = visiblePoActions(po, lines, role);
  const actionLabel = {
    submit: 'po.action_submit',
    approve: 'po.action_approve',
    close: 'po.action_close',
    cancel: 'po.action_cancel',
  };
  const actionStatus = { submit: 'submitted', approve: 'approved', close: 'closed' };

  const runAction = (key) => {
    if (key === 'cancel') setConfirmCancel(true);
    else patchStatus(actionStatus[key]);
  };

  const receiveLine = async (l) => {
    setBusy(true);
    try {
      const now = new Date().toISOString().replace('T', ' ');
      await pb.collection('purchase_order_details').update(l.id, { date_received: now });
      await load();
      toast(t('po.receive_done'), 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
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
      sub: `${t('products.standard_cost')}: ${formatMoney(p.standard_cost, lang)}`,
      record: p,
    }));
  };

  const addLine = async (e) => {
    e.preventDefault();
    if (!newProduct) return;
    setBusy(true);
    try {
      await pb.collection('purchase_order_details').create({
        purchase_order: id,
        product: newProduct.id,
        quantity: Number(newQty) || 1,
        unit_cost: newCost === '' ? undefined : Number(newCost),
      });
      setNewProduct(null);
      setNewQty(1);
      setNewCost('');
      await load();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveEditLine = async (l) => {
    setBusy(true);
    try {
      await pb.collection('purchase_order_details').update(l.id, {
        quantity: Number(editQty) || 1,
        unit_cost: Number(editCost) || 0,
      });
      setEditLineId(null);
      await load();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeLine = async (l) => {
    setBusy(true);
    try {
      await pb.collection('purchase_order_details').delete(l.id);
      await load();
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
  if (!po) return null;

  const editable = po.status === 'new' && ['purchasing', 'manager', 'admin'].includes(role);
  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0);
  const total = subtotal + (Number(po.shipping_fee) || 0) + (Number(po.taxes) || 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/purchase-orders" className="back-link">
            ← {t('po.title')}
          </Link>
          <h1 className="page-title">
            {po.po_number} <StatusBadge domain="po" status={po.status} />
          </h1>
        </div>
        <div className="page-actions">
          {actions.map((a) => {
            const Icon = ACTION_ICONS[a.key];
            return (
              <button
                key={a.key}
                type="button"
                className={`btn ${a.key === 'cancel' ? 'btn--danger' : 'btn--primary'}`}
                disabled={!a.enabled || busy}
                title={a.reason ? t(a.reason) : undefined}
                onClick={() => runAction(a.key)}
              >
                {Icon && <Icon aria-hidden="true" />}
                {t(actionLabel[a.key])}
              </button>
            );
          })}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-field">
          <div className="detail-label">{t('po.supplier')}</div>
          <div className="detail-value">{po.expand?.supplier?.company_name || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('po.created_by')}</div>
          <div className="detail-value">{personName(po.expand?.created_by)}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('po.submitted_date')}</div>
          <div className="detail-value">{formatDate(po.submitted_date, lang, 'long') || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('po.approved_by')}</div>
          <div className="detail-value">
            {personName(po.expand?.approved_by)}
            {po.approved_date ? ` · ${formatDate(po.approved_date, lang)}` : ''}
          </div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('po.expected_date')}</div>
          <div className="detail-value">{formatDate(po.expected_date, lang, 'long') || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">{t('common.notes')}</div>
          <div className="detail-value">{po.notes || '—'}</div>
        </div>
      </div>

      <section className="lines-section">
        <h2 className="section-title">{t('po.lines')}</h2>
        {lines.length > 0 &&
          ['submitted', 'approved', 'closed'].includes(po.status) &&
          (() => {
            const ordered = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
            const received = lines.reduce((s, l) => s + (l.posted_to_inventory ? Number(l.quantity) || 0 : 0), 0);
            if (ordered <= 0) return null;
            return (
              <SegmentedProgress
                label={t('po.receiving_progress')}
                pct={(received / ordered) * 100}
                segments={[
                  { value: received, color: 'var(--color-green-vivid)', label: t('reports.received') },
                  { value: ordered - received, color: 'var(--color-amber)', label: t('reports.outstanding') },
                ]}
              />
            );
          })()}
        <div className="nw-table-wrap nw-table-wrap--always">
          <table className="nw-table">
            <thead>
              <tr>
                <th>{t('orders.product')}</th>
                <th className="nw-table-th--right">{t('common.quantity')}</th>
                <th className="nw-table-th--right">{t('po.unit_cost')}</th>
                <th className="nw-table-th--right">{t('orders.line_total')}</th>
                <th>{t('common.status')}</th>
                {(editable || po.status === 'approved') && <th className="nw-table-th--right">{t('common.actions')}</th>}
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
                        value={editCost}
                        onChange={(e) => setEditCost(e.target.value)}
                      />
                    ) : (
                      formatMoney(l.unit_cost, lang)
                    )}
                  </td>
                  <td className="nw-table-td--right">
                    {formatMoney((Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), lang)}
                  </td>
                  <td>
                    {l.posted_to_inventory ? (
                      <span className="type-chip type-chip--success">
                        {t('po.posted')} · {formatDate(l.date_received, lang)}
                      </span>
                    ) : (
                      <span className="type-chip">{t('reports.outstanding')}</span>
                    )}
                  </td>
                  {(editable || po.status === 'approved') && (
                    <td className="nw-table-td--right">
                      {canReceive(po, l, role) && (
                        <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => receiveLine(l)}>
                          <Inbox aria-hidden="true" />
                          {t('po.receive')}
                        </button>
                      )}
                      {editable &&
                        (editLineId === l.id ? (
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
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => {
                                setEditLineId(l.id);
                                setEditQty(l.quantity);
                                setEditCost(l.unit_cost);
                              }}
                            >
                              {t('common.edit')}
                            </button>
                            <button type="button" className="btn btn--ghost btn--sm text-danger" disabled={busy} onClick={() => removeLine(l)}>
                              {t('common.delete')}
                            </button>
                          </>
                        ))}
                    </td>
                  )}
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={6} className="nw-table-empty">
                    {t('po.err_no_lines')}
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
                placeholder={t('po.add_line')}
                fetchOptions={fetchProducts}
                onChange={(opt) => {
                  setNewProduct(opt);
                  if (opt && opt.record) setNewCost(String(opt.record.standard_cost ?? ''));
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
              aria-label={t('po.unit_cost')}
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
            />
            <button type="submit" className="btn btn--secondary" disabled={!newProduct || busy}>
              {t('common.add')}
            </button>
          </form>
        )}

        <div className="totals">
          <div className="totals-row">
            <span>{t('common.subtotal')}</span>
            <span>{formatMoney(subtotal, lang)}</span>
          </div>
          <div className="totals-row">
            <span>{t('orders.shipping_fee')}</span>
            <span>{formatMoney(po.shipping_fee, lang)}</span>
          </div>
          <div className="totals-row">
            <span>{t('orders.taxes')}</span>
            <span>{formatMoney(po.taxes, lang)}</span>
          </div>
          <div className="totals-row totals-row--grand">
            <span>{t('common.total')}</span>
            <span>{formatMoney(total, lang)}</span>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmCancel}
        danger
        body={t('po.cancel_confirm', { number: po.po_number })}
        confirmLabel={t('po.action_cancel')}
        onConfirm={() => {
          setConfirmCancel(false);
          patchStatus('cancelled');
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
