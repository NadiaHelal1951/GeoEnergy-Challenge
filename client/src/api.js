// Small wrapper around fetch: adds the login token and turns errors into exceptions.

export function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// If the server says our token is invalid/expired, clear it and go back to the login page.
function handleExpiredSession(res, path) {
  if (res.status === 401 && path !== '/auth/login') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

export async function api(path, options = {}) {
  const headers = { ...authHeaders(), ...options.headers };

  // Send JSON unless we're uploading a file (FormData sets its own Content-Type).
  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { ...options, headers, body });
  handleExpiredSession(res, path);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// Files need the token too, so we can't use a plain <a href>. Instead we download
// the file with fetch and open it in a new tab from memory (a "blob" URL).
export async function openDocumentFile(id) {
  const tab = window.open('', '_blank'); // open the tab now, before the await, so popup blockers allow it
  const res = await fetch(`/api/documents/${id}/file`, { headers: authHeaders() });
  if (!res.ok) {
    tab?.close();
    handleExpiredSession(res, '');
    throw new Error('Could not open the file');
  }
  const blob = await res.blob();
  tab.location.href = URL.createObjectURL(blob);
}
