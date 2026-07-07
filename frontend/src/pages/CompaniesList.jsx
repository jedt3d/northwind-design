import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../pb';
import { useT } from '../i18n/index.jsx';
import DataTable from '../components/DataTable.jsx';

export default function CompaniesList() {
  const { t } = useT();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');

  const fetchPage = useCallback(
    async ({ page, perPage, search, sort }) => {
      const parts = [];
      if (search) parts.push(pb.filter('(company_name ~ {:q} || contact_name ~ {:q})', { q: search }));
      if (typeFilter) parts.push(pb.filter('company_type ~ {:t}', { t: typeFilter }));
      return pb.collection('companies').getList(page, perPage, {
        filter: parts.join(' && '),
        sort: sort || 'company_name',
      });
    },
    [typeFilter]
  );

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
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('companies.title')}</h1>
        <div className="page-actions">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/companies/new')}>
            {t('companies.new')}
          </button>
        </div>
      </div>
      <DataTable
        columns={columns}
        fetchPage={fetchPage}
        defaultSort={{ key: 'company_name', dir: 'asc' }}
        searchPlaceholder={t('companies.search_ph')}
        deps={[typeFilter]}
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
          </>
        )}
      />
    </div>
  );
}
