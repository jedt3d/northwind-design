import { useEffect } from 'react';
import { useT } from '../i18n/index.jsx';

export default function ConfirmDialog({ open, title, body, confirmLabel, danger, busy, onConfirm, onCancel }) {
  const { t } = useT();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{title || t('common.confirm_title')}</h2>
        {body && <div className="modal-body">{body}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
