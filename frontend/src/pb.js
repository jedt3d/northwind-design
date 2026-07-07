import PocketBase from 'pocketbase';

function baseUrl() {
  // In production the frontend is served by the same PocketBase (behind nginx).
  if (import.meta.env.PROD) return import.meta.env.VITE_PB_URL || window.location.origin;
  return import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090';
}

export const pb = new PocketBase(baseUrl());
// Several views fetch the same collection in parallel (dashboard, pickers).
pb.autoCancellation(false);

export function currentUser() {
  return pb.authStore.record || null;
}

export function currentRole() {
  return (pb.authStore.record && pb.authStore.record.role) || '';
}

export async function login(identity, password) {
  return pb.collection('employees').authWithPassword(identity, password);
}

export function logout() {
  pb.authStore.clear();
}

/** Extract a human readable message from a PocketBase ClientResponseError. */
export function errMsg(err) {
  if (!err) return 'Unknown error';
  const data = err.response || err.data || {};
  // field-level validation errors: {data:{field:{message}}}
  if (data.data && typeof data.data === 'object') {
    const fields = Object.entries(data.data)
      .map(([k, v]) => (v && v.message ? `${k}: ${v.message}` : ''))
      .filter(Boolean);
    if (fields.length) return `${data.message || 'Invalid data.'} ${fields.join(' ')}`;
  }
  return data.message || err.message || String(err);
}
