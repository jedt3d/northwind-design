/**
 * Ranked horizontal bars: rank chip · label · rounded gradient bar · value.
 * Bars grow from 0 width on mount (CSS grow-bar animation, reduced-motion safe).
 * rows: [{label, value, sub?}]
 */
export default function RankBars({ rows, format = (v) => v, color = 'sage' }) {
  const max = Math.max(...(rows || []).map((r) => r.value), 1);
  return (
    <div className="rank-bars">
      {(rows || []).map((r, i) => (
        <div key={i} className="rank-row">
          <span className="rank-chip">{i + 1}</span>
          <span className="rank-label" title={r.label}>
            {r.label}
          </span>
          <span className="rank-track">
            <span
              className={`rank-fill${color === 'blue' ? ' rank-fill--blue' : ''}`}
              style={{ width: `${(Math.max(r.value, 0) / max) * 100}%`, animationDelay: `${i * 45}ms` }}
            />
          </span>
          <span className="rank-value">
            {format(r.value)}
            {r.sub != null && <small> · {r.sub}</small>}
          </span>
        </div>
      ))}
    </div>
  );
}
