import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { pb, errMsg, currentUser } from '../pb';
import { useT } from '../i18n/index.jsx';
import FormField from '../components/FormField.jsx';
import LookupSelect from '../components/LookupSelect.jsx';
import { useToast } from '../components/Toast.jsx';

export default function POCreate() {
  const { t } = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const me = currentUser();

  const [supplier, setSupplier] = useState(null);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prefillProduct, setPrefillProduct] = useState(null);
  const prefillQty = Number(searchParams.get('qty')) || 0;

  // Prefill from ?product=&qty= (no-stock order line or product reorder shortcut)
  useEffect(() => {
    const productId = searchParams.get('product');
    if (!productId) return;
    let alive = true;
    pb.collection('products')
      .getOne(productId, { expand: 'supplier' })
      .then((p) => {
        if (!alive) return;
        setPrefillProduct(p);
        if (p.expand?.supplier) {
          setSupplier({ id: p.expand.supplier.id, label: p.expand.supplier.company_name });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSuppliers = async (q) => {
    const parts = ["company_type ~ 'supplier'"];
    if (q) parts.push(pb.filter('company_name ~ {:q}', { q }));
    const r = await pb.collection('companies').getList(1, 20, { filter: parts.join(' && '), sort: 'company_name' });
    return r.items.map((c) => ({ id: c.id, label: c.company_name, sub: c.city || '' }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!supplier) return;
    setError('');
    setSaving(true);
    try {
      const po = await pb.collection('purchase_orders').create({
        supplier: supplier.id,
        created_by: me.id,
        expected_date: expectedDate ? `${expectedDate} 00:00:00` : undefined,
        notes,
      });
      if (prefillProduct && prefillQty > 0) {
        try {
          await pb.collection('purchase_order_details').create({
            purchase_order: po.id,
            product: prefillProduct.id,
            quantity: prefillQty,
            unit_cost: prefillProduct.standard_cost || 0,
          });
        } catch (err) {
          toast(errMsg(err), 'error');
        }
      }
      navigate(`/purchase-orders/${po.id}`, { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/purchase-orders" className="back-link">
            ← {t('po.title')}
          </Link>
          <h1 className="page-title">{t('po.create_title')}</h1>
        </div>
      </div>

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}

      {prefillProduct && (
        <div className="banner banner--info">
          {prefillProduct.product_code} · {prefillProduct.product_name}
          {prefillQty > 0 ? ` × ${prefillQty}` : ''}
        </div>
      )}

      <form onSubmit={save}>
        <div className="form-grid">
          <FormField label={t('po.supplier')} required>
            <LookupSelect
              value={supplier ? supplier.id : ''}
              valueLabel={supplier ? supplier.label : ''}
              fetchOptions={fetchSuppliers}
              onChange={setSupplier}
            />
          </FormField>
          <FormField label={t('po.expected_date')} htmlFor="po-expected">
            <input
              id="po-expected"
              className="input"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </FormField>
          <FormField label={t('common.notes')} htmlFor="po-notes">
            <textarea id="po-notes" className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>
        <div className="form-footer">
          <button type="submit" className="btn btn--primary" disabled={saving || !supplier}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/purchase-orders')}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
