import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import StatusBadge from './StatusBadge.jsx';
import { I18nProvider } from '../i18n/index.jsx';

vi.mock('../pb', () => ({
  pb: {
    authStore: { isValid: false, record: null, onChange: () => () => {} },
    collection: () => ({ update: vi.fn().mockResolvedValue({}) }),
  },
}));

const wrap = (ui) => render(<I18nProvider initialLang="en">{ui}</I18nProvider>);

describe('StatusBadge', () => {
  it('maps order statuses to design-system classes', () => {
    const { container } = wrap(<StatusBadge domain="order" status="new" />);
    const el = container.querySelector('.status-badge');
    expect(el.className).toContain('status-badge--order-new');
    expect(el.textContent).toBe('New');
  });

  it('maps every order status', () => {
    for (const s of ['new', 'invoiced', 'shipped', 'closed', 'cancelled']) {
      const { container } = wrap(<StatusBadge domain="order" status={s} />);
      expect(container.querySelector(`.status-badge--order-${s}`)).toBeTruthy();
    }
  });

  it('maps PO statuses', () => {
    for (const s of ['new', 'submitted', 'approved', 'closed', 'cancelled']) {
      const { container } = wrap(<StatusBadge domain="po" status={s} />);
      expect(container.querySelector(`.status-badge--po-${s}`)).toBeTruthy();
    }
  });

  it('converts underscores in line statuses to dashes', () => {
    const { container } = wrap(<StatusBadge domain="line" status="no_stock" />);
    expect(container.querySelector('.status-badge--line-no-stock')).toBeTruthy();
    const { container: c2 } = wrap(<StatusBadge domain="line" status="on_order" />);
    expect(c2.querySelector('.status-badge--line-on-order')).toBeTruthy();
  });

  it('renders translated labels', () => {
    const { container } = wrap(<StatusBadge domain="line" status="allocated" />);
    expect(container.textContent).toBe('Allocated');
  });

  it('renders nothing without a status', () => {
    const { container } = wrap(<StatusBadge domain="order" status="" />);
    expect(container.querySelector('.status-badge')).toBeNull();
  });
});
