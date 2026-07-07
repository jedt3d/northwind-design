/**
 * Thin per-row availability bar for stock tables: sage fill (coral when low)
 * against a track scaled to max(available, reorder × 1.5, target), with a
 * marker at the reorder level. Purely decorative — numbers stay in the cells.
 */
export default function AvailabilityBar({ available, reorder = 0, target = 0 }) {
  const scale = Math.max(Number(available) || 0, (Number(reorder) || 0) * 1.5, Number(target) || 0, 1);
  const availPct = Math.max(0, Math.min(100, ((Number(available) || 0) / scale) * 100));
  const markerPct = reorder > 0 ? Math.max(0, Math.min(100, (reorder / scale) * 100)) : null;
  const low = reorder > 0 && (Number(available) || 0) < reorder;
  return (
    <span className="availbar" aria-hidden="true">
      <span className={`availbar-fill${low ? ' availbar-fill--low' : ''}`} style={{ width: `${availPct}%` }} />
      {markerPct != null && <span className="availbar-marker" style={{ left: `${markerPct}%` }} />}
    </span>
  );
}
