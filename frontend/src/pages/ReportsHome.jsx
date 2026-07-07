import { Link } from 'react-router-dom';
import { useT } from '../i18n/index.jsx';

const REPORTS = [
  { id: 'sales-by-period', title: 'reports.sales_title', desc: 'reports.sales_desc' },
  { id: 'top-products', title: 'reports.top_title', desc: 'reports.top_desc' },
  { id: 'stock-on-hand', title: 'reports.stock_title', desc: 'reports.stock_desc' },
  { id: 'outstanding-pos', title: 'reports.outpo_title', desc: 'reports.outpo_desc' },
];

export default function ReportsHome() {
  const { t } = useT();
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('reports.title')}</h1>
      </div>
      <div className="report-cards">
        {REPORTS.map((r) => (
          <Link key={r.id} to={`/reports/${r.id}`} className="report-card">
            <div className="report-card-title">{t(r.title)}</div>
            <div className="report-card-desc">{t(r.desc)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
