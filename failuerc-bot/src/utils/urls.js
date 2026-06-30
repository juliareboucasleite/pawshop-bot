function getBasePath() {
  const raw = process.env.BASE_PATH || '';
  if (!raw) return '';
  const trimmed = raw.replace(/\/$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function getPublicOrigin() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const port = process.env.PORT || 3003;
  return `http://localhost:${port}`;
}

function buildVerifyUrl(guildId) {
  return `${getPublicOrigin()}${getBasePath()}/auth/login?guild=${guildId}`;
}

module.exports = { getBasePath, getPublicOrigin, buildVerifyUrl };
