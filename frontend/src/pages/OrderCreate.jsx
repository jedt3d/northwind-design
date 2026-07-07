import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pb, errMsg, currentUser } from '../pb';
import { useT } from '../i18n/index.jsx';
import FormField from '../components/FormField.jsx';
import LookupSelect from '../components/LookupSelect.jsx';
import { useToast } from '../components/Toast.jsx';

export default function OrderCreate() {
  const { t } = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const me = currentUser();
  const [customer, setCustomer] = useState(null); // {id,label}
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ company_name: '', phone: '', email: '' });
  const [creatingCust, setCreatingCust] = useState(false);

  const fetchCustomers = async (q) => {
    const parts = ["company_type ~ 'customer'"];
    if (q) parts.push(pb.filter('company_name ~ {:q}', { q }));
    const r = await pb.collection('companies').getList(1, 20, { filter: parts.join(' && '), sort: 'company_name' });
    return r.items.map((c) => ({ id: c.id, label: c.company_name, sub: c.city || '' }));
  };

  const createCustomer = async (e) => {
    e.preventDefault();
    setCreatingCust(true);
    try {
      const rec = await pb.collection('companies').create({
        company_name: newCust.company_name,
        company_type: ['customer'],
        phone: newCust.phone,
        email: newCust.email || undefined,
      });
      setCustomer({ id: rec.id, label: rec.company_name });
      setShowNewCustomer(false);
      toast(t('common.saved'), 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setCreatingCust(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!customer) return;
    setError('');
    setSaving(true);
    try {
      const rec = await pb.collection('orders').create({
        customer: customer.id,
        employee: me.id,
        order_date: `${orderDate} 00:00:00`,
        notes,
      });
      navigate(`/orders/${rec.id}`, { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/orders" className="back-link">
            ← {t('orders.title')}
          </Link>
          <h1 className="page-title">{t('orders.create_title')}</h1>
        </div>
      </div>

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={save}>
        <div className="form-grid">
          <FormField label={t('orders.customer')} required>
            <LookupSelect
              value={customer ? customer.id : ''}
              valueLabel={customer ? customer.label : ''}
              fetchOptions={fetchCustomers}
              onChange={(opt) => setCustomer(opt)}
              footerAction={{ label: t('orders.new_customer'), onClick: () => setShowNewCustomer(true) }}
            />
          </FormField>
          <FormField label={t('orders.employee')}>
            <input
              className="input"
              value={me ? `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.username : ''}
              disabled
            />
          </FormField>
          <FormField label={t('orders.order_date')} htmlFor="o-date">
            <input
              id="o-date"
              className="input"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </FormField>
          <FormField label={t('common.notes')} htmlFor="o-notes">
            <textarea id="o-notes" className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>
        <div className="form-footer">
          <button type="submit" className="btn btn--primary" disabled={saving || !customer}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/orders')}>
            {t('common.cancel')}
          </button>
        </div>
      </form>

      {showNewCustomer && (
        <div className="modal-backdrop" onClick={() => setShowNewCustomer(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('orders.new_customer')}</h2>
            <form onSubmit={createCustomer}>
              <FormField label={t('companies.name')} required htmlFor="nc-name">
                <input
                  id="nc-name"
                  className="input"
                  value={newCust.company_name}
                  onChange={(e) => setNewCust((f) => ({ ...f, company_name: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label={t('companies.phone')} htmlFor="nc-phone">
                <input
                  id="nc-phone"
                  className="input"
                  value={newCust.phone}
                  onChange={(e) => setNewCust((f) => ({ ...f, phone: e.target.value }))}
                />
              </FormField>
              <FormField label={t('companies.email')} htmlFor="nc-email">
                <input
                  id="nc-email"
                  className="input"
                  type="email"
                  value={newCust.email}
                  onChange={(e) => setNewCust((f) => ({ ...f, email: e.target.value }))}
                />
              </FormField>
              <div className="modal-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowNewCustomer(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn--primary" disabled={creatingCust}>
                  {t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
