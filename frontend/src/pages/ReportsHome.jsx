import { Link } from 'react-router-dom';
import { ClipboardList, Package, TrendingUp, Warehouse } from 'lucide-react';
import { useT } from '../i18n/index.jsx';

const REPORTS = [
  { id: 'sales-by-period', title: 'reports.sales_title', desc: 'reports.sales_desc', icon: TrendingUp },
  { id: 'top-products', title: 'reports.top_title', desc: 'reports.top_desc', icon: Package },
  { id: 'stock-on-hand', title: 'reports.stock_title', desc: 'reports.stock_desc', icon: Warehouse },
  { id: 'outstanding-pos', title: 'reports.outpo_title', desc: 'reports.outpo_desc', icon: ClipboardList },
];

export default function ReportsHome() {
  const { t } = useT();
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('reports.title')}</h1>
      </div>
      <div className="report-cards">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.id} to={`/reports/${r.id}`} className="report-card">
              <div className="report-card-title">
                <Icon aria-hidden="true" />
                {t(r.title)}
              </div>
              <div className="report-card-desc">{t(r.desc)}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
