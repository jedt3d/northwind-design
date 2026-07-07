import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { pb } from '../pb';
import { useT } from '../i18n/index.jsx';
import { formatDate } from '../lib/calc';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUSES = ['new', 'submitted', 'approved', 'closed', 'cancelled'];

export default function PurchaseOrdersList() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPage = useCallback(
    async ({ page, perPage, search, sort }) => {
      const parts = [];
      if (search) parts.push(pb.filter('(po_number ~ {:q} || supplier.company_name ~ {:q})', { q: search }));
      if (statusFilter) parts.push(pb.filter('status = {:s}', { s: statusFilter }));
      return pb.collection('purchase_orders').getList(page, perPage, {
        filter: parts.join(' && '),
        sort: sort || '-created',
        expand: 'supplier,created_by',
      });
    },
    [statusFilter]
  );

  const columns = [
    { key: 'po_number', label: t('po.number'), sort: 'po_number' },
    { key: 'supplier', label: t('po.supplier'), render: (po) => po.expand?.supplier?.company_name || '' },
    { key: 'created', label: t('common.date'), sort: 'created', render: (po) => formatDate(po.created, lang) },
    {
      key: 'expected_date',
      label: t('po.expected_date'),
      sort: 'expected_date',
      render: (po) => formatDate(po.expected_date, lang),
    },
    { key: 'status', label: t('common.status'), sort: 'status', render: (po) => <StatusBadge domain="po" status={po.status} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('po.title')}</h1>
        <div className="page-actions">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/purchase-orders/new')}>
            <Plus aria-hidden="true" />
            {t('po.new')}
          </button>
        </div>
      </div>
      <DataTable
        columns={columns}
        fetchPage={fetchPage}
        defaultSort={{ key: 'created', dir: 'desc' }}
        searchPlaceholder={t('po.search_ph')}
        deps={[statusFilter]}
        filters={
          <select
            className="input data-table-filter"
            aria-label={t('po.status_filter')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.po.${s}`)}
              </option>
            ))}
          </select>
        }
        onRowClick={(po) => navigate(`/purchase-orders/${po.id}`)}
        cardTitle={(po) => (
          <>
            {po.po_number} <StatusBadge domain="po" status={po.status} />
          </>
        )}
        cardBody={(po) => (
          <>
            <span>{po.expand?.supplier?.company_name || ''}</span>
            <span>{formatDate(po.created, lang)}</span>
          </>
        )}
      />
    </div>
  );
}
