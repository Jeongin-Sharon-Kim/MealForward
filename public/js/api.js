const CURRENT_YEAR_MONTH = '202609';
const SESSION_KEY = 'mf_session';

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireUserSession() {
  const session = getSession();
  if (!session || session.role !== 'user') {
    window.location.href = '/login.html';
    return null;
  }
  return session;
}

function requireAdminSession() {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    window.location.href = '/login.html';
    return null;
  }
  return session;
}

async function api(path, options = {}) {
  const session = getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session && session.role === 'admin') {
    headers['x-admin-id'] = session.id;
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
