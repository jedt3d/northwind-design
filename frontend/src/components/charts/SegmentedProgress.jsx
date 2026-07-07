/**
 * Multicolor segmented pill progress (reference "Loading 65%" pattern).
 * segments: [{value, color, label?}] — rendered proportionally; zero segments skipped.
 * pct: number shown on the right; label: leading caption.
 */
export default function SegmentedProgress({ segments, pct, label }) {
  const rows = (segments || []).filter((s) => s.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;
  return (
    <div className="segprog">
      {label && <span className="segprog-label">{label}</span>}
      <span className="segprog-track" role="img" aria-label={`${label || ''} ${Math.round(pct)}%`.trim()}>
        {rows.map((s, i) => (
          <span
            key={i}
            className="segprog-seg"
            style={{ flexGrow: s.value, flexBasis: 0, background: s.color, animationDelay: `${i * 70}ms` }}
          >
            {s.label && <span className="visually-hidden">{`${s.label}: ${s.value}`}</span>}
          </span>
        ))}
      </span>
      <span className="segprog-pct">{Math.round(pct)}%</span>
    </div>
  );
}
