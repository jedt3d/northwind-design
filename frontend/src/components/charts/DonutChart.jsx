import { useEffect, useState } from 'react';

const DEFAULT_COLORS = [
  'var(--color-sage)',
  'var(--color-blue)',
  'var(--color-amber)',
  'var(--color-coral)',
  'var(--color-sage-border)',
  'var(--color-blue-tile)',
];

/**
 * Animated SVG donut. data: [{label, value}]. Values are shown next to the
 * legend chips so the numbers stay auditable. Stroke draws in on mount
 * (~600 ms, disabled by prefers-reduced-motion via global CSS).
 */
export default function DonutChart({ data, centerCaption, format = (v) => v, colors = DEFAULT_COLORS }) {
  const [mounted, setMounted] = useState(false);
  const [hot, setHot] = useState(-1);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const rows = (data || []).filter((d) => d.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0);
  const R = 56;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className={`donut${hot >= 0 ? ' donut--hashover' : ''}`}>
      <div className="donut-figure">
        <svg className="donut-svg" viewBox="0 0 150 150" role="img" aria-label={centerCaption}>
          <circle className="donut-track" cx="75" cy="75" r={R} strokeWidth="17" />
          <g transform="rotate(-90 75 75)">
            {rows.map((d, i) => {
              const frac = total > 0 ? d.value / total : 0;
              const dash = mounted ? Math.max(frac * C - 2, 0) : 0;
              const offset = -acc * C;
              acc += frac;
              return (
                <circle
                  key={i}
                  className={`donut-seg${hot === i ? ' donut-seg--hot' : ''}`}
                  cx="75"
                  cy="75"
                  r={R}
                  stroke={colors[i % colors.length]}
                  strokeWidth={hot === i ? 21 : 17}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={offset}
                  onMouseEnter={() => setHot(i)}
                  onMouseLeave={() => setHot(-1)}
                >
                  <title>{`${d.label}: ${format(d.value)}`}</title>
                </circle>
              );
            })}
          </g>
        </svg>
        <div className="donut-center">
          <span className="donut-center-value">{format(total)}</span>
          <span className="donut-center-caption">{centerCaption}</span>
        </div>
      </div>
      <ul className="donut-legend" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((d, i) => (
          <li
            key={i}
            className={`donut-legend-row${hot === i ? ' donut-legend-row--hot' : ''}`}
            onMouseEnter={() => setHot(i)}
            onMouseLeave={() => setHot(-1)}
          >
            <span className="donut-legend-swatch" style={{ background: colors[i % colors.length] }} />
            <span className="donut-legend-label" title={d.label}>
              {d.label}
            </span>
            <span className="donut-legend-value">{format(d.value)}</span>
            <span className="donut-legend-pct">{total > 0 ? `${Math.round((d.value / total) * 100)}%` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
