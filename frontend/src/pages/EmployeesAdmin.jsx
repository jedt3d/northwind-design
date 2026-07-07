import { useEffect, useState } from 'react';
import { pb, errMsg } from '../pb';
import { useT, LANGS } from '../i18n/index.jsx';
import FormField from '../components/FormField.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';

const ROLES = ['sales', 'purchasing', 'warehouse', 'manager', 'admin'];
const EMPTY = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  job_title: '',
  phone: '',
  role: 'sales',
  language: 'en',
  active: true,
};

export default function EmployeesAdmin() {
  const { t } = useT();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | record
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toDeactivate, setToDeactivate] = useState(null);

  const load = () => {
    pb.collection('employees')
      .getList(1, 200, { sort: 'username' })
      .then((r) => setItems(r.items))
      .catch((err) => {
        setItems([]);
        setError(errMsg(err));
      });
  };
  useEffect(load, []);

  const startNew = () => {
    setEditing('new');
    setForm(EMPTY);
    setError('');
  };
  const startEdit = (emp) => {
    setEditing(emp);
    setForm({ ...EMPTY, ...emp, password: '' });
    setError('');
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        await pb.collection('employees').create({
          username: form.username,
          email: form.email,
          password: form.password,
          passwordConfirm: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          job_title: form.job_title,
          phone: form.phone,
          role: form.role,
          language: form.language,
          active: form.active,
        });
      } else {
        const body = {
          username: form.username,
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          job_title: form.job_title,
          phone: form.phone,
          role: form.role,
          language: form.language,
          active: form.active,
        };
        if (form.password) {
          body.password = form.password;
          body.passwordConfirm = form.password;
        }
        await pb.collection('employees').update(editing.id, body);
      }
      toast(t('common.saved'), 'success');
      setEditing(null);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (emp) => {
    if (emp.active) {
      setToDeactivate(emp);
    } else {
      pb.collection('employees')
        .update(emp.id, { active: true })
        .then(() => {
          toast(t('common.saved'), 'success');
          load();
        })
        .catch((err) => toast(errMsg(err), 'error'));
    }
  };

  const doDeactivate = async () => {
    try {
      await pb.collection('employees').update(toDeactivate.id, { active: false });
      toast(t('common.saved'), 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
    setToDeactivate(null);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('admin.title')}</h1>
        <div className="page-actions">
          <button type="button" className="btn btn--primary" onClick={startNew}>
            {t('admin.new_employee')}
          </button>
        </div>
      </div>

      {editing !== null && (
        <form className="panel inline-form" onSubmit={save}>
          <h2 className="panel-title">{editing === 'new' ? t('admin.new_employee') : t('admin.edit_title')}</h2>
          {error && (
            <div className="banner banner--error" role="alert">
              {error}
            </div>
          )}
          <div className="form-grid">
            <FormField label={t('admin.username')} required htmlFor="e-username">
              <input id="e-username" className="input" value={form.username} onChange={set('username')} required />
            </FormField>
            <FormField label={t('admin.email')} required={editing === 'new'} htmlFor="e-email">
              <input id="e-email" className="input" type="email" value={form.email} onChange={set('email')} />
            </FormField>
            <FormField label={t('admin.password')} required={editing === 'new'} htmlFor="e-password">
              <input
                id="e-password"
                className="input"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                required={editing === 'new'}
              />
            </FormField>
            <FormField label={t('admin.first_name')} required htmlFor="e-first">
              <input id="e-first" className="input" value={form.first_name} onChange={set('first_name')} required />
            </FormField>
            <FormField label={t('admin.last_name')} required htmlFor="e-last">
              <input id="e-last" className="input" value={form.last_name} onChange={set('last_name')} required />
            </FormField>
            <FormField label={t('admin.job_title')} htmlFor="e-job">
              <input id="e-job" className="input" value={form.job_title} onChange={set('job_title')} />
            </FormField>
            <FormField label={t('admin.role')} required htmlFor="e-role">
              <select id="e-role" className="input" value={form.role} onChange={set('role')}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}`)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t('admin.language')} htmlFor="e-lang">
              <select id="e-lang" className="input" value={form.language} onChange={set('language')}>
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {t(`lang.${l}`)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!!form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                {t('admin.active')}
              </label>
            </FormField>
          </div>
          <div className="form-footer">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {items === null ? (
        <div className="skeleton page-skeleton" />
      ) : (
        <div className="nw-table-wrap nw-table-wrap--always">
          <table className="nw-table">
            <thead>
              <tr>
                <th>{t('admin.username')}</th>
                <th>{t('common.name')}</th>
                <th>{t('admin.email')}</th>
                <th>{t('admin.role')}</th>
                <th>{t('admin.active')}</th>
                <th className="nw-table-th--right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((emp) => (
                <tr key={emp.id} className={`nw-table-row${emp.active ? '' : ' nw-row--muted'}`}>
                  <td>{emp.username}</td>
                  <td>{`${emp.first_name || ''} ${emp.last_name || ''}`.trim()}</td>
                  <td>{emp.email}</td>
                  <td>{emp.role ? t(`role.${emp.role}`) : ''}</td>
                  <td>
                    <span className={`type-chip${emp.active ? ' type-chip--success' : ' type-chip--muted'}`}>
                      {emp.active ? t('admin.active') : t('admin.inactive')}
                    </span>
                  </td>
                  <td className="nw-table-td--right">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => startEdit(emp)}>
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      className={`btn btn--ghost btn--sm${emp.active ? ' text-danger' : ''}`}
                      onClick={() => toggleActive(emp)}
                    >
                      {emp.active ? t('admin.inactive') : t('admin.active')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!toDeactivate}
        danger
        title={t('admin.deactivate_title')}
        body={
          toDeactivate
            ? t('admin.deactivate_body', {
                name: `${toDeactivate.first_name || ''} ${toDeactivate.last_name || ''}`.trim() || toDeactivate.username,
              })
            : ''
        }
        confirmLabel={t('common.confirm')}
        onConfirm={doDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  );
}
