const { getGuildConfig } = require('../utils/store');
const config = require('../../config/default.json');
const { ensureGuildData } = require('./guildResources');

function roleLabel(guild, roleId) {
  if (!roleId) return '—';
  const role = guild?.roles?.cache?.get(roleId);
  return role ? role.name : `\`${roleId}\``;
}

function channelLabel(guild, channelId) {
  if (!channelId) return '—';
  const ch = guild?.channels?.cache?.get(channelId);
  return ch ? `#${ch.name}` : `\`${channelId}\``;
}

async function loadGuildDashboard(client, guildId) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;

  await ensureGuildData(guild);
  await guild.members.fetch().catch(() => null);
  const cfg = getGuildConfig(guildId);
  const openTickets = cfg.openTickets || {};
  const openTicketCount = Object.keys(openTickets).length;

  return {
    id: guild.id,
    name: guild.name,
    iconUrl: guild.iconURL({ size: 128 }) || `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(guild.id) % 5n)}.png`,
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
    cfg,
    prefix: config.bot.prefix,
    stats: {
      reactionRoles: cfg.reactionRoles?.length || 0,
      autoroles: cfg.autoroleIds?.length || 0,
      openTickets: openTicketCount,
      verificationActive: Boolean(cfg.verification?.messageId),
      ticketsActive: Boolean(cfg.tickets?.messageId),
    },
    labels: {
      verifiedRole: roleLabel(guild, cfg.verifiedRoleId),
      ticketCategory: channelLabel(guild, cfg.ticketCategoryId),
      verificationChannel: channelLabel(guild, cfg.verification?.channelId),
      verificationLog: channelLabel(guild, cfg.verification?.logChannelId),
      verificationWaiting: channelLabel(guild, cfg.verification?.waitingChannelId),
      verificationStaffChat: channelLabel(guild, cfg.verification?.staffChatChannelId),
      ticketsChannel: channelLabel(guild, cfg.tickets?.channelId),
      supportRoles: (cfg.supportRoleIds || []).map((id) => roleLabel(guild, id)).join(', ') || '—',
      autoroles: (cfg.autoroleIds || []).map((id) => roleLabel(guild, id)).join(', ') || '—',
    },
  };
}

module.exports = { loadGuildDashboard };
