import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../pb';
import { useT } from '../i18n/index.jsx';
import { formatDate } from '../lib/calc';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUSES = ['new', 'invoiced', 'shipped', 'closed', 'cancelled'];

export default function OrdersList() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPage = useCallback(
    async ({ page, perPage, search, sort }) => {
      const parts = [];
      if (search) parts.push(pb.filter('(order_number ~ {:q} || customer.company_name ~ {:q})', { q: search }));
      if (statusFilter) parts.push(pb.filter('status = {:s}', { s: statusFilter }));
      return pb.collection('orders').getList(page, perPage, {
        filter: parts.join(' && '),
        sort: sort || '-order_date',
        expand: 'customer,employee',
      });
    },
    [statusFilter]
  );

  const columns = [
    { key: 'order_number', label: t('orders.number'), sort: 'order_number' },
    { key: 'customer', label: t('orders.customer'), render: (o) => o.expand?.customer?.company_name || '' },
    {
      key: 'order_date',
      label: t('orders.order_date'),
      sort: 'order_date',
      render: (o) => formatDate(o.order_date, lang),
    },
    {
      key: 'employee',
      label: t('orders.employee'),
      render: (o) =>
        o.expand?.employee ? `${o.expand.employee.first_name || ''} ${o.expand.employee.last_name || ''}`.trim() : '',
    },
    { key: 'status', label: t('common.status'), sort: 'status', render: (o) => <StatusBadge domain="order" status={o.status} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('orders.title')}</h1>
        <div className="page-actions">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/orders/new')}>
            {t('orders.new')}
          </button>
        </div>
      </div>
      <DataTable
        columns={columns}
        fetchPage={fetchPage}
        defaultSort={{ key: 'order_date', dir: 'desc' }}
        searchPlaceholder={t('orders.search_ph')}
        deps={[statusFilter]}
        filters={
          <select
            className="input data-table-filter"
            aria-label={t('orders.status_filter')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.order.${s}`)}
              </option>
            ))}
          </select>
        }
        onRowClick={(o) => navigate(`/orders/${o.id}`)}
        cardTitle={(o) => (
          <>
            {o.order_number} <StatusBadge domain="order" status={o.status} />
          </>
        )}
        cardBody={(o) => (
          <>
            <span>{o.expand?.customer?.company_name || ''}</span>
            <span>{formatDate(o.order_date, lang)}</span>
          </>
        )}
      />
    </div>
  );
}
