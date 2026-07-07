/**
 * KPI stat card row (reference "Mined / Plan" cards): icon in a soft sage
 * circle, big number, small uppercase caption.
 * items: [{icon: LucideComponent, value, caption, tone?: 'sage'|'amber'|'coral'|'blue'}]
 */
export default function StatCards({ items }) {
  return (
    <div className="stat-grid">
      {(items || []).map((it, i) => {
        const Icon = it.icon;
        return (
          <div key={i} className="stat-card">
            <span className={`stat-card-icon${it.tone && it.tone !== 'sage' ? ` stat-card-icon--${it.tone}` : ''}`}>
              {Icon && <Icon aria-hidden="true" />}
            </span>
            <span className="stat-card-body">
              <span className="stat-card-value">{it.value}</span>
              <span className="stat-card-caption">{it.caption}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
