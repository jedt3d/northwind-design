import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb, errMsg, currentUser, logout } from '../pb';
import { useT, LANGS } from '../i18n/index.jsx';
import FormField from '../components/FormField.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Settings() {
  const { t, lang, setLang } = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const me = currentUser();

  const [profile, setProfile] = useState({
    first_name: me?.first_name || '',
    last_name: me?.last_name || '',
    job_title: me?.job_title || '',
    phone: me?.phone || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ old: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await pb.collection('employees').update(me.id, profile);
      toast(t('common.saved'), 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.next !== pw.confirm) {
      setPwError(t('settings.password_mismatch'));
      return;
    }
    setSavingPw(true);
    try {
      await pb.collection('employees').update(me.id, {
        oldPassword: pw.old,
        password: pw.next,
        passwordConfirm: pw.confirm,
      });
      toast(t('settings.password_changed'), 'success');
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setPwError(errMsg(err));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('settings.title')}</h1>
      </div>

      <section className="panel inline-form">
        <h2 className="panel-title">{t('settings.language')}</h2>
        <div className="checkbox-row">
          {LANGS.map((l) => (
            <label key={l} className="radio">
              <input type="radio" name="lang" value={l} checked={lang === l} onChange={() => setLang(l)} />
              {t(`lang.${l}`)}
            </label>
          ))}
        </div>
      </section>

      <form className="panel inline-form" onSubmit={saveProfile}>
        <h2 className="panel-title">{t('settings.profile')}</h2>
        <div className="form-grid">
          <FormField label={t('admin.username')}>
            <input className="input" value={me?.username || ''} disabled />
          </FormField>
          <FormField label={t('admin.email')}>
            <input className="input" value={me?.email || ''} disabled />
          </FormField>
          <FormField label={t('admin.role')}>
            <input className="input" value={me?.role ? t(`role.${me.role}`) : ''} disabled />
          </FormField>
          <FormField label={t('admin.first_name')} htmlFor="s-first">
            <input
              id="s-first"
              className="input"
              value={profile.first_name}
              onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
            />
          </FormField>
          <FormField label={t('admin.last_name')} htmlFor="s-last">
            <input
              id="s-last"
              className="input"
              value={profile.last_name}
              onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
            />
          </FormField>
          <FormField label={t('admin.job_title')} htmlFor="s-job">
            <input
              id="s-job"
              className="input"
              value={profile.job_title}
              onChange={(e) => setProfile((p) => ({ ...p, job_title: e.target.value }))}
            />
          </FormField>
          <FormField label={t('admin.phone')} htmlFor="s-phone">
            <input
              id="s-phone"
              className="input"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            />
          </FormField>
        </div>
        <div className="form-footer">
          <button type="submit" className="btn btn--primary" disabled={savingProfile}>
            {savingProfile ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>

      <form className="panel inline-form" onSubmit={changePassword}>
        <h2 className="panel-title">{t('settings.password_title')}</h2>
        {pwError && (
          <div className="banner banner--error" role="alert">
            {pwError}
          </div>
        )}
        <div className="form-grid">
          <FormField label={t('settings.old_password')} required htmlFor="s-oldpw">
            <input
              id="s-oldpw"
              className="input"
              type="password"
              autoComplete="current-password"
              value={pw.old}
              onChange={(e) => setPw((p) => ({ ...p, old: e.target.value }))}
              required
            />
          </FormField>
          <FormField label={t('settings.new_password')} required htmlFor="s-newpw">
            <input
              id="s-newpw"
              className="input"
              type="password"
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              required
            />
          </FormField>
          <FormField label={t('settings.confirm_password')} required htmlFor="s-confpw">
            <input
              id="s-confpw"
              className="input"
              type="password"
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              required
            />
          </FormField>
        </div>
        <div className="form-footer">
          <button type="submit" className="btn btn--primary" disabled={savingPw}>
            {savingPw ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
