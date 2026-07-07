function initials(name) {
  const parts = String(name || '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '—';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

/**
 * Leaderboard rows: avatar-initials circle · name · pill progress bar · value.
 * rows: [{name, value}]
 */
export default function LeaderList({ rows, format = (v) => v, color = 'sage' }) {
  const max = Math.max(...(rows || []).map((r) => r.value), 1);
  return (
    <div className="leader-list">
      {(rows || []).map((r, i) => (
        <div key={i} className="leader-row">
          <span className="leader-avatar" aria-hidden="true">
            {initials(r.name)}
          </span>
          <span className="leader-body">
            <span className="leader-name" title={r.name}>
              {r.name}
            </span>
            <span className="leader-track">
              <span
                className={`leader-fill${color === 'blue' ? ' leader-fill--blue' : ''}`}
                style={{ width: `${(Math.max(r.value, 0) / max) * 100}%`, animationDelay: `${i * 45}ms` }}
              />
            </span>
          </span>
          <span className="leader-value">{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
