import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../pb';
import { useT } from '../i18n/index.jsx';
import { formatDate } from '../lib/calc';
import DataTable from '../components/DataTable.jsx';
import LookupSelect from '../components/LookupSelect.jsx';

const TYPES = ['purchased', 'sold', 'on_hold', 'waiting'];

export default function Transactions() {
  const { t, lang } = useT();
  const [typeFilter, setTypeFilter] = useState('');
  const [productFilter, setProductFilter] = useState(null); // {id,label}

  const fetchPage = useCallback(
    async ({ page, perPage, sort }) => {
      const parts = [];
      if (typeFilter) parts.push(pb.filter('transaction_type = {:t}', { t: typeFilter }));
      if (productFilter) parts.push(pb.filter('product = {:p}', { p: productFilter.id }));
      return pb.collection('inventory_transactions').getList(page, perPage, {
        filter: parts.join(' && '),
        sort: sort || '-created',
        expand: 'product,related_order,related_purchase_order',
      });
    },
    [typeFilter, productFilter]
  );

  const columns = [
    {
      key: 'created',
      label: t('common.date'),
      sort: 'created',
      render: (tx) => formatDate(tx.transaction_date || tx.created, lang),
    },
    {
      key: 'transaction_type',
      label: t('inv.type'),
      render: (tx) => <span className={`type-chip type-chip--tx-${tx.transaction_type}`}>{t(`inv.type_${tx.transaction_type}`)}</span>,
    },
    {
      key: 'product',
      label: t('orders.product'),
      render: (tx) =>
        tx.expand?.product ? `${tx.expand.product.product_code} · ${tx.expand.product.product_name}` : '',
    },
    {
      key: 'quantity',
      label: t('common.quantity'),
      sort: 'quantity',
      align: 'right',
      render: (tx) => (tx.transaction_type === 'sold' ? `−${tx.quantity}` : tx.transaction_type === 'purchased' ? `+${tx.quantity}` : tx.quantity),
    },
    {
      key: 'related',
      label: t('inv.related'),
      render: (tx) =>
        tx.expand?.related_order ? (
          <Link to={`/orders/${tx.related_order}`} onClick={(e) => e.stopPropagation()}>
            {tx.expand.related_order.order_number}
          </Link>
        ) : tx.expand?.related_purchase_order ? (
          <Link to={`/purchase-orders/${tx.related_purchase_order}`} onClick={(e) => e.stopPropagation()}>
            {tx.expand.related_purchase_order.po_number}
          </Link>
        ) : (
          ''
        ),
    },
    { key: 'comments', label: t('inv.comment') },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/inventory" className="back-link">
            ← {t('inv.onhand_title')}
          </Link>
          <h1 className="page-title">{t('inv.tx_title')}</h1>
        </div>
        <div className="page-actions">
          <Link to="/inventory/adjustment" className="btn btn--primary">
            {t('inv.adjust_action')}
          </Link>
        </div>
      </div>

      <DataTable
        columns={columns}
        fetchPage={fetchPage}
        defaultSort={{ key: 'created', dir: 'desc' }}
        searchable={false}
        deps={[typeFilter, productFilter ? productFilter.id : '']}
        filters={
          <>
            <select
              className="input data-table-filter"
              aria-label={t('inv.type_filter')}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">{t('common.all')}</option>
              {TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`inv.type_${tp}`)}
                </option>
              ))}
            </select>
            <div className="data-table-filter data-table-filter--lookup">
              <LookupSelect
                value={productFilter ? productFilter.id : ''}
                valueLabel={productFilter ? productFilter.label : ''}
                placeholder={t('inv.product_filter')}
                fetchOptions={async (q) => {
                  const r = await pb.collection('products').getList(1, 20, {
                    filter: q ? pb.filter('(product_code ~ {:q} || product_name ~ {:q})', { q }) : '',
                    sort: 'product_name',
                  });
                  return r.items.map((p) => ({ id: p.id, label: `${p.product_code} · ${p.product_name}` }));
                }}
                onChange={setProductFilter}
              />
            </div>
          </>
        }
        cardTitle={(tx) => (
          <>
            {t(`inv.type_${tx.transaction_type}`)} · {tx.expand?.product?.product_name || ''}
          </>
        )}
        cardBody={(tx) => (
          <>
            <span>
              {t('common.quantity')}: {tx.quantity}
            </span>
            <span>{formatDate(tx.transaction_date || tx.created, lang)}</span>
            {tx.comments && <span>{tx.comments}</span>}
          </>
        )}
      />
    </div>
  );
}
