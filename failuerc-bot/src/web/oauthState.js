const crypto = require('node:crypto');

function oauthSecret() {
  return process.env.SESSION_SECRET || 'dev-secret-troque-isso';
}

function createOAuthState(nextPath) {
  const payload = {
    n: nextPath,
    r: crypto.randomBytes(12).toString('hex'),
    t: Date.now(),
  };
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', oauthSecret()).update(body).digest('hex');
  return Buffer.from(JSON.stringify({ p: body, s: sig })).toString('base64url');
}

function verifyOAuthState(state, maxAgeMs = 15 * 60 * 1000) {
  if (!state || typeof state !== 'string') return null;
  try {
    const { p, s } = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    const expected = crypto.createHmac('sha256', oauthSecret()).update(p).digest('hex');
    if (s !== expected) return null;
    const data = JSON.parse(p);
    if (Date.now() - data.t > maxAgeMs) return null;
    if (!data.n || typeof data.n !== 'string') return null;
    if (!data.n.startsWith('/') || data.n.startsWith('//')) return '/painel';
    return data.n;
  } catch {
    return null;
  }
}

module.exports = { createOAuthState, verifyOAuthState };
