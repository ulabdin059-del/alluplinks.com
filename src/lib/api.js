export class ApiError extends Error {
  constructor(message, status, errors) { super(message); this.status = status; this.errors = errors || {}; }
}

export async function api(path, { method = 'GET', body, form, admin = false } = {}) {
  const headers = {};
  if (admin) headers['X-Requested-With'] = 'alluplinks-admin';
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    throw new ApiError('Network error — please check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong.', res.status, data.errors);
  return data;
}

export const adminApi = (path, opts = {}) => api('/admin' + path, { ...opts, admin: true });
