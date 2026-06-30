const { setAuthCookie } = require('./authCookie');

const MANAGE_GUILD = 0x20n;

function loginUrl(basePath, clientId, state) {
  const redirectUri = process.env.USER_REDIRECT_URI
    || `${process.env.PUBLIC_URL || 'http://localhost:3003'}${basePath}/auth/user/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds',
    state,
  });

  return `https://discord.com/api/oauth2/authorize?${params}`;
}

function userRedirectUri(basePath) {
  return process.env.USER_REDIRECT_URI
    || `${(process.env.PUBLIC_URL || 'http://localhost:3003').replace(/\/$/, '')}${basePath}/auth/user/callback`;
}

function avatarUrl(user) {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  }
  const idx = Number(BigInt(user.id) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

async function exchangeUserCode(code, basePath) {
  const redirectUri = userRedirectUri(basePath);
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Login falhou');
  return data;
}

async function refreshUserToken(refreshToken) {
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Sessão expirada.');
  return data;
}

const REFRESH_BUFFER_MS = 10 * 60 * 1000;

async function ensureUserSession(req, res, basePath) {
  const user = req.authUser;
  if (!user) return null;

  const stillValid = user.expires_at && user.expires_at > Date.now() + REFRESH_BUFFER_MS;
  if (stillValid) return user;

  if (!user.refresh_token) {
    if (user.expires_at && user.expires_at > Date.now()) return user;
    return null;
  }

  try {
    const tokenData = await refreshUserToken(user.refresh_token);
    const discordUser = await fetchDiscordUser(tokenData.access_token);
    const updated = {
      id: discordUser.id,
      username: discordUser.global_name || discordUser.username,
      avatar: discordUser.avatar,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || user.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in || 604800) * 1000,
    };
    req.authUser = updated;
    if (res) {
      setAuthCookie(res, updated, basePath, sessionMaxAgeMs());
    }
    return updated;
  } catch {
    if (user.expires_at && user.expires_at > Date.now()) return user;
    return null;
  }
}

function sessionMaxAgeMs() {
  const days = Number(process.env.SESSION_MAX_AGE_DAYS) || 30;
  return 1000 * 60 * 60 * 24 * days;
}

function isSecureSite() {
  const url = process.env.PUBLIC_URL || '';
  return url.startsWith('https://') || process.env.NODE_ENV === 'production';
}

async function fetchDiscordUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const user = await res.json();
  if (!res.ok) throw new Error('Não foi possível obter o utilizador.');
  return user;
}

async function fetchUserGuilds(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const guilds = await res.json();
  if (!res.ok) {
    const msg = guilds?.message || guilds?.error_description || 'Não foi possível obter os servidores.';
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return guilds;
}

async function refreshManageableGuildIds(accessToken) {
  const guilds = await fetchUserGuilds(accessToken);
  return filterManageableGuilds(guilds).map((g) => g.id);
}

function filterManageableGuilds(guilds) {
  return guilds.filter((g) => (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD);
}

async function userCanManageGuild(accessToken, guildId, client, cachedIds = []) {
  const botGuild = await client.guilds.fetch(guildId).catch(() => null);
  if (!botGuild) return false;

  try {
    const ids = await refreshManageableGuildIds(accessToken);
    return ids.includes(guildId);
  } catch (err) {
    console.error('[userCanManageGuild]', err.message);
    return Array.isArray(cachedIds) && cachedIds.includes(guildId);
  }
}

async function getUserDashboardGuilds(client, accessToken) {
  const guilds = await fetchUserGuilds(accessToken);
  const botGuildIds = new Set(client.guilds.cache.map((g) => g.id));
  const inBot = guilds.filter((g) => botGuildIds.has(g.id));
  const manageable = filterManageableGuilds(inBot);

  const mapGuild = (g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    iconUrl: g.icon
      ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(g.id) % 5n)}.png`,
    owner: g.owner,
  });

  return {
    configurable: manageable.map(mapGuild).sort((a, b) => a.name.localeCompare(b.name)),
    stats: {
      configuravel: manageable.length,
      total: inBot.length,
    },
  };
}

async function getPainelGuilds(client, accessToken) {
  const { configurable } = await getUserDashboardGuilds(client, accessToken);
  return configurable;
}

module.exports = {
  loginUrl,
  userRedirectUri,
  avatarUrl,
  exchangeUserCode,
  refreshUserToken,
  ensureUserSession,
  sessionMaxAgeMs,
  isSecureSite,
  fetchDiscordUser,
  refreshManageableGuildIds,
  userCanManageGuild,
  getUserDashboardGuilds,
  getPainelGuilds,
};
