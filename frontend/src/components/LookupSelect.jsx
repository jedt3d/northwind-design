import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/index.jsx';

/**
 * Searchable lookup picker for relation fields (docs/06 §3).
 *
 * Props:
 *  fetchOptions: async (query) => [{id, label, sub?, record?}]
 *  value: selected id (or '')
 *  valueLabel: label to show for the current value
 *  onChange(option|null)
 *  footerAction: {label, onClick} — e.g. "+ New customer"
 */
export default function LookupSelect({
  fetchOptions,
  value,
  valueLabel,
  onChange,
  placeholder,
  disabled,
  clearable = true,
  footerAction,
  id,
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);
  const debounceRef = useRef(null);
  const reqRef = useRef(0);

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const runFetch = async (q) => {
    const reqId = ++reqRef.current;
    setLoading(true);
    try {
      const opts = await fetchOptions(q);
      if (reqId === reqRef.current) setOptions(opts);
    } catch {
      if (reqId === reqRef.current) setOptions([]);
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  };

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    runFetch('');
  };

  const onQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runFetch(q), 300);
  };

  const pick = (opt) => {
    onChange(opt);
    setOpen(false);
  };

  return (
    <div className="lookup-picker" ref={rootRef}>
      {!open ? (
        <div className="lookup-picker-control">
          <button
            type="button"
            id={id}
            className={`input lookup-picker-value${value ? '' : ' lookup-picker-value--empty'}`}
            onClick={openDropdown}
            disabled={disabled}
          >
            {value ? valueLabel || value : placeholder || t('common.select')}
          </button>
          {clearable && value && !disabled && (
            <button
              type="button"
              className="lookup-picker-clear"
              aria-label={t('common.clear')}
              onClick={() => onChange(null)}
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <div className="lookup-picker-open">
          <input
            type="text"
            className="input"
            autoFocus
            value={query}
            placeholder={t('common.search')}
            onChange={onQueryChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          <div className="lookup-picker-dropdown">
            {loading && <div className="lookup-picker-note">{t('common.loading')}</div>}
            {!loading && options.length === 0 && <div className="lookup-picker-note">{t('common.empty')}</div>}
            {!loading &&
              options.map((opt) => (
                <button type="button" key={opt.id} className="lookup-picker-option" onClick={() => pick(opt)}>
                  <span className="lookup-picker-optlabel">{opt.label}</span>
                  {opt.sub && <span className="lookup-picker-optsub">{opt.sub}</span>}
                </button>
              ))}
            {footerAction && (
              <button
                type="button"
                className="lookup-picker-option lookup-picker-option--footer"
                onClick={() => {
                  setOpen(false);
                  footerAction.onClick();
                }}
              >
                {footerAction.label}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
