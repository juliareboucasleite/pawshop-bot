const {
  getGuildConfig,
  setGuildConfig,
  updateGuildConfig,
  addReactionRole,
  removeReactionRolesForMessage,
} = require('../utils/store');
const { userCanManageGuild } = require('./userAuth');
const { fetchGuildResources } = require('../services/guildResources');
const {
  publishTicketPanel,
  publishVerificationPanel,
  publishReactionPanel,
} = require('../services/panelPublish');
const { sendCustomMessage } = require('../services/customMessage');
const {
  getReactionPanelsConfig,
  saveReactionPanel,
  publishReactionRolePanel,
  PANEL_KEYS,
} = require('../services/reactionRolePanels');
const { resolveEmojiForGuild } = require('../services/emojiResolve');

function sanitizeConfig(cfg, guildId) {
  const copy = JSON.parse(JSON.stringify(cfg));
  if (copy.verification?.registry) {
    copy.verification.registryCount = Object.keys(copy.verification.registry).length;
    delete copy.verification.registry;
  }
  if (copy.verification?.openWaitingThreads) {
    copy.verification.waitingThreadCount = Object.keys(copy.verification.openWaitingThreads).length;
    delete copy.verification.openWaitingThreads;
  }
  if (guildId) {
    copy.reactionRolePanels = getReactionPanelsConfig(guildId);
  }
  return copy;
}

async function requireGuildAccess(req, res, client, guildId) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Login necessário.' });
    return false;
  }
  try {
    const allowed = await userCanManageGuild(
      req.authUser.access_token,
      guildId,
      client,
      req.authUser.manageableGuildIds,
    );
    if (!allowed) {
      res.status(403).json({ error: 'Sem permissão para gerir este servidor.' });
      return false;
    }
    return true;
  } catch (err) {
    console.error('[guild-access]', err);
    res.status(403).json({ error: 'Não foi possível validar o acesso. Faz login novamente.' });
    return false;
  }
}

function registerGuildApi(router, client, basePath) {
  router.get('/api/guild/:guildId/resources', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const resources = await fetchGuildResources(client, guildId);
    if (!resources) return res.status(404).json({ error: 'Servidor não encontrado ou bot sem acesso.' });
    res.json(resources);
  });

  router.get('/api/guild/:guildId/config', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;
    res.json(sanitizeConfig(getGuildConfig(guildId), guildId));
  });

  router.patch('/api/guild/:guildId/verification', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const body = req.body || {};
    updateGuildConfig(guildId, (cfg) => ({
      ...cfg,
      verifiedRoleId: body.verifiedRoleId !== undefined ? (body.verifiedRoleId || null) : cfg.verifiedRoleId,
      verification: {
        ...cfg.verification,
        enabled: body.enabled ?? cfg.verification?.enabled ?? true,
        logChannelId: body.logChannelId !== undefined ? (body.logChannelId || null) : cfg.verification?.logChannelId,
        waitingChannelId: body.waitingChannelId !== undefined ? (body.waitingChannelId || null) : cfg.verification?.waitingChannelId,
        staffChatChannelId: body.staffChatChannelId !== undefined ? (body.staffChatChannelId || null) : cfg.verification?.staffChatChannelId,
        blockAlts: body.blockAlts ?? cfg.verification?.blockAlts ?? true,
        minAccountAgeDays: body.minAccountAgeDays ?? cfg.verification?.minAccountAgeDays ?? 30,
        requireAvatar: body.requireAvatar ?? cfg.verification?.requireAvatar ?? false,
      },
    }));

    res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
  });

  router.patch('/api/guild/:guildId/tickets', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const body = req.body || {};
    updateGuildConfig(guildId, (cfg) => ({
      ...cfg,
      ticketCategoryId: body.ticketCategoryId !== undefined ? (body.ticketCategoryId || null) : cfg.ticketCategoryId,
      supportRoleIds: Array.isArray(body.supportRoleIds) ? body.supportRoleIds : cfg.supportRoleIds,
      tickets: {
        ...cfg.tickets,
        panelTitle: body.panelTitle !== undefined ? body.panelTitle : cfg.tickets?.panelTitle,
        panelDescription: body.panelDescription !== undefined ? body.panelDescription : cfg.tickets?.panelDescription,
        welcomeTitle: body.welcomeTitle !== undefined ? body.welcomeTitle : cfg.tickets?.welcomeTitle,
        welcomeDescription: body.welcomeDescription !== undefined ? body.welcomeDescription : cfg.tickets?.welcomeDescription,
      },
    }));

    res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
  });

  router.patch('/api/guild/:guildId/autorole', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const body = req.body || {};
    if (!Array.isArray(body.autoroleIds)) {
      return res.status(400).json({ error: 'autoroleIds deve ser um array.' });
    }

    setGuildConfig(guildId, { autoroleIds: body.autoroleIds });
    res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
  });

  router.patch('/api/guild/:guildId/command-channels', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const body = req.body || {};
    updateGuildConfig(guildId, (cfg) => ({
      ...cfg,
      commandChannels: {
        enabled: body.enabled ?? cfg.commandChannels?.enabled ?? false,
        channelIds: Array.isArray(body.channelIds)
          ? body.channelIds.filter(Boolean)
          : (cfg.commandChannels?.channelIds || []),
      },
    }));

    res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
  });

  router.patch('/api/guild/:guildId/invite-blocker', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const body = req.body || {};
    const action = body.action === 'kick' ? 'kick' : body.action === 'mute' ? 'mute' : body.action === 'delete' ? 'delete' : (cfg.inviteBlocker?.action || 'delete');
    const muteMinutes = Math.min(Math.max(Number(body.muteMinutes) || 60, 1), 40320);

    updateGuildConfig(guildId, (cfg) => ({
      ...cfg,
      inviteBlocker: {
        enabled: body.enabled ?? cfg.inviteBlocker?.enabled ?? false,
        action,
        muteMinutes,
        logChannelId: body.logChannelId !== undefined
          ? (body.logChannelId || null)
          : (cfg.inviteBlocker?.logChannelId || null),
        exemptRoleIds: Array.isArray(body.exemptRoleIds)
          ? body.exemptRoleIds.filter(Boolean)
          : (cfg.inviteBlocker?.exemptRoleIds || []),
      },
    }));

    res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
  });

  router.patch('/api/guild/:guildId/welcome', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const body = req.body || {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    updateGuildConfig(guildId, (cfg) => ({
      ...cfg,
      welcome: {
        enabled: body.enabled ?? cfg.welcome?.enabled ?? false,
        channelId: body.channelId !== undefined
          ? (body.channelId || null)
          : (cfg.welcome?.channelId || null),
        message: message || cfg.welcome?.message || 'Oiii! {usuario}, bom proveito do servidor! espero que goste.',
      },
    }));

    res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
  });

  router.post('/api/guild/:guildId/custom-messages/send', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const { channelId, content } = req.body || {};
    if (!channelId) return res.status(400).json({ error: 'Escolhe um canal.' });

    try {
      const result = await sendCustomMessage(client, guildId, channelId, content);
      if (!result.ok) return res.status(400).json(result);
      return res.json(result);
    } catch (err) {
      console.error('[custom-message/send]', err);
      return res.status(400).json({ ok: false, error: err.message || 'Erro ao enviar.' });
    }
  });

  router.post('/api/guild/:guildId/custom-messages', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const body = req.body || {};

    if (body.action === 'delete') {
      if (!body.id) return res.status(400).json({ error: 'Modelo em falta.' });
      updateGuildConfig(guildId, (cfg) => ({
        ...cfg,
        customMessageDrafts: (cfg.customMessageDrafts || []).filter((d) => d.id !== body.id),
      }));
      return res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
    }

    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) return res.status(400).json({ error: 'Conteúdo em falta.' });

    const label = typeof body.label === 'string' && body.label.trim()
      ? body.label.trim().slice(0, 80)
      : `Modelo ${new Date().toLocaleDateString('pt-PT')}`;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      content,
      updatedAt: new Date().toISOString(),
    };

    updateGuildConfig(guildId, (cfg) => ({
      ...cfg,
      customMessageDrafts: [entry, ...(cfg.customMessageDrafts || [])].slice(0, 20),
    }));

    return res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
  });

  router.post('/api/guild/:guildId/reaction-roles', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const body = req.body || {};
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return res.status(404).json({ error: 'Servidor não encontrado.' });

    if (body.action === 'clear') {
      removeReactionRolesForMessage(guildId, body.messageId);
      return res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
    }

    if (body.action === 'remove') {
      updateGuildConfig(guildId, (cfg) => ({
        ...cfg,
        reactionRoles: cfg.reactionRoles.filter(
          (r) => !(r.messageId === body.messageId && r.emoji === body.emoji),
        ),
      }));
      return res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
    }

    if (body.action === 'add') {
      const { channelId, messageId, emoji, roleId } = body;
      if (!channelId || !messageId || !emoji || !roleId) {
        return res.status(400).json({ error: 'Campos em falta.' });
      }

      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased?.()) {
        return res.status(400).json({ error: 'Canal inválido.' });
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) return res.status(400).json({ error: 'Mensagem não encontrada.' });

      const role = guild.roles.cache.get(roleId);
      if (!role || role.managed || role.position >= guild.members.me.roles.highest.position) {
        return res.status(400).json({ error: 'Cargo inválido ou acima do bot.' });
      }

      await guild.emojis.fetch().catch(() => null);
      const resolved = await resolveEmojiForGuild(guild, emoji);
      if (!resolved) return res.status(400).json({ error: 'Emoji inválido.' });

      try {
        await message.react(resolved.react);
      } catch (err) {
        return res.status(400).json({ error: `Reação inválida: ${err.message}` });
      }

      addReactionRole(guildId, {
        messageId: message.id,
        channelId: message.channel.id,
        emoji: resolved.storeKey,
        roleId,
      });

      return res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
    }

    return res.status(400).json({ error: 'Ação inválida.' });
  });

  router.post('/api/guild/:guildId/publish/verification', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const channelId = req.body?.channelId;
    if (!channelId) return res.status(400).json({ error: 'Canal em falta.' });

    try {
      const result = await publishVerificationPanel(client, guildId, channelId);
      if (!result.ok) return res.status(400).json(result);
      return res.json(result);
    } catch (err) {
      console.error('[publish/verification]', err);
      return res.status(400).json({ ok: false, error: err.message || 'Erro ao publicar.' });
    }
  });

  router.post('/api/guild/:guildId/publish/tickets', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const channelId = req.body?.channelId;
    if (!channelId) return res.status(400).json({ error: 'Canal em falta.' });

    try {
      const result = await publishTicketPanel(client, guildId, channelId);
      if (!result.ok) return res.status(400).json(result);
      return res.json(result);
    } catch (err) {
      console.error('[publish/tickets]', err);
      return res.status(400).json({ ok: false, error: err.message || 'Erro ao publicar.' });
    }
  });

  router.post('/api/guild/:guildId/publish/reaction-panel', async (req, res) => {
    const { guildId } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;

    const { channelId, title, description } = req.body || {};
    if (!channelId) return res.status(400).json({ error: 'Canal em falta.' });

    try {
      const result = await publishReactionPanel(client, guildId, channelId, title, description);
      if (!result.ok) return res.status(400).json(result);
      return res.json(result);
    } catch (err) {
      console.error('[publish/reaction-panel]', err);
      return res.status(400).json({ ok: false, error: err.message || 'Erro ao publicar.' });
    }
  });

  router.patch('/api/guild/:guildId/reaction-panels/:panelKey', async (req, res) => {
    const { guildId, panelKey } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;
    if (!PANEL_KEYS.includes(panelKey)) {
      return res.status(400).json({ error: 'Painel inválido.' });
    }

    const body = req.body || {};
    saveReactionPanel(guildId, panelKey, {
      title: body.title,
      description: body.description,
      exclusive: body.exclusive,
      entries: body.entries,
    });

    return res.json({ ok: true, config: sanitizeConfig(getGuildConfig(guildId), guildId) });
  });

  router.post('/api/guild/:guildId/reaction-panels/:panelKey/publish', async (req, res) => {
    const { guildId, panelKey } = req.params;
    if (!(await requireGuildAccess(req, res, client, guildId))) return;
    if (!PANEL_KEYS.includes(panelKey)) {
      return res.status(400).json({ error: 'Painel inválido.' });
    }

    const channelId = req.body?.channelId;
    if (!channelId) return res.status(400).json({ error: 'Escolhe um canal.' });

    try {
      const result = await publishReactionRolePanel(client, guildId, channelId, panelKey);
      if (!result.ok) return res.status(400).json(result);
      return res.json({
        ...result,
        config: sanitizeConfig(getGuildConfig(guildId), guildId),
      });
    } catch (err) {
      console.error('[reaction-panels/publish]', err);
      return res.status(400).json({ ok: false, error: err.message || 'Erro ao publicar.' });
    }
  });
}

module.exports = { registerGuildApi, sanitizeConfig };
