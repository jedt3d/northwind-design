import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { pb, login, errMsg } from '../pb';
import { useT, LANGS } from '../i18n/index.jsx';

export default function Login() {
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await login(identity, password);
      // profile language wins over localStorage on login
      if (res.record && res.record.language) {
        setLang(res.record.language, { syncProfile: false });
      }
      const dest = (location.state && location.state.from) || '/';
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = errMsg(err);
      // PB returns a generic 400 for bad credentials; specific hook messages pass through.
      setError(msg && !/Failed to authenticate/i.test(msg) ? msg : t('login.error'));
    } finally {
      setBusy(false);
    }
  };

  if (pb.authStore.isValid && !busy) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-langs" role="group" aria-label={t('settings.language')}>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              className={`login-lang${lang === l ? ' login-lang--active' : ''}`}
              onClick={() => setLang(l, { syncProfile: false })}
            >
              {t(`lang.${l}`)}
            </button>
          ))}
        </div>
        <h1 className="login-title">{t('login.title')}</h1>
        <p className="login-subtitle">{t('login.subtitle')}</p>
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="login-identity">
              {t('login.identity')}
            </label>
            <input
              id="login-identity"
              className="input"
              type="text"
              autoComplete="username"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="login-password">
              {t('login.password')}
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="banner banner--error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn--primary login-submit" disabled={busy}>
            {busy ? t('login.signing_in') : t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
