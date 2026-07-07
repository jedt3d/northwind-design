import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pb } from '../pb';
import { useT } from '../i18n/index.jsx';
import { fetchStockMap } from '../lib/stock';
import DataTable from '../components/DataTable.jsx';

export default function InventoryOnHand() {
  const { t } = useT();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [belowOnly, setBelowOnly] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([
      pb.collection('products').getList(1, 500, { sort: 'product_name' }),
      fetchStockMap(),
    ])
      .then(([prods, stock]) => {
        if (!alive) return;
        setRows(
          prods.items.map((p) => {
            const s = stock[p.id] || { onHand: 0, onHold: 0, available: 0 };
            return { ...p, ...s, low: !p.discontinued && (p.reorder_level || 0) > 0 && s.available < p.reorder_level };
          })
        );
      })
      .catch((err) => {
        if (alive) setError(err?.message || String(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  // Client-side "server" for DataTable: filter + sort + slice in memory.
  const fetchPage = useCallback(
    async ({ page, perPage, search, sort }) => {
      const all = rows || [];
      const q = (search || '').toLowerCase();
      let filtered = all.filter(
        (r) =>
          (!q || r.product_code.toLowerCase().includes(q) || r.product_name.toLowerCase().includes(q)) &&
          (!belowOnly || r.low)
      );
      if (sort) {
        const desc = sort.startsWith('-');
        const key = desc ? sort.slice(1) : sort;
        filtered = [...filtered].sort((a, b) => {
          const av = a[key];
          const bv = b[key];
          const cmp = typeof av === 'number' ? av - bv : String(av || '').localeCompare(String(bv || ''));
          return desc ? -cmp : cmp;
        });
      }
      const totalItems = filtered.length;
      return {
        items: filtered.slice((page - 1) * perPage, page * perPage),
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / perPage)),
      };
    },
    [rows, belowOnly]
  );

  const columns = [
    { key: 'product_code', label: t('products.code'), sort: 'product_code' },
    { key: 'product_name', label: t('products.name'), sort: 'product_name' },
    { key: 'onHand', label: t('products.on_hand'), sort: 'onHand', align: 'right' },
    { key: 'onHold', label: t('products.allocated'), sort: 'onHold', align: 'right' },
    { key: 'available', label: t('products.available'), sort: 'available', align: 'right' },
    { key: 'reorder_level', label: t('products.reorder_level'), sort: 'reorder_level', align: 'right' },
    {
      key: 'flag',
      label: '',
      render: (r) => (r.low ? <span className="type-chip type-chip--warn">{t('products.low_stock')}</span> : null),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('inv.onhand_title')}</h1>
        <div className="page-actions">
          <Link to="/inventory/transactions" className="btn btn--secondary">
            {t('inv.tx_title')}
          </Link>
          <Link to="/inventory/adjustment" className="btn btn--primary">
            {t('inv.adjust_action')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}

      {rows === null ? (
        <div className="skeleton page-skeleton" />
      ) : (
        <DataTable
          columns={columns}
          fetchPage={fetchPage}
          defaultSort={{ key: 'product_name', dir: 'asc' }}
          searchPlaceholder={t('inv.search_ph')}
          deps={[rows, belowOnly]}
          filters={
            <label className="checkbox data-table-filter">
              <input type="checkbox" checked={belowOnly} onChange={(e) => setBelowOnly(e.target.checked)} />
              {t('inv.below_reorder_only')}
            </label>
          }
          onRowClick={(r) => navigate(`/products/${r.id}`)}
          rowClass={(r) => (r.low ? 'nw-row--warn' : r.discontinued ? 'nw-row--muted' : '')}
          cardTitle={(r) => `${r.product_code} · ${r.product_name}`}
          cardBody={(r) => (
            <>
              <span>
                {t('products.on_hand')}: {r.onHand}
              </span>
              <span>
                {t('products.available')}: {r.available}
              </span>
              <span>
                {t('products.reorder_level')}: {r.reorder_level ?? 0}
              </span>
            </>
          )}
        />
      )}
    </div>
  );
}
