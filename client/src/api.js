// Small wrapper around fetch: adds the login token and turns errors into exceptions.

// Reads the token saved at login and puts it in the Authorization header.
function authHeaders() {
  const token = localStorage.getItem('token');
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

// Files need the token too, so we can't use a plain <a href> or <img src>.
// Instead we download the file with fetch and give the browser a temporary
// in-memory address for it (a "blob" URL like blob:http://localhost:5173/abc...).
// Call URL.revokeObjectURL(url) when it's no longer needed to free the memory.
export async function fetchDocumentFileUrl(id) {
  const res = await fetch(`/api/documents/${id}/file`, { headers: authHeaders() });
  if (!res.ok) {
    handleExpiredSession(res, '');
    throw new Error('Could not load the file');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
