import { useId } from 'react';

/** Catmull-Rom → cubic bezier smoothing for a gentle "wave" line. */
function smoothPath(pts) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const W = 640;
const H = 210;
const PAD = { top: 16, right: 18, bottom: 28, left: 18 };

/**
 * Smooth overlapping area chart (SVG, no library).
 * rows: [{month, ...values}]; series: [{key, label, color, tile}].
 * Numbers stay visible in per-month chips below the chart (chips prop).
 */
export default function AreaTrend({ rows, series, chips = null, format = (v) => v }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (!rows || rows.length === 0) return null;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(...rows.flatMap((r) => series.map((s) => Number(r[s.key]) || 0)), 1);
  const single = rows.length === 1;
  const x = (i) => PAD.left + (single ? innerW / 2 : (i * innerW) / (rows.length - 1));
  const y = (v) => PAD.top + innerH - (Math.max(v, 0) / max) * innerH;
  const baseline = PAD.top + innerH;

  return (
    <div className="area-trend">
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.key} className="chart-legend-chip">
            <span className="area-chip-dot" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg className="area-trend-svg" viewBox={`0 0 ${W} ${H}`} role="img">
        <defs>
          {series.map((s, si) => (
            <linearGradient key={s.key} id={`at-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.03" />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            className="area-grid-line"
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + innerH * f}
            y2={PAD.top + innerH * f}
          />
        ))}
        <line className="area-grid-line" x1={PAD.left} x2={W - PAD.right} y1={baseline} y2={baseline} style={{ strokeDasharray: 'none' }} />
        {series.map((s, si) => {
          const dotPts = rows.map((r, i) => [x(i), y(Number(r[s.key]) || 0)]);
          // A lone month still deserves a visible wave: stretch it flat across the chart.
          const pts = single
            ? [[PAD.left, dotPts[0][1]], [x(0), dotPts[0][1]], [W - PAD.right, dotPts[0][1]]]
            : dotPts;
          const line = smoothPath(pts);
          const area = `${line} L${pts[pts.length - 1][0]},${baseline} L${pts[0][0]},${baseline} Z`;
          return (
            <g key={s.key}>
              <path d={area} fill={`url(#at-${uid}-${si})`} stroke="none" />
              <path d={line} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
              {dotPts.map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r="3.5" fill="#ffffff" stroke={s.color} strokeWidth="2">
                  <title>{`${rows[i].month} · ${s.label}: ${format(Number(rows[i][s.key]) || 0)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {rows.map((r, i) => (
          <text key={r.month} className="area-axis" x={x(i)} y={H - 8} textAnchor="middle">
            {r.month}
          </text>
        ))}
      </svg>
      {chips && <div className="area-chips">{chips}</div>}
    </div>
  );
}
