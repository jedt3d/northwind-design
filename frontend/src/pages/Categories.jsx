import { useEffect, useState } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { pb, errMsg } from '../pb';
import { useT } from '../i18n/index.jsx';
import FormField from '../components/FormField.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Categories() {
  const { t } = useT();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | record
  const [form, setForm] = useState({ category_name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const load = () => {
    pb.collection('product_categories')
      .getList(1, 200, { sort: 'category_name' })
      .then((r) => setItems(r.items))
      .catch((err) => {
        setItems([]);
        setError(errMsg(err));
      });
  };

  useEffect(load, []);

  const startNew = () => {
    setEditing('new');
    setForm({ category_name: '', description: '' });
    setError('');
  };
  const startEdit = (c) => {
    setEditing(c);
    setForm({ category_name: c.category_name, description: c.description || '' });
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        await pb.collection('product_categories').create(form);
      } else {
        await pb.collection('product_categories').update(editing.id, form);
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

  const doDelete = async () => {
    try {
      await pb.collection('product_categories').delete(toDelete.id);
      toast(t('common.deleted'), 'success');
      setToDelete(null);
      load();
    } catch (err) {
      setToDelete(null);
      toast(errMsg(err), 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('categories.title')}</h1>
        <div className="page-actions">
          <button type="button" className="btn btn--primary" onClick={startNew}>
            <Plus aria-hidden="true" />
            {t('categories.new')}
          </button>
        </div>
      </div>

      {editing !== null && (
        <form className="panel inline-form" onSubmit={save}>
          <h2 className="panel-title">{editing === 'new' ? t('categories.new') : t('categories.edit_title')}</h2>
          {error && (
            <div className="banner banner--error" role="alert">
              {error}
            </div>
          )}
          <div className="form-grid">
            <FormField label={t('categories.name')} required htmlFor="cat-name">
              <input
                id="cat-name"
                className="input"
                value={form.category_name}
                onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
                required
              />
            </FormField>
            <FormField label={t('categories.description')} htmlFor="cat-desc">
              <input
                id="cat-desc"
                className="input"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
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
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Inbox className="empty-state-icon" aria-hidden="true" />
          <div className="empty-state-title">{t('categories.empty')}</div>
        </div>
      ) : (
        <div className="nw-table-wrap nw-table-wrap--always">
          <table className="nw-table">
            <thead>
              <tr>
                <th>{t('categories.name')}</th>
                <th>{t('categories.description')}</th>
                <th className="nw-table-th--right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="nw-table-row">
                  <td>{c.category_name}</td>
                  <td>{c.description}</td>
                  <td className="nw-table-td--right">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => startEdit(c)}>
                      {t('common.edit')}
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm text-danger" onClick={() => setToDelete(c)}>
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        danger
        body={toDelete ? t('categories.delete_confirm', { name: toDelete.category_name }) : ''}
        confirmLabel={t('common.delete')}
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
