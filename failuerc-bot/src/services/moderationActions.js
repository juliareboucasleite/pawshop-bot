const { PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('../utils/store');
const { moderationLogEmbed } = require('../utils/embeds');

function clampAmount(n) {
  return Math.min(Math.max(Number(n) || 1, 1), 100);
}

function clampMinutes(n) {
  return Math.min(Math.max(Number(n) || 10, 1), 40320);
}

async function sendModLog(guild, action, details) {
  const cfg = getGuildConfig(guild.id);
  const logId = cfg.moderation?.logChannelId || cfg.inviteBlocker?.logChannelId;
  if (!logId) return;

  const ch = guild.channels.cache.get(logId);
  if (!ch?.isTextBased()) return;

  await ch.send({ embeds: [moderationLogEmbed(action, details)] }).catch(() => {});
}

async function purgeMessages(channel, amount, { userId, moderator } = {}) {
  const max = clampAmount(amount);
  let deleted = 0;
  let lastId;

  while (deleted < max) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (!batch.size) break;

    lastId = batch.last().id;
    let toDelete = [...batch.values()];

    if (userId) {
      toDelete = toDelete.filter((m) => m.author.id === userId);
    }

    toDelete = toDelete.slice(0, max - deleted);
    if (!toDelete.length) {
      if (userId) continue;
      break;
    }

    const removed = await channel.bulkDelete(toDelete, true);
    deleted += removed.size;

    if (removed.size < toDelete.length) break;
  }

  if (moderator) {
    await sendModLog(channel.guild, 'limpar', {
      moderator,
      channel: channel.toString(),
      amount: deleted,
      userId,
    });
  }

  return deleted;
}

async function nukeChannel(channel, moderator) {
  const position = channel.position;
  const parent = channel.parent;
  const reason = `Nuke por ${moderator.tag}`;

  const cloned = await channel.clone({ reason });
  await cloned.setPosition(position);
  if (parent) await cloned.setParent(parent.id, { lockPermissions: true }).catch(() => {});

  await channel.delete(reason);
  await cloned.send(`♻️ **Canal recriado** por ${moderator} — histórico apagado.`).catch(() => {});

  await sendModLog(channel.guild, 'nuke', {
    moderator,
    channel: cloned.toString(),
  });

  return cloned;
}

async function kickMember(member, reason, moderator) {
  if (!member.kickable) {
    return { ok: false, error: 'Não consigo expulsar este membro (cargo superior ou permissões).' };
  }

  const finalReason = reason || `Expulso por ${moderator.tag}`;
  await member.kick(finalReason);

  await sendModLog(member.guild, 'expulsar', {
    moderator,
    target: member.user,
    reason: finalReason,
  });

  return { ok: true };
}

async function banMember(guild, user, reason, moderator, deleteMessageDays = 0) {
  const days = Math.min(Math.max(Number(deleteMessageDays) || 0, 0), 7);
  const finalReason = reason || `Banido por ${moderator.tag}`;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (member && !member.bannable) {
    return { ok: false, error: 'Não consigo banir este membro (cargo superior ou permissões).' };
  }

  await guild.members.ban(user.id, { reason: finalReason, deleteMessageSeconds: days * 86400 });

  await sendModLog(guild, 'banir', {
    moderator,
    target: user,
    reason: finalReason,
    deleteMessageDays: days,
  });

  return { ok: true };
}

async function timeoutMember(member, minutes, reason, moderator) {
  if (!member.moderatable) {
    return { ok: false, error: 'Não consigo silenciar este membro (cargo superior ou permissões).' };
  }

  const mins = clampMinutes(minutes);
  const ms = mins * 60 * 1000;
  const finalReason = reason || `Silenciado por ${moderator.tag}`;

  await member.timeout(ms, finalReason);

  await sendModLog(member.guild, 'silenciar', {
    moderator,
    target: member.user,
    reason: finalReason,
    minutes: mins,
  });

  return { ok: true, minutes: mins };
}

async function untimeoutMember(member, moderator) {
  if (!member.moderatable) {
    return { ok: false, error: 'Não consigo remover o silenciamento deste membro.' };
  }

  await member.timeout(null, `Silenciamento removido por ${moderator.tag}`);

  await sendModLog(member.guild, 'dessilenciar', {
    moderator,
    target: member.user,
  });

  return { ok: true };
}

function canModerate(member, permission) {
  return member?.permissions?.has(permission);
}

function requireModPermission(member, permission) {
  if (!canModerate(member, permission)) {
    return { ok: false, error: 'Não tens permissão para esta ação no Discord.' };
  }
  return { ok: true };
}

module.exports = {
  clampAmount,
  clampMinutes,
  purgeMessages,
  nukeChannel,
  kickMember,
  banMember,
  timeoutMember,
  untimeoutMember,
  sendModLog,
  requireModPermission,
  PermissionFlagsBits,
};
