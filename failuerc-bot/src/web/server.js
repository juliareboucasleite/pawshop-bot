const express = require('express');
const session = require('express-session');
const path = require('node:path');
const config = require('../../config/default.json');
const { getBasePath } = require('../utils/urls');
const { FileSessionStore } = require('./fileSessionStore');
const { renderHomePage, renderStaticPage, renderStatusPage, STATIC_PAGES } = require('./pages');
const {
  renderComandosPage,
  renderWikiPage,
  renderPremiumPage,
} = require('./renderers');
const { renderUserDashboardPage, renderUserLoginPage } = require('./userDashboard');
const {
  loginUrl,
  avatarUrl,
  exchangeUserCode,
  fetchDiscordUser,
  ensureUserSession,
  sessionMaxAgeMs,
  isSecureSite,
  userCanManageGuild,
  refreshManageableGuildIds,
  getUserDashboardGuilds,
} = require('./userAuth');
const { loadGuildDashboard } = require('../services/guildDashboard');
const { fetchGuildResources } = require('../services/guildResources');
const { getGuildConfig } = require('../utils/store');
const { renderGuildDashboardPage, renderGuildAccessDenied } = require('./guildDashboard');
const { registerGuildApi, sanitizeConfig } = require('./guildApi');
const { createOAuthState, verifyOAuthState } = require('./oauthState');
const { loadAuthUser, setAuthCookie, clearAuthCookie } = require('./authCookie');
const painelMenu = require('../../config/painel-menu.json');
const { listParceiros, getStats } = require('../services/parceiros');

function sessionUser(req) {
  const user = req.authUser;
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    avatarUrl: avatarUrl(user),
  };
}

function noCache(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

function createWebServer(client) {
  const app = express();
  app.set('trust proxy', 1);

  const basePath = getBasePath();
  const router = express.Router();
  const sessionDir = path.join(__dirname, '..', '..', 'data', 'sessions');
  const cookiePath = basePath || '/';

  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));
  router.use(
    session({
      name: 'failuerc.sid',
      secret: process.env.SESSION_SECRET || 'dev-secret-troque-isso',
      store: new FileSessionStore({ dir: sessionDir }),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      proxy: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isSecureSite(),
        path: cookiePath,
        maxAge: sessionMaxAgeMs(),
      },
    }),
  );

  router.use(async (req, res, next) => {
    req.authUser = loadAuthUser(req);
    if (req.authUser) {
      const valid = await ensureUserSession(req, res, basePath);
      if (!valid) {
        req.authUser = null;
        clearAuthCookie(res, basePath);
      }
    }
    next();
  });

  router.use('/public', express.static(path.join(__dirname, 'public')));

  function siteContext(req) {
    return {
      parceiros: listParceiros(),
      stats: getStats(),
      clientId: process.env.CLIENT_ID,
      user: sessionUser(req),
    };
  }

  router.get('/', (req, res) => {
    const { parceiros, stats, clientId, user } = siteContext(req);
    res.type('html').send(renderHomePage(basePath, clientId, parceiros, stats, user));
  });

  for (const slug of STATIC_PAGES) {
    router.get(`/${slug}`, (req, res) => {
      const { stats, clientId, user } = siteContext(req);
      const html = renderStaticPage(basePath, clientId, stats, slug, user);
      if (!html) return res.status(404).send('Página não encontrada.');
      res.type('html').send(html);
    });
  }

  router.get('/comandos', (req, res) => {
    const { stats, clientId, user } = siteContext(req);
    res.type('html').send(renderComandosPage(basePath, clientId, stats, user));
  });

  router.get('/wiki', (req, res) => {
    const { stats, clientId, user } = siteContext(req);
    res.type('html').send(renderWikiPage(basePath, clientId, stats, user));
  });

  router.get('/premium', (req, res) => {
    const { stats, clientId, user } = siteContext(req);
    res.type('html').send(renderPremiumPage(basePath, clientId, stats, user));
  });

  router.get('/painel', async (req, res) => {
    noCache(res);
    const { stats, clientId, user } = siteContext(req);
    const loginError = typeof req.query.erro === 'string' ? req.query.erro : null;

    if (!user) {
      return res.type('html').send(renderUserLoginPage(basePath, clientId, stats, loginError));
    }

    try {
      const { configurable, stats: guildStats } = await getUserDashboardGuilds(
        client,
        req.authUser.access_token,
      );
      res.type('html').send(renderUserDashboardPage({
        basePath,
        clientId,
        stats,
        user,
        activeId: 'servidores',
        guilds: configurable,
        guildStats,
      }));
    } catch (err) {
      console.error('[painel]', err);
      res.type('html').send(renderUserDashboardPage({
        basePath,
        clientId,
        stats,
        user,
        activeId: 'servidores',
        error: 'Não foi possível carregar os servidores. Tenta fazer login novamente.',
      }));
    }
  });

  router.get('/painel/secao/:sectionId', async (req, res) => {
    const { stats, clientId, user } = siteContext(req);
    if (!user) {
      return res.redirect(`${basePath}/login?next=${encodeURIComponent(req.originalUrl.replace(basePath, '') || '/painel')}`);
    }

    res.type('html').send(renderUserDashboardPage({
      basePath,
      clientId,
      stats,
      user,
      activeId: req.params.sectionId,
    }));
  });

  const validSections = new Set(
    painelMenu.secoes.flatMap((g) => g.itens.map((i) => i.id)),
  );

  async function handleGuildDashboard(req, res, guildId, sectionId = 'visao-geral') {
    const { stats, clientId, user } = siteContext(req);
    if (!user) {
      return res.redirect(`${basePath}/login?next=${encodeURIComponent(`/painel/guild/${guildId}/${sectionId}`)}`);
    }

    if (!validSections.has(sectionId)) {
      return res.redirect(`${basePath}/painel/guild/${guildId}/visao-geral`);
    }

    try {
      const allowed = await userCanManageGuild(
        req.authUser.access_token,
        guildId,
        client,
        req.authUser.manageableGuildIds,
      );
      if (!allowed) {
        return res.type('html').send(renderGuildAccessDenied(basePath, clientId, stats, user));
      }

      let manageableGuildIds = req.authUser.manageableGuildIds || [];
      try {
        manageableGuildIds = await refreshManageableGuildIds(req.authUser.access_token);
        if (manageableGuildIds.length) {
          req.authUser.manageableGuildIds = manageableGuildIds;
          setAuthCookie(res, req.authUser, basePath, sessionMaxAgeMs());
        }
      } catch (err) {
        console.error('[guild-dashboard] guilds:', err.message);
      }

      const guildData = await loadGuildDashboard(client, guildId);
      if (!guildData) {
        return res.type('html').send(renderGuildAccessDenied(basePath, clientId, stats, user));
      }

      const resources = await fetchGuildResources(client, guildId);
      const bootstrap = resources
        ? { resources, config: sanitizeConfig(getGuildConfig(guildId), guildId) }
        : null;

      res.type('html').send(renderGuildDashboardPage(
        basePath,
        clientId,
        stats,
        user,
        guildData,
        sectionId,
        bootstrap,
      ));
    } catch (err) {
      console.error('[guild-dashboard]', err);
      res.type('html').send(renderUserDashboardPage({
        basePath,
        clientId,
        stats,
        user,
        activeId: 'servidores',
        error: 'Erro ao carregar o painel do servidor.',
      }));
    }
  }

  router.get('/painel/guild/:guildId', (req, res) => {
    handleGuildDashboard(req, res, req.params.guildId, 'visao-geral');
  });

  router.get('/painel/guild/:guildId/:section', (req, res) => {
    handleGuildDashboard(req, res, req.params.guildId, req.params.section);
  });

  router.get('/login', (req, res) => {
    const next = typeof req.query.next === 'string' ? req.query.next : '/painel';
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/painel';
    const state = createOAuthState(safeNext);
    res.redirect(loginUrl(basePath, process.env.CLIENT_ID, state));
  });

  router.get('/auth/user/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${basePath}/painel?erro=${encodeURIComponent('Login cancelado.')}`);
    }

    const next = verifyOAuthState(state);
    if (!next) {
      return res.redirect(`${basePath}/painel?erro=${encodeURIComponent('Sessão de login expirada. Tenta novamente.')}`);
    }

    try {
      const tokenData = await exchangeUserCode(code, basePath);
      const user = await fetchDiscordUser(tokenData.access_token);
      let manageableGuildIds = [];
      try {
        manageableGuildIds = await refreshManageableGuildIds(tokenData.access_token);
      } catch (err) {
        console.error('[user-auth] guilds:', err.message);
      }

      req.authUser = {
        id: user.id,
        username: user.global_name || user.username,
        avatar: user.avatar,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + (tokenData.expires_in || 604800) * 1000,
        manageableGuildIds,
      };

      setAuthCookie(res, req.authUser, basePath, sessionMaxAgeMs());
      res.redirect(`${basePath}${next.startsWith('/') ? next : `/${next}`}`);
    } catch (err) {
      console.error('[user-auth]', err);
      res.redirect(`${basePath}/painel?erro=${encodeURIComponent(err.message)}`);
    }
  });

  router.get('/logout', (req, res) => {
    delete req.session.user;
    clearAuthCookie(res, basePath);
    res.redirect(`${basePath}/`);
  });

  router.get('/api/parceiros', (_req, res) => {
    res.json({ stats: getStats(), parceiros: listParceiros() });
  });

  registerGuildApi(router, client, basePath);

  router.get('/auth/login', async (req, res) => {
    const guildId = req.query.guild;
    if (!guildId) {
      return res.redirect(`${basePath}/?erro=${encodeURIComponent('Link de verificação inválido. Usa o botão no Discord.')}`);
    }

    req.session.oauthGuildId = guildId;
    req.session.oauthState = Math.random().toString(36).slice(2);

    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      response_type: 'code',
      scope: 'identify',
      state: req.session.oauthState,
    });

    try {
      await saveSession(req);
      res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
    } catch (err) {
      console.error('[verify-login]', err);
      res.redirect(`${basePath}/?erro=${encodeURIComponent('Erro ao iniciar verificação.')}`);
    }
  });

  router.get('/auth/callback', async (req, res) => {
    const { code, state } = req.query;
    const guildId = req.session.oauthGuildId;

    if (!code || !guildId) {
      return res.redirect(`${basePath}/verify/erro?msg=${encodeURIComponent('Sessão inválida.')}`);
    }

    if (state !== req.session.oauthState) {
      return res.redirect(`${basePath}/verify/erro?msg=${encodeURIComponent('State OAuth inválido.')}`);
    }

    try {
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.REDIRECT_URI,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokenData.error_description || tokenData.error || 'Token falhou');
      }

      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const user = await userRes.json();
      if (!userRes.ok) throw new Error('Não foi possível obter o utilizador.');

      const { verifyMember } = require('../services/verification');
      const { hashIp } = require('../services/altDetection');
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || '';
      const result = await verifyMember(client, guildId, user.id, { ipHash: hashIp(ip) });

      if (!result.ok) {
        const errQs = new URLSearchParams({ msg: result.error });
        if (result.isAlt) errQs.set('alt', '1');
        return res.redirect(`${basePath}/verify/erro?${errQs}`);
      }

      const qs = new URLSearchParams({
        guild: result.guildName,
        role: result.roleName,
        already: result.already ? '1' : '0',
      });
      res.redirect(`${basePath}/verify/sucesso?${qs}`);
    } catch (err) {
      console.error('[oauth]', err);
      res.redirect(`${basePath}/verify/erro?msg=${encodeURIComponent(err.message)}`);
    }
  });

  router.get('/verify/sucesso', (req, res) => {
    const { stats, clientId, user } = siteContext(req);
    res.type('html').send(renderStatusPage({
      basePath,
      clientId,
      stats,
      user,
      titulo: config.verificacao.sucessoTitulo,
      descricao: config.verificacao.sucessoDescricao,
      ok: true,
      extra: req.query.already === '1'
        ? `Já tinhas o cargo ${req.query.role} em ${req.query.guild}.`
        : `Recebeste o cargo ${req.query.role} em ${req.query.guild}.`,
    }));
  });

  router.get('/verify/erro', (req, res) => {
    const { stats, clientId, user } = siteContext(req);
    const isAlt = req.query.alt === '1';
    res.type('html').send(renderStatusPage({
      basePath,
      clientId,
      stats,
      user,
      titulo: isAlt ? config.verificacao.altErroTitulo : 'Verificação falhou',
      descricao: req.query.msg || (isAlt ? config.verificacao.altErroDescricao : 'Ocorreu um erro desconhecido.'),
      ok: false,
    }));
  });

  app.use(basePath || '/', router);
  return app;
}

module.exports = { createWebServer };
