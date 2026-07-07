import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login.jsx';
import { I18nProvider } from '../i18n/index.jsx';
import { login } from '../pb';

vi.mock('../pb', () => ({
  pb: {
    authStore: { isValid: false, record: null, onChange: () => () => {} },
    collection: () => ({ update: vi.fn().mockResolvedValue({}) }),
  },
  login: vi.fn(),
  errMsg: (err) => err?.response?.message || err?.message || String(err),
}));

const wrap = () =>
  render(
    <I18nProvider initialLang="en">
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    </I18nProvider>
  );

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders identity/password fields, submit button and language switcher', () => {
    wrap();
    expect(screen.getByLabelText('Username or email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ไทย' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '日本語' })).toBeTruthy();
  });

  it('submits credentials to the auth endpoint', async () => {
    login.mockResolvedValue({ record: { id: 'e1', language: 'en' } });
    wrap();
    fireEvent.change(screen.getByLabelText('Username or email'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('admin', 'password'));
  });

  it('shows a friendly error when authentication fails', async () => {
    login.mockRejectedValue({ response: { message: 'Failed to authenticate.' }, message: 'Failed to authenticate.' });
    wrap();
    fireEvent.change(screen.getByLabelText('Username or email'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Sign-in failed');
  });

  it('surfaces specific server messages (e.g. deactivated account)', async () => {
    login.mockRejectedValue({ response: { message: 'This account is deactivated.' } });
    wrap();
    fireEvent.change(screen.getByLabelText('Username or email'), { target: { value: 'ploy' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('This account is deactivated.');
  });

  it('switches the login screen language in place', () => {
    wrap();
    fireEvent.click(screen.getByRole('button', { name: 'ไทย' }));
    expect(screen.getByText('เข้าสู่ระบบ', { selector: 'h1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '日本語' }));
    expect(screen.getByText('ログイン', { selector: 'h1' })).toBeTruthy();
  });
});
