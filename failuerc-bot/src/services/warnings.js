const { getGuildConfig, updateGuildConfig } = require('../utils/store');
const { sendModLog } = require('./moderationActions');
const { timeoutMember, kickMember } = require('./moderationActions');

function getWarnings(cfg, userId) {
  return cfg.moderation?.warns?.[userId] || [];
}

function warnMember(guild, user, reason, moderator) {
  const userId = user.id;
  const entry = {
    id: `${Date.now()}`,
    reason: reason || 'Sem motivo indicado',
    moderatorId: moderator.id,
    moderatorTag: moderator.tag,
    at: new Date().toISOString(),
  };

  let count = 0;
  updateGuildConfig(guild.id, (c) => {
    const warns = { ...(c.moderation?.warns || {}) };
    const list = [...(warns[userId] || []), entry];
    warns[userId] = list;
    count = list.length;
    return {
      ...c,
      moderation: {
        ...c.moderation,
        warns,
      },
    };
  });

  sendModLog(guild, 'aviso', {
    moderator,
    target: user,
    reason: entry.reason,
    extra: `Total de avisos: **${count}**`,
  });

  return { ok: true, count, entry };
}

async function applyAutoPunish(member, count, cfg, moderator) {
  const threshold = Number(cfg.moderation?.warnThreshold) || 3;
  if (count < threshold || count % threshold !== 0) return null;

  const action = cfg.moderation?.warnAutoAction || 'mute';
  const minutes = Number(cfg.moderation?.warnAutoMinutes) || 60;

  if (action === 'kick') {
    const result = await kickMember(member, `Avisos acumulados (${count})`, moderator);
    return result.ok ? { action: 'kick' } : null;
  }

  const result = await timeoutMember(
    member,
    minutes,
    `Avisos acumulados (${count})`,
    moderator,
  );
  return result.ok ? { action: 'mute', minutes } : null;
}

function clearWarnings(guildId, userId, moderator) {
  updateGuildConfig(guildId, (c) => {
    const warns = { ...(c.moderation?.warns || {}) };
    delete warns[userId];
    return {
      ...c,
      moderation: { ...c.moderation, warns },
    };
  });

  return { ok: true, moderator };
}

module.exports = {
  getWarnings,
  warnMember,
  clearWarnings,
  applyAutoPunish,
};
