import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import DataTable from './DataTable.jsx';
import { I18nProvider } from '../i18n/index.jsx';

vi.mock('../pb', () => ({
  pb: {
    authStore: { isValid: false, record: null, onChange: () => () => {} },
    collection: () => ({ update: vi.fn().mockResolvedValue({}) }),
  },
}));

const columns = [
  { key: 'name', label: 'Name', sort: 'name' },
  { key: 'qty', label: 'Qty', sort: 'qty', align: 'right' },
];

const wrap = (ui) => render(<I18nProvider initialLang="en">{ui}</I18nProvider>);

afterEach(() => {
  vi.useRealTimers();
});

describe('DataTable', () => {
  it('debounces search input by 300 ms and passes it to fetchPage', async () => {
    vi.useFakeTimers();
    const fetchPage = vi.fn().mockResolvedValue({ items: [{ id: '1', name: 'Chai', qty: 3 }], totalItems: 1, totalPages: 1 });
    wrap(<DataTable columns={columns} fetchPage={fetchPage} />);

    // initial load
    await act(async () => {});
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage.mock.calls[0][0].search).toBe('');

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cha' } });
    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(fetchPage).toHaveBeenCalledTimes(1); // not yet

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage.mock.calls[1][0].search).toBe('cha');
    expect(fetchPage.mock.calls[1][0].page).toBe(1);
  });

  it('cycles header sort asc → desc and sets aria-sort', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], totalItems: 0, totalPages: 1 });
    wrap(<DataTable columns={columns} fetchPage={fetchPage} />);
    await act(async () => {});
    expect(fetchPage.mock.calls[0][0].sort).toBe('');

    fireEvent.click(screen.getByRole('button', { name: /^Name/ }));
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
    expect(fetchPage.mock.calls[1][0].sort).toBe('name');
    expect(document.querySelector('th[aria-sort="ascending"]')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Name/ }));
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(3));
    expect(fetchPage.mock.calls[2][0].sort).toBe('-name');
    expect(document.querySelector('th[aria-sort="descending"]')).toBeTruthy();
  });

  it('switching to another column restarts at ascending', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], totalItems: 0, totalPages: 1 });
    wrap(<DataTable columns={columns} fetchPage={fetchPage} defaultSort={{ key: 'name', dir: 'desc' }} />);
    await act(async () => {});
    expect(fetchPage.mock.calls[0][0].sort).toBe('-name');

    fireEvent.click(screen.getByRole('button', { name: /^Qty/ }));
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
    expect(fetchPage.mock.calls[1][0].sort).toBe('qty');
  });

  it('shows the empty state when there are no rows', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], totalItems: 0, totalPages: 1 });
    wrap(<DataTable columns={columns} fetchPage={fetchPage} emptyLabel="No products yet." />);
    expect(await screen.findByText('No products yet.')).toBeTruthy();
  });

  it('shows a filtered-empty message naming the query', async () => {
    vi.useFakeTimers();
    const fetchPage = vi.fn().mockResolvedValue({ items: [], totalItems: 0, totalPages: 1 });
    wrap(<DataTable columns={columns} fetchPage={fetchPage} />);
    await act(async () => {});
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText('No results for “zzz”.')).toBeTruthy();
  });

  it('renders rows and calls onRowClick', async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      items: [{ id: 'r1', name: 'Chai', qty: 3 }],
      totalItems: 1,
      totalPages: 1,
    });
    const onRowClick = vi.fn();
    wrap(<DataTable columns={columns} fetchPage={fetchPage} onRowClick={onRowClick} />);
    const cell = await screen.findAllByText('Chai');
    fireEvent.click(cell[0]);
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  });

  it('shows an error banner with retry when fetch fails', async () => {
    const fetchPage = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ items: [], totalItems: 0, totalPages: 1 });
    wrap(<DataTable columns={columns} fetchPage={fetchPage} />);
    expect(await screen.findByText('boom')).toBeTruthy();
    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
  });
});
