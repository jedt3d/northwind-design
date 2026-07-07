import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../pb';
import { useT } from '../i18n/index.jsx';
import { formatMoney } from '../lib/calc';
import { fetchStockMap } from '../lib/stock';
import DataTable from '../components/DataTable.jsx';

export default function ProductsList() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [stockMap, setStockMap] = useState({});

  useEffect(() => {
    let alive = true;
    pb.collection('product_categories')
      .getList(1, 200, { sort: 'category_name' })
      .then((r) => alive && setCategories(r.items))
      .catch(() => {});
    fetchStockMap()
      .then((m) => alive && setStockMap(m))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const fetchPage = useCallback(
    async ({ page, perPage, search, sort }) => {
      const parts = [];
      if (search) parts.push(pb.filter('(product_code ~ {:q} || product_name ~ {:q})', { q: search }));
      if (categoryFilter) parts.push(pb.filter('category = {:c}', { c: categoryFilter }));
      return pb.collection('products').getList(page, perPage, {
        filter: parts.join(' && '),
        sort: sort || 'product_name',
        expand: 'category',
      });
    },
    [categoryFilter]
  );

  const availableOf = (p) => (stockMap[p.id] ? stockMap[p.id].available : 0);
  const isLow = (p) => !p.discontinued && (p.reorder_level || 0) > 0 && availableOf(p) < p.reorder_level;

  const columns = [
    { key: 'product_code', label: t('products.code'), sort: 'product_code' },
    { key: 'product_name', label: t('products.name'), sort: 'product_name' },
    { key: 'category', label: t('products.category'), render: (p) => p.expand?.category?.category_name || '' },
    {
      key: 'list_price',
      label: t('products.list_price'),
      sort: 'list_price',
      align: 'right',
      render: (p) => formatMoney(p.list_price, lang),
    },
    { key: 'available', label: t('products.available'), align: 'right', render: (p) => availableOf(p) },
    {
      key: 'reorder_level',
      label: t('products.reorder_level'),
      sort: 'reorder_level',
      align: 'right',
      render: (p) => p.reorder_level ?? 0,
    },
    {
      key: 'flag',
      label: '',
      render: (p) =>
        p.discontinued ? (
          <span className="type-chip type-chip--muted">{t('products.discontinued')}</span>
        ) : isLow(p) ? (
          <span className="type-chip type-chip--warn">{t('products.low_stock')}</span>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('products.title')}</h1>
        <div className="page-actions">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/products/new')}>
            {t('products.new')}
          </button>
        </div>
      </div>
      <DataTable
        columns={columns}
        fetchPage={fetchPage}
        defaultSort={{ key: 'product_name', dir: 'asc' }}
        searchPlaceholder={t('products.search_ph')}
        deps={[categoryFilter]}
        filters={
          <select
            className="input data-table-filter"
            aria-label={t('products.category_filter')}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category_name}
              </option>
            ))}
          </select>
        }
        onRowClick={(p) => navigate(`/products/${p.id}`)}
        rowClass={(p) => (p.discontinued ? 'nw-row--muted' : isLow(p) ? 'nw-row--warn' : '')}
        cardTitle={(p) => `${p.product_code} · ${p.product_name}`}
        cardBody={(p) => (
          <>
            <span>{p.expand?.category?.category_name || ''}</span>
            <span>
              {t('products.list_price')}: {formatMoney(p.list_price, lang)}
            </span>
            <span>
              {t('products.available')}: {availableOf(p)}
            </span>
          </>
        )}
      />
    </div>
  );
}
