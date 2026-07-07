import { useT } from '../i18n/index.jsx';

/**
 * Pastel status pill. domain: 'order' | 'po' | 'line'.
 * Class per design system: .status-badge--{domain}-{status} (underscores become dashes).
 */
export default function StatusBadge({ domain = 'order', status }) {
  const { t } = useT();
  if (!status) return null;
  const cls = `status-badge status-badge--${domain}-${String(status).replace(/_/g, '-')}`;
  return <span className={cls}>{t(`status.${domain}.${status}`)}</span>;
}
