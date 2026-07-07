import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { pb, errMsg } from '../pb';
import { useT } from '../i18n/index.jsx';
import { formatDate } from '../lib/calc';
import FormField from '../components/FormField.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';

const TYPES = ['customer', 'supplier', 'shipper'];
const EMPTY = {
  company_name: '',
  company_type: [],
  contact_name: '',
  contact_title: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state_province: '',
  postal_code: '',
  country: '',
  tax_id: '',
  website: '',
  notes: '',
};

export default function CompanyDetail() {
  const { id } = useParams();
  const isNew = !id;
  const { t, lang } = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pos, setPos] = useState([]);

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    setLoading(true);
    pb.collection('companies')
      .getOne(id)
      .then((rec) => {
        if (!alive) return;
        setForm({ ...EMPTY, ...rec });
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(errMsg(err));
        setLoading(false);
      });
    pb.collection('orders')
      .getList(1, 10, { filter: pb.filter('customer = {:c} || shipper = {:c}', { c: id }), sort: '-created' })
      .then((r) => alive && setOrders(r.items))
      .catch(() => {});
    pb.collection('purchase_orders')
      .getList(1, 10, { filter: pb.filter('supplier = {:c}', { c: id }), sort: '-created' })
      .then((r) => alive && setPos(r.items))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, isNew]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleType = (tp) =>
    setForm((f) => ({
      ...f,
      company_type: f.company_type.includes(tp) ? f.company_type.filter((x) => x !== tp) : [...f.company_type, tp],
    }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const body = { ...form };
    delete body.id;
    delete body.created;
    delete body.updated;
    delete body.collectionId;
    delete body.collectionName;
    try {
      if (isNew) {
        const rec = await pb.collection('companies').create(body);
        toast(t('common.saved'), 'success');
        navigate(`/companies/${rec.id}`, { replace: true });
      } else {
        await pb.collection('companies').update(id, body);
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
      await pb.collection('companies').delete(id);
      toast(t('common.deleted'), 'success');
      navigate('/companies');
    } catch (err) {
      setConfirmDelete(false);
      toast(errMsg(err), 'error');
    }
  };

  if (loading) return <div className="skeleton page-skeleton" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/companies" className="back-link">
            ← {t('companies.title')}
          </Link>
          <h1 className="page-title">{isNew ? t('companies.create_title') : form.company_name}</h1>
        </div>
        {!isNew && (
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

      <form onSubmit={save}>
        <div className="form-grid">
          <FormField label={t('companies.name')} required htmlFor="c-name">
            <input id="c-name" className="input" value={form.company_name} onChange={set('company_name')} required />
          </FormField>
          <FormField label={t('companies.types')} required>
            <div className="checkbox-row">
              {TYPES.map((tp) => (
                <label key={tp} className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.company_type.includes(tp)}
                    onChange={() => toggleType(tp)}
                  />
                  {t(`companies.type_${tp}`)}
                </label>
              ))}
            </div>
          </FormField>
          <FormField label={t('companies.contact')} htmlFor="c-contact">
            <input id="c-contact" className="input" value={form.contact_name} onChange={set('contact_name')} />
          </FormField>
          <FormField label={t('companies.contact_title')} htmlFor="c-ctitle">
            <input id="c-ctitle" className="input" value={form.contact_title} onChange={set('contact_title')} />
          </FormField>
          <FormField label={t('companies.email')} htmlFor="c-email">
            <input id="c-email" className="input" type="email" value={form.email} onChange={set('email')} />
          </FormField>
          <FormField label={t('companies.phone')} htmlFor="c-phone">
            <input id="c-phone" className="input" value={form.phone} onChange={set('phone')} />
          </FormField>
          <FormField label={t('companies.address')} htmlFor="c-address">
            <input id="c-address" className="input" value={form.address} onChange={set('address')} />
          </FormField>
          <FormField label={t('companies.city')} htmlFor="c-city">
            <input id="c-city" className="input" value={form.city} onChange={set('city')} />
          </FormField>
          <FormField label={t('companies.state')} htmlFor="c-state">
            <input id="c-state" className="input" value={form.state_province} onChange={set('state_province')} />
          </FormField>
          <FormField label={t('companies.postal_code')} htmlFor="c-postal">
            <input id="c-postal" className="input" value={form.postal_code} onChange={set('postal_code')} />
          </FormField>
          <FormField label={t('companies.country')} htmlFor="c-country">
            <input id="c-country" className="input" value={form.country} onChange={set('country')} />
          </FormField>
          <FormField label={t('companies.tax_id')} htmlFor="c-tax">
            <input id="c-tax" className="input" value={form.tax_id} onChange={set('tax_id')} />
          </FormField>
          <FormField label={t('companies.website')} htmlFor="c-web">
            <input id="c-web" className="input" type="url" value={form.website} onChange={set('website')} />
          </FormField>
          <FormField label={t('common.notes')} htmlFor="c-notes">
            <textarea id="c-notes" className="input" rows={3} value={form.notes} onChange={set('notes')} />
          </FormField>
        </div>
        <div className="form-footer">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/companies')}>
            {t('common.cancel')}
          </button>
        </div>
      </form>

      {!isNew && (
        <div className="related-grid">
          <section className="panel">
            <h2 className="panel-title">{t('companies.related_orders')}</h2>
            {orders.length === 0 ? (
              <div className="panel-empty">{t('companies.none_related')}</div>
            ) : (
              <ul className="panel-list">
                {orders.map((o) => (
                  <li key={o.id} className="panel-row">
                    <Link to={`/orders/${o.id}`} className="panel-link">
                      <span className="panel-main">{o.order_number}</span>
                      <span className="panel-sub">
                        <StatusBadge domain="order" status={o.status} /> {formatDate(o.order_date, lang)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel">
            <h2 className="panel-title">{t('companies.related_pos')}</h2>
            {pos.length === 0 ? (
              <div className="panel-empty">{t('companies.none_related')}</div>
            ) : (
              <ul className="panel-list">
                {pos.map((po) => (
                  <li key={po.id} className="panel-row">
                    <Link to={`/purchase-orders/${po.id}`} className="panel-link">
                      <span className="panel-main">{po.po_number}</span>
                      <span className="panel-sub">
                        <StatusBadge domain="po" status={po.status} /> {formatDate(po.created, lang)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        danger
        body={t('companies.delete_confirm', { name: form.company_name })}
        confirmLabel={t('common.delete')}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
