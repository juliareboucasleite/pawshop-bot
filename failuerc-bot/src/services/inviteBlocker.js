const { PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('../utils/store');
const { isAdmin, isModerator } = require('../utils/permissions');

const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/([a-zA-Z0-9-]+)/gi;

function extractInviteCodes(content) {
  if (!content) return [];
  const codes = new Set();
  for (const match of content.matchAll(INVITE_REGEX)) {
    if (match[1]) codes.add(match[1]);
  }
  return [...codes];
}

function isExemptFromInviteBlock(member, cfg) {
  if (!member) return true;
  if (isAdmin(member)) return true;
  if (isModerator(member, cfg.supportRoleIds)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  const exempt = cfg.inviteBlocker?.exemptRoleIds || [];
  return exempt.some((id) => member.roles.cache.has(id));
}

async function isForeignInvite(client, guildId, code) {
  try {
    const invite = await client.fetchInvite(code);
    if (!invite.guild) return true;
    return invite.guild.id !== guildId;
  } catch {
    return true;
  }
}

async function applyInvitePunishment(member, cfg) {
  const action = cfg.inviteBlocker?.action || 'mute';
  const reason = 'Convite de outro servidor (Failuerc)';

  if (action === 'kick') {
    if (!member.kickable) return { ok: false, action: 'kick', error: 'Sem permissão para expulsar.' };
    await member.kick(reason);
    return { ok: true, action: 'kick' };
  }

  const minutes = Number(cfg.inviteBlocker?.muteMinutes) || 60;
  const ms = Math.min(Math.max(minutes, 1), 40320) * 60 * 1000;
  if (!member.moderatable) return { ok: false, action: 'mute', error: 'Sem permissão para silenciar.' };
  await member.timeout(ms, reason);
  return { ok: true, action: 'mute', minutes };
}

async function logInviteBlock(message, cfg, result) {
  const logId = cfg.inviteBlocker?.logChannelId;
  if (!logId) return;
  const ch = message.guild.channels.cache.get(logId);
  if (!ch?.isTextBased()) return;

  const actionLabel = result.action === 'kick' ? 'Expulso' : `Silenciado (${result.minutes || 60} min)`;
  await ch.send(
    `**Bloqueador de convites** — ${message.author} em ${message.channel}\n`
    + `Ação: ${actionLabel}\n`
    + `Mensagem removida.`,
  ).catch(() => {});
}

async function handleInviteBlock(message, client) {
  if (!message.guild || message.author.bot) return false;

  const cfg = getGuildConfig(message.guild.id);
  if (!cfg.inviteBlocker?.enabled) return false;

  const textParts = [message.content || ''];
  for (const embed of message.embeds) {
    textParts.push(embed.url || '', embed.title || '', embed.description || '');
  }
  const codes = extractInviteCodes(textParts.join('\n'));
  if (!codes.length) return false;

  let member = message.member;
  if (!member) {
    member = await message.guild.members.fetch(message.author.id).catch(() => null);
  } else if (member.partial) {
    member = await member.fetch().catch(() => member);
  }

  if (isExemptFromInviteBlock(member, cfg)) return false;

  for (const code of codes) {
    const foreign = await isForeignInvite(client, message.guild.id, code);
    if (!foreign) continue;

    await message.delete().catch(() => {});
    const result = await applyInvitePunishment(member, cfg);
    if (result.ok) await logInviteBlock(message, cfg, result);
    return true;
  }

  return false;
}

module.exports = {
  extractInviteCodes,
  handleInviteBlock,
};
