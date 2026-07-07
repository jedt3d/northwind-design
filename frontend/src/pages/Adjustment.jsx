import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pb, errMsg } from '../pb';
import { useT } from '../i18n/index.jsx';
import { fetchStockFor } from '../lib/stock';
import FormField from '../components/FormField.jsx';
import LookupSelect from '../components/LookupSelect.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Adjustment() {
  const { t } = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [product, setProduct] = useState(null); // {id,label}
  const [stock, setStock] = useState(null);
  const [direction, setDirection] = useState('in');
  const [qty, setQty] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickProduct = async (opt) => {
    setProduct(opt);
    setStock(null);
    if (opt) {
      try {
        setStock(await fetchStockFor(opt.id));
      } catch {
        setStock(null);
      }
    }
  };

  const n = Number(qty) || 0;
  const delta = direction === 'in' ? n : -n;
  const resulting = stock ? stock.available + delta : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!product || n <= 0) return;
    setError('');
    setSaving(true);
    try {
      await pb.collection('inventory_transactions').create({
        transaction_type: direction === 'in' ? 'purchased' : 'sold',
        product: product.id,
        quantity: n,
        comments: comment,
      });
      toast(t('inv.success'), 'success');
      navigate('/inventory/transactions');
    } catch (err) {
      setError(errMsg(err));
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/inventory" className="back-link">
            ← {t('inv.onhand_title')}
          </Link>
          <h1 className="page-title">{t('inv.adjust_title')}</h1>
        </div>
      </div>

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="narrow-form">
        <FormField label={t('orders.product')} required>
          <LookupSelect
            value={product ? product.id : ''}
            valueLabel={product ? product.label : ''}
            fetchOptions={async (q) => {
              const r = await pb.collection('products').getList(1, 20, {
                filter: q ? pb.filter('(product_code ~ {:q} || product_name ~ {:q})', { q }) : '',
                sort: 'product_name',
              });
              return r.items.map((p) => ({ id: p.id, label: `${p.product_code} · ${p.product_name}` }));
            }}
            onChange={pickProduct}
          />
        </FormField>

        <FormField label={t('inv.direction')} required>
          <div className="checkbox-row">
            <label className="radio">
              <input type="radio" name="dir" value="in" checked={direction === 'in'} onChange={() => setDirection('in')} />
              {t('inv.dir_in')}
            </label>
            <label className="radio">
              <input type="radio" name="dir" value="out" checked={direction === 'out'} onChange={() => setDirection('out')} />
              {t('inv.dir_out')}
            </label>
          </div>
        </FormField>

        <FormField label={t('common.quantity')} required htmlFor="adj-qty">
          <input
            id="adj-qty"
            className="input input--num"
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            required
          />
        </FormField>

        <FormField label={t('inv.comment')} required htmlFor="adj-comment">
          <textarea
            id="adj-comment"
            className="input"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
        </FormField>

        {product && stock && (
          <div className="panel adj-preview">
            <div className="totals-row">
              <span>{t('inv.current_available')}</span>
              <span>{stock.available}</span>
            </div>
            <div className="totals-row totals-row--grand">
              <span>{t('inv.resulting_available')}</span>
              <span className={resulting !== null && resulting < 0 ? 'text-danger' : ''}>
                {resulting !== null ? resulting : '—'}
              </span>
            </div>
          </div>
        )}

        <div className="form-footer">
          <button type="submit" className="btn btn--primary" disabled={saving || !product || n <= 0 || !comment.trim()}>
            {saving ? t('common.saving') : t('inv.submit')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/inventory')}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
