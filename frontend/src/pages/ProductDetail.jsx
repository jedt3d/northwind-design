import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { pb, errMsg, currentUser, currentRole } from '../pb';
import { useT } from '../i18n/index.jsx';
import { suggestedReorderQty } from '../lib/calc';
import { fetchStockFor, fetchOnOrder } from '../lib/stock';
import FormField from '../components/FormField.jsx';
import LookupSelect from '../components/LookupSelect.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';

const EMPTY = {
  product_code: '',
  product_name: '',
  description: '',
  category: '',
  supplier: '',
  list_price: 0,
  standard_cost: 0,
  reorder_level: 0,
  target_level: 0,
  quantity_per_unit: '',
  discontinued: false,
};

export default function ProductDetail() {
  const { id } = useParams();
  const isNew = !id;
  const { t } = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const role = currentRole();
  const [form, setForm] = useState(EMPTY);
  const [labels, setLabels] = useState({ category: '', supplier: '' });
  const [stock, setStock] = useState(null);
  const [onOrder, setOnOrder] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    setLoading(true);
    pb.collection('products')
      .getOne(id, { expand: 'category,supplier' })
      .then((rec) => {
        if (!alive) return;
        setForm({ ...EMPTY, ...rec });
        setLabels({
          category: rec.expand?.category?.category_name || '',
          supplier: rec.expand?.supplier?.company_name || '',
        });
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(errMsg(err));
        setLoading(false);
      });
    fetchStockFor(id)
      .then((s) => alive && setStock(s))
      .catch(() => {});
    fetchOnOrder(id)
      .then((n) => alive && setOnOrder(n))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, isNew]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value === '' ? '' : Number(e.target.value) }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const body = {
      product_code: form.product_code,
      product_name: form.product_name,
      description: form.description,
      category: form.category,
      supplier: form.supplier || '',
      list_price: Number(form.list_price) || 0,
      standard_cost: Number(form.standard_cost) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      target_level: Number(form.target_level) || 0,
      quantity_per_unit: form.quantity_per_unit,
      discontinued: !!form.discontinued,
    };
    try {
      if (isNew) {
        const rec = await pb.collection('products').create(body);
        toast(t('common.saved'), 'success');
        navigate(`/products/${rec.id}`, { replace: true });
      } else {
        await pb.collection('products').update(id, body);
        toast(t('common.saved'), 'success');
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await pb.collection('products').delete(id);
      toast(t('common.deleted'), 'success');
      navigate('/products');
    } catch (err) {
      setConfirmDelete(false);
      toast(errMsg(err), 'error');
    }
  };

  const available = stock ? stock.available : 0;
  const belowReorder = !isNew && stock && (form.reorder_level || 0) > 0 && available < form.reorder_level;
  const suggestedQty = suggestedReorderQty(form, available);

  const reorder = async () => {
    if (!form.supplier) {
      toast(t('products.no_supplier'), 'error');
      return;
    }
    setReordering(true);
    try {
      const me = currentUser();
      const po = await pb.collection('purchase_orders').create({
        supplier: form.supplier,
        created_by: me.id,
        notes: `Reorder ${form.product_code} ${form.product_name}`,
      });
      await pb.collection('purchase_order_details').create({
        purchase_order: po.id,
        product: id,
        quantity: Math.max(1, suggestedQty),
        unit_cost: Number(form.standard_cost) || 0,
      });
      navigate(`/purchase-orders/${po.id}`);
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setReordering(false);
    }
  };

  if (loading) return <div className="skeleton page-skeleton" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/products" className="back-link">
            ← {t('products.title')}
          </Link>
          <h1 className="page-title">
            {isNew ? t('products.create_title') : `${form.product_code} · ${form.product_name}`}
          </h1>
        </div>
        {!isNew && role === 'admin' && (
          <div className="page-actions">
            <button type="button" className="btn btn--danger" onClick={() => setConfirmDelete(true)}>
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}

      {!isNew && (
        <section className="panel stock-panel">
          <h2 className="panel-title">{t('products.stock_title')}</h2>
          <div className="kpi-row">
            <div className="kpi">
              <div className="kpi-caption">{t('products.on_hand')}</div>
              <div className="kpi-value">{stock ? stock.onHand : '…'}</div>
            </div>
            <div className="kpi">
              <div className="kpi-caption">{t('products.allocated')}</div>
              <div className="kpi-value">{stock ? stock.onHold : '…'}</div>
            </div>
            <div className="kpi">
              <div className="kpi-caption">{t('products.available')}</div>
              <div className={`kpi-value${belowReorder ? ' text-danger' : ''}`}>{stock ? available : '…'}</div>
            </div>
            <div className="kpi">
              <div className="kpi-caption">{t('products.on_order')}</div>
              <div className="kpi-value">{onOrder}</div>
            </div>
          </div>
          {belowReorder && (
            <div className="stock-panel-reorder">
              <button type="button" className="btn btn--primary" onClick={reorder} disabled={reordering}>
                {t('products.reorder_action')}
              </button>
              <span className="stock-panel-hint">
                {t('products.reorder_hint', { qty: suggestedQty, supplier: labels.supplier || '—' })}
              </span>
            </div>
          )}
        </section>
      )}

      <form onSubmit={save}>
        <div className="form-grid">
          <FormField label={t('products.code')} required htmlFor="p-code">
            <input id="p-code" className="input" value={form.product_code} onChange={set('product_code')} required />
          </FormField>
          <FormField label={t('products.name')} required htmlFor="p-name">
            <input id="p-name" className="input" value={form.product_name} onChange={set('product_name')} required />
          </FormField>
          <FormField label={t('products.category')} required>
            <LookupSelect
              value={form.category}
              valueLabel={labels.category}
              clearable={false}
              fetchOptions={async (q) => {
                const r = await pb.collection('product_categories').getList(1, 20, {
                  filter: q ? pb.filter('category_name ~ {:q}', { q }) : '',
                  sort: 'category_name',
                });
                return r.items.map((c) => ({ id: c.id, label: c.category_name }));
              }}
              onChange={(opt) => {
                setForm((f) => ({ ...f, category: opt ? opt.id : '' }));
                setLabels((l) => ({ ...l, category: opt ? opt.label : '' }));
              }}
            />
          </FormField>
          <FormField label={t('products.supplier')}>
            <LookupSelect
              value={form.supplier}
              valueLabel={labels.supplier}
              fetchOptions={async (q) => {
                const parts = ["company_type ~ 'supplier'"];
                if (q) parts.push(pb.filter('company_name ~ {:q}', { q }));
                const r = await pb.collection('companies').getList(1, 20, {
                  filter: parts.join(' && '),
                  sort: 'company_name',
                });
                return r.items.map((c) => ({ id: c.id, label: c.company_name, record: c }));
              }}
              onChange={(opt) => {
                setForm((f) => ({ ...f, supplier: opt ? opt.id : '' }));
                setLabels((l) => ({ ...l, supplier: opt ? opt.label : '' }));
              }}
            />
          </FormField>
          <FormField label={t('products.list_price')} required htmlFor="p-price">
            <input
              id="p-price"
              className="input input--num"
              type="number"
              min="0"
              step="0.01"
              value={form.list_price}
              onChange={setNum('list_price')}
              required
            />
          </FormField>
          <FormField label={t('products.standard_cost')} htmlFor="p-cost">
            <input
              id="p-cost"
              className="input input--num"
              type="number"
              min="0"
              step="0.01"
              value={form.standard_cost}
              onChange={setNum('standard_cost')}
            />
          </FormField>
          <FormField label={t('products.reorder_level')} htmlFor="p-reorder">
            <input
              id="p-reorder"
              className="input input--num"
              type="number"
              min="0"
              step="1"
              value={form.reorder_level}
              onChange={setNum('reorder_level')}
            />
          </FormField>
          <FormField label={t('products.target_level')} htmlFor="p-target">
            <input
              id="p-target"
              className="input input--num"
              type="number"
              min="0"
              step="1"
              value={form.target_level}
              onChange={setNum('target_level')}
            />
          </FormField>
          <FormField label={t('products.qty_per_unit')} htmlFor="p-qpu">
            <input id="p-qpu" className="input" value={form.quantity_per_unit} onChange={set('quantity_per_unit')} />
          </FormField>
          <FormField label={t('common.description')} htmlFor="p-desc">
            <textarea id="p-desc" className="input" rows={3} value={form.description} onChange={set('description')} />
          </FormField>
          <FormField>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={!!form.discontinued}
                onChange={(e) => setForm((f) => ({ ...f, discontinued: e.target.checked }))}
              />
              {t('products.discontinued')}
            </label>
          </FormField>
        </div>
        <div className="form-footer">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/products')}>
            {t('common.cancel')}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        danger
        body={t('products.delete_confirm', { name: form.product_name })}
        confirmLabel={t('common.delete')}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
