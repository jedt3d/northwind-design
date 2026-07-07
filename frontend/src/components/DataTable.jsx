import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Inbox, Search } from 'lucide-react';
import { useT } from '../i18n/index.jsx';

const PER_PAGE = 20;

/**
 * Generic list per docs/09 conventions:
 * - toolbar search, 300 ms debounce (page maps `search` to a PB filter string)
 * - single-column sort cycling asc ↔ desc (mobile: sort dropdown)
 * - 20/page pagination on desktop, Load more card list on mobile
 * - loading / empty / error states, whole row clickable.
 *
 * Props:
 *  columns: [{key, label, render?, sort?, align?}] — `sort` is the PB sort field.
 *  fetchPage: async ({page, perPage, search, sort}) => {items, totalItems, totalPages}
 *  defaultSort: {key, dir} | null
 *  filters: extra toolbar nodes; deps: array that resets/reloads page 1 when changed
 *  onRowClick(item), rowClass(item), cardTitle(item), cardBody(item)
 */
export default function DataTable({
  columns,
  fetchPage,
  defaultSort = null,
  searchPlaceholder,
  searchable = true,
  filters = null,
  deps = [],
  onRowClick,
  rowClass,
  cardTitle,
  cardBody,
  emptyLabel,
  rowKey = (item) => item.id,
}) {
  const { t } = useT();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(defaultSort);
  const [state, setState] = useState({
    items: [],
    totalItems: 0,
    totalPages: 1,
    page: 1,
    loading: true,
    error: null,
  });

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const debounceRef = useRef(null);
  const reqRef = useRef(0);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const load = useCallback(
    async (page, append) => {
      const reqId = ++reqRef.current;
      setState((s) => ({ ...s, loading: true, error: null }));
      const sortStr = sort ? `${sort.dir === 'desc' ? '-' : ''}${sort.key}` : '';
      try {
        const res = await fetchRef.current({ page, perPage: PER_PAGE, search, sort: sortStr });
        if (reqId !== reqRef.current) return;
        setState((s) => ({
          items: append ? [...s.items, ...res.items] : res.items,
          totalItems: res.totalItems ?? res.items.length,
          totalPages: res.totalPages ?? Math.max(1, Math.ceil((res.totalItems ?? res.items.length) / PER_PAGE)),
          page,
          loading: false,
          error: null,
        }));
      } catch (err) {
        if (reqId !== reqRef.current) return;
        setState((s) => ({ ...s, loading: false, error: err?.message || String(err) }));
      }
    },
    [search, sort]
  );

  useEffect(() => {
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort, ...deps]);

  const onSearchChange = (e) => {
    const v = e.target.value;
    setSearchInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(v), 300);
  };

  const clearSearch = () => {
    clearTimeout(debounceRef.current);
    setSearchInput('');
    setSearch('');
  };

  const cycleSort = (col) => {
    if (!col.sort) return;
    setSort((s) =>
      s && s.key === col.sort ? { key: col.sort, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.sort, dir: 'asc' }
    );
  };

  const sortableCols = columns.filter((c) => c.sort);
  const { items, totalItems, totalPages, page, loading, error } = state;
  const from = totalItems === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, totalItems);

  const cellValue = (col, item) => (col.render ? col.render(item) : item[col.key]);

  return (
    <div className="data-table">
      {(searchable || filters || sortableCols.length > 0) && (
        <div className="data-table-toolbar">
          {searchable && (
            <div className="search-field">
              <Search className="search-field-icon" aria-hidden="true" />
              <input
                type="search"
                className="input search-field-input"
                placeholder={searchPlaceholder || t('common.search')}
                aria-label={t('common.search')}
                value={searchInput}
                onChange={onSearchChange}
              />
              {searchInput && (
                <button type="button" className="search-field-clear" aria-label={t('common.clear')} onClick={clearSearch}>
                  ×
                </button>
              )}
            </div>
          )}
          {filters}
          {sortableCols.length > 0 && (
            <label className="data-table-mobilesort">
              <span className="visually-hidden">{t('common.sort_by')}</span>
              <select
                className="input"
                value={sort ? `${sort.key}:${sort.dir}` : ''}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split(':');
                  if (key) setSort({ key, dir });
                }}
              >
                {!sort && <option value="">{t('common.sort_by')}</option>}
                {sortableCols.flatMap((c) => [
                  <option key={`${c.sort}:asc`} value={`${c.sort}:asc`}>
                    {c.label} ↑
                  </option>,
                  <option key={`${c.sort}:desc`} value={`${c.sort}:desc`}>
                    {c.label} ↓
                  </option>,
                ])}
              </select>
            </label>
          )}
        </div>
      )}

      {error && (
        <div className="banner banner--error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn--secondary" onClick={() => load(1, false)}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {!error && (
        <>
          <div className="nw-table-wrap">
            <table className="nw-table">
              <thead>
                <tr>
                  {columns.map((col) => {
                    const active = sort && sort.key === col.sort;
                    const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined;
                    return (
                      <th
                        key={col.key}
                        aria-sort={ariaSort}
                        className={`${col.align === 'right' ? 'nw-table-th--right ' : ''}${active ? 'nw-table-th--active' : ''}`}
                      >
                        {col.sort ? (
                          <button type="button" className="nw-table-sortbtn" onClick={() => cycleSort(col)}>
                            {col.align === 'right' && (
                              <span className="nw-table-arrow">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
                            )}
                            {col.label}
                            {col.align !== 'right' && (
                              <span className="nw-table-arrow">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
                            )}
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0
                  ? [0, 1, 2].map((i) => (
                      <tr key={`sk-${i}`} className="nw-table-skeletonrow">
                        {columns.map((c) => (
                          <td key={c.key}>
                            <div className="skeleton" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : items.map((item) => (
                      <tr
                        key={rowKey(item)}
                        className={`nw-table-row${onRowClick ? ' nw-table-row--clickable' : ''} ${rowClass ? rowClass(item) : ''}`}
                        tabIndex={onRowClick ? 0 : undefined}
                        onClick={onRowClick ? () => onRowClick(item) : undefined}
                        onKeyDown={
                          onRowClick
                            ? (e) => {
                                if (e.key === 'Enter') onRowClick(item);
                              }
                            : undefined
                        }
                      >
                        {columns.map((col) => (
                          <td key={col.key} className={col.align === 'right' ? 'nw-table-td--right' : ''}>
                            {cellValue(col, item)}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <div className="nw-cards">
            {loading && items.length === 0
              ? [0, 1, 2].map((i) => <div key={`skc-${i}`} className="nw-card nw-card--skeleton"><div className="skeleton" /></div>)
              : items.map((item) => (
                  <div
                    key={`card-${rowKey(item)}`}
                    className={`nw-card${onRowClick ? ' nw-card--clickable' : ''} ${rowClass ? rowClass(item) : ''}`}
                    role={onRowClick ? 'button' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter') onRowClick(item);
                          }
                        : undefined
                    }
                  >
                    {onRowClick && <ChevronRight className="nw-card-chevron" aria-hidden="true" />}
                    <div className="nw-card-title">{cardTitle ? cardTitle(item) : cellValue(columns[0], item)}</div>
                    <div className="nw-card-body">
                      {cardBody
                        ? cardBody(item)
                        : columns.slice(1, 4).map((c) => (
                            <span key={c.key} className="nw-card-kv">
                              <span className="nw-card-k">{c.label}</span> {cellValue(c, item)}
                            </span>
                          ))}
                    </div>
                  </div>
                ))}
          </div>

          {!loading && items.length === 0 && (
            <div className="empty-state">
              <Inbox className="empty-state-icon" aria-hidden="true" />
              <div className="empty-state-title">
                {search ? t('common.no_results', { q: search }) : emptyLabel || t('common.empty')}
              </div>
              {search && (
                <button type="button" className="btn btn--secondary" onClick={clearSearch}>
                  {t('common.clear')}
                </button>
              )}
            </div>
          )}

          {totalItems > 0 && (
            <div className="data-table-footer">
              <span className="data-table-range">{t('common.range', { from, to, total: totalItems })}</span>
              <div className="data-table-pager">
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => load(page - 1, false)}
                >
                  {t('common.prev')}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => load(page + 1, false)}
                >
                  {t('common.next')}
                </button>
              </div>
              {page < totalPages && (
                <button
                  type="button"
                  className="btn btn--secondary data-table-loadmore"
                  disabled={loading}
                  onClick={() => load(page + 1, true)}
                >
                  {t('common.load_more')}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
