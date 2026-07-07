import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { pb } from '../pb';
import { useT } from '../i18n/index.jsx';
import { formatMoney } from '../lib/calc';
import { lifetimeTotals } from '../lib/analytics';
import DataTable from '../components/DataTable.jsx';

const TOTAL_SORT_KEY = 'total_purchased';

export default function CompaniesList() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  const [totals, setTotals] = useState(null);

  // One batched fetch of all order/PO lines, grouped client-side per company.
  useEffect(() => {
    let alive = true;
    Promise.all([
      pb.collection('order_details').getList(1, 500, { expand: 'order' }),
      pb.collection('purchase_order_details').getList(1, 500, { expand: 'purchase_order' }),
    ])
      .then(([orderLines, poLines]) => {
        if (alive) setTotals(lifetimeTotals(orderLines.items, poLines.items));
      })
      .catch(() => alive && setTotals(new Map()));
    return () => {
      alive = false;
    };
  }, []);

  const totalOf = useCallback((c) => (totals && totals.get(c.id)?.total) || 0, [totals]);

  const fetchPage = useCallback(
    async ({ page, perPage, search, sort }) => {
      const parts = [];
      if (search) parts.push(pb.filter('(company_name ~ {:q} || contact_name ~ {:q})', { q: search }));
      if (typeFilter) parts.push(pb.filter('company_type ~ {:t}', { t: typeFilter }));
      const filter = parts.join(' && ');

      // "Total purchased" is a derived value — sort client-side over the full list.
      if (sort === TOTAL_SORT_KEY || sort === `-${TOTAL_SORT_KEY}`) {
        const all = await pb.collection('companies').getFullList({ filter, sort: 'company_name', batch: 500 });
        const dir = sort.startsWith('-') ? -1 : 1;
        all.sort((a, b) => dir * (totalOf(a) - totalOf(b)) || a.company_name.localeCompare(b.company_name));
        return {
          items: all.slice((page - 1) * perPage, page * perPage),
          totalItems: all.length,
          totalPages: Math.max(1, Math.ceil(all.length / perPage)),
        };
      }

      return pb.collection('companies').getList(page, perPage, {
        filter,
        sort: sort || 'company_name',
      });
    },
    [typeFilter, totalOf]
  );

  const renderTotal = (c) =>
    totals === null ? <span className="skeleton cell-skeleton" /> : formatMoney(totalOf(c), lang);

  const columns = [
    { key: 'company_name', label: t('companies.name'), sort: 'company_name' },
    {
      key: 'company_type',
      label: t('companies.types'),
      render: (c) => (c.company_type || []).map((tp) => (
        <span key={tp} className="type-chip">
          {t(`companies.type_${tp}`)}
        </span>
      )),
    },
    { key: 'contact_name', label: t('companies.contact'), sort: 'contact_name' },
    { key: 'city', label: t('companies.city'), sort: 'city' },
    { key: 'phone', label: t('companies.phone') },
    {
      key: TOTAL_SORT_KEY,
      label: t('companies.total_purchased'),
      sort: TOTAL_SORT_KEY,
      align: 'right',
      render: renderTotal,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('companies.title')}</h1>
        <div className="page-actions">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/companies/new')}>
            <Plus aria-hidden="true" />
            {t('companies.new')}
          </button>
        </div>
      </div>
      <DataTable
        columns={columns}
        fetchPage={fetchPage}
        defaultSort={{ key: 'company_name', dir: 'asc' }}
        searchPlaceholder={t('companies.search_ph')}
        deps={[typeFilter, totals]}
        filters={
          <select
            className="input data-table-filter"
            aria-label={t('companies.type_filter')}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            <option value="customer">{t('companies.type_customer')}</option>
            <option value="supplier">{t('companies.type_supplier')}</option>
            <option value="shipper">{t('companies.type_shipper')}</option>
          </select>
        }
        onRowClick={(c) => navigate(`/companies/${c.id}`)}
        cardTitle={(c) => c.company_name}
        cardBody={(c) => (
          <>
            <span>{(c.company_type || []).map((tp) => t(`companies.type_${tp}`)).join(', ')}</span>
            <span>{c.city}</span>
            <span>{c.phone}</span>
            <span className="nw-card-kv">
              <span className="nw-card-k">{t('companies.total_purchased')}</span> {renderTotal(c)}
            </span>
          </>
        )}
      />
    </div>
  );
}
