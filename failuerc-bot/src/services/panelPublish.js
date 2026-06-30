const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../utils/store');
const { ticketPanel, verificationPanel, reactionRolePanel } = require('../utils/embeds');
const { ticketOpenButton, verifyButton } = require('../utils/components');
const { buildVerifyUrl } = require('../utils/urls');

async function resolveBotMember(guild) {
  if (guild.members.me) return guild.members.me;
  return guild.members.fetchMe().catch(() => null);
}

function checkPublishPermissions(channel, botMember) {
  if (!botMember) {
    return 'O bot não está no servidor ou não foi possível obter o membro do Failuerc.';
  }

  const perms = channel.permissionsFor(botMember);
  if (!perms) {
    return 'O bot não consegue ver este canal. Verifica as permissões do cargo do Failuerc.';
  }

  const required = [
    [PermissionFlagsBits.ViewChannel, 'Ver Canal'],
    [PermissionFlagsBits.SendMessages, 'Enviar Mensagens'],
    [PermissionFlagsBits.EmbedLinks, 'Inserir Links'],
  ];

  const missing = required.filter(([flag]) => !perms.has(flag)).map(([, label]) => label);
  if (missing.length) {
    return `O bot não tem permissão neste canal: ${missing.join(', ')}. Ajusta as permissões do cargo do Failuerc ou escolhe outro canal.`;
  }

  return null;
}

function discordSendError(err) {
  if (err?.code === 50013) {
    return 'O bot não tem permissão para enviar mensagens neste canal. Dá ao Failuerc permissão de Administrador ou ativa Ver Canal + Enviar Mensagens + Inserir Links no canal escolhido.';
  }
  if (err?.code === 50001) {
    return 'O bot não tem acesso a este canal.';
  }
  return err?.message || 'Erro ao publicar no Discord.';
}

async function sendPanelMessage(channel, guild, payload) {
  const botMember = await resolveBotMember(guild);
  const permError = checkPublishPermissions(channel, botMember);
  if (permError) return { ok: false, error: permError };

  try {
    const msg = await channel.send(payload);
    return { ok: true, msg };
  } catch (err) {
    console.error('[panel-publish]', channel.id, err.code || err.message);
    return { ok: false, error: discordSendError(err) };
  }
}

async function publishTicketPanel(client, guildId, channelId) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, error: 'Servidor não encontrado.' };

  const cfg = getGuildConfig(guildId);
  if (!cfg.ticketCategoryId) {
    return { ok: false, error: 'Define a categoria de tickets e guarda antes de publicar.' };
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    return { ok: false, error: 'Canal inválido ou inacessível pelo bot.' };
  }

  const panel = ticketPanel(cfg.tickets?.panelTitle, cfg.tickets?.panelDescription);
  const sent = await sendPanelMessage(channel, guild, {
    embeds: [new EmbedBuilder(panel)],
    components: [ticketOpenButton()],
  });
  if (!sent.ok) return sent;

  setGuildConfig(guildId, {
    tickets: {
      ...cfg.tickets,
      channelId: sent.msg.channel.id,
      messageId: sent.msg.id,
    },
  });

  return { ok: true, url: sent.msg.url, channelId: sent.msg.channel.id };
}

async function publishVerificationPanel(client, guildId, channelId) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, error: 'Servidor não encontrado.' };

  const cfg = getGuildConfig(guildId);
  if (!cfg.verifiedRoleId) {
    return { ok: false, error: 'Define o cargo verificado e guarda antes de publicar.' };
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    return { ok: false, error: 'Canal inválido ou inacessível pelo bot.' };
  }

  const verifyUrl = buildVerifyUrl(guildId);
  const sent = await sendPanelMessage(channel, guild, {
    embeds: [new EmbedBuilder(verificationPanel(guild.name, verifyUrl))],
    components: [verifyButton(verifyUrl)],
  });
  if (!sent.ok) return sent;

  setGuildConfig(guildId, {
    verification: {
      ...cfg.verification,
      channelId: sent.msg.channel.id,
      messageId: sent.msg.id,
    },
  });

  return { ok: true, url: sent.msg.url, channelId: sent.msg.channel.id };
}

async function publishReactionPanel(client, guildId, channelId, title, description) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, error: 'Servidor não encontrado.' };

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    return { ok: false, error: 'Canal inválido ou inacessível pelo bot.' };
  }

  const sent = await sendPanelMessage(channel, guild, {
    embeds: [new EmbedBuilder(reactionRolePanel(title, description))],
  });
  if (!sent.ok) return sent;

  return { ok: true, url: sent.msg.url, messageId: sent.msg.id, channelId: sent.msg.channel.id };
}

module.exports = {
  publishTicketPanel,
  publishVerificationPanel,
  publishReactionPanel,
  checkPublishPermissions,
  sendPanelMessage,
  discordSendError,
  resolveBotMember,
};
