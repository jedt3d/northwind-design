import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider, useT } from './index.jsx';

vi.mock('../pb', () => ({
  pb: {
    authStore: { isValid: false, record: null, onChange: () => () => {} },
    collection: () => ({ update: vi.fn().mockResolvedValue({}) }),
  },
}));

function Probe() {
  const { t, lang, setLang } = useT();
  return (
    <div>
      <span data-testid="title">{t('login.title')}</span>
      <span data-testid="lang">{lang}</span>
      <span data-testid="vars">{t('common.range', { from: 1, to: 20, total: 143 })}</span>
      <button onClick={() => setLang('th')}>to-th</button>
      <button onClick={() => setLang('ja')}>to-ja</button>
      <button onClick={() => setLang('en')}>to-en</button>
    </div>
  );
}

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  it('renders English by default and interpolates variables', () => {
    render(
      <I18nProvider initialLang="en">
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByTestId('title').textContent).toBe('Sign in');
    expect(screen.getByTestId('vars').textContent).toBe('1–20 of 143');
    expect(document.documentElement.lang).toBe('en');
  });

  it('returns real Thai strings when lang=th and updates the document', () => {
    render(
      <I18nProvider initialLang="en">
        <Probe />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText('to-th'));
    expect(screen.getByTestId('title').textContent).toBe('เข้าสู่ระบบ');
    expect(screen.getByTestId('lang').textContent).toBe('th');
    expect(document.documentElement.lang).toBe('th');
    expect(localStorage.getItem('nw_lang')).toBe('th');
  });

  it('returns real Japanese strings when lang=ja and updates the document', () => {
    render(
      <I18nProvider initialLang="en">
        <Probe />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText('to-ja'));
    expect(screen.getByTestId('title').textContent).toBe('ログイン');
    expect(document.documentElement.lang).toBe('ja');
    expect(localStorage.getItem('nw_lang')).toBe('ja');
  });

  it('falls back to English, then to the key itself', () => {
    function FallbackProbe() {
      const { t } = useT();
      return <span data-testid="x">{t('totally.unknown.key')}</span>;
    }
    render(
      <I18nProvider initialLang="th">
        <FallbackProbe />
      </I18nProvider>
    );
    expect(screen.getByTestId('x').textContent).toBe('totally.unknown.key');
  });

  it('restores the persisted language on startup', () => {
    localStorage.setItem('nw_lang', 'ja');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByTestId('lang').textContent).toBe('ja');
    expect(screen.getByTestId('title').textContent).toBe('ログイン');
  });
});
