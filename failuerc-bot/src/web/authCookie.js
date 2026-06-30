const crypto = require('node:crypto');

function authSecret() {
  return process.env.SESSION_SECRET || 'dev-secret-troque-isso';
}

function createAuthToken(userData) {
  const payload = {
    id: userData.id,
    username: userData.username,
    avatar: userData.avatar,
    access_token: userData.access_token,
    refresh_token: userData.refresh_token,
    expires_at: userData.expires_at,
    manageableGuildIds: userData.manageableGuildIds || [],
    v: 1,
  };
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', authSecret()).update(body).digest('hex');
  return Buffer.from(JSON.stringify({ p: body, s: sig })).toString('base64url');
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const { p, s } = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const expected = crypto.createHmac('sha256', authSecret()).update(p).digest('hex');
    if (s !== expected) return null;
    const data = JSON.parse(p);
    if (!data.id || !data.access_token) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const idx = part.indexOf('=');
      if (idx === -1) return [part.trim(), ''];
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      try {
        return [key, decodeURIComponent(val)];
      } catch {
        return [key, val];
      }
    }),
  );
}

function cookiePath(basePath) {
  const p = basePath || '/';
  return p.endsWith('/') ? p.slice(0, -1) || '/' : p;
}

function setAuthCookie(res, userData, basePath, maxAgeMs) {
  const token = createAuthToken(userData);
  const parts = [
    `failuerc.auth=${encodeURIComponent(token)}`,
    `Path=${cookiePath(basePath)}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  if (process.env.PUBLIC_URL?.startsWith('https://') || process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  res.append('Set-Cookie', parts.join('; '));
}

function clearAuthCookie(res, basePath) {
  const parts = [
    'failuerc.auth=',
    `Path=${cookiePath(basePath)}`,
    'HttpOnly',
    'Max-Age=0',
  ];
  if (process.env.PUBLIC_URL?.startsWith('https://') || process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  res.append('Set-Cookie', parts.join('; '));
}

function loadAuthUser(req) {
  const token = parseCookies(req)['failuerc.auth'];
  return token ? verifyAuthToken(token) : null;
}

module.exports = {
  createAuthToken,
  verifyAuthToken,
  parseCookies,
  setAuthCookie,
  clearAuthCookie,
  loadAuthUser,
};
