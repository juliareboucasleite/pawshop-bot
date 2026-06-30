const { PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('../utils/store');
const { isAdmin, isModerator } = require('../utils/permissions');
const { sendModLog } = require('./moderationActions');
const { timeoutMember } = require('./moderationActions');

const tracker = new Map();
const TRACKER_TTL_MS = 5 * 60 * 1000;

function trackKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function pruneTracker() {
  const now = Date.now();
  for (const [key, data] of tracker) {
    if (now - data.updatedAt > TRACKER_TTL_MS) tracker.delete(key);
  }
}

function isExempt(member, cfg) {
  if (!member) return true;
  if (isAdmin(member)) return true;
  if (isModerator(member, cfg.supportRoleIds)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  const exempt = cfg.antiSpam?.exemptRoleIds || [];
  return exempt.some((id) => member.roles.cache.has(id));
}

function normalizeContent(content) {
  return (content || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function handleAntiSpam(message) {
  if (!message.guild || message.author.bot) return false;

  const cfg = getGuildConfig(message.guild.id);
  if (!cfg.antiSpam?.enabled) return false;

  let member = message.member;
  if (!member) {
    member = await message.guild.members.fetch(message.author.id).catch(() => null);
  }
  if (isExempt(member, cfg)) return false;

  pruneTracker();

  const key = trackKey(message.guild.id, message.author.id);
  const now = Date.now();
  const windowMs = Math.max(Number(cfg.antiSpam.windowSeconds) || 5, 2) * 1000;
  const maxMessages = Math.min(Math.max(Number(cfg.antiSpam.maxMessages) || 5, 3), 20);
  const duplicateLimit = Math.min(Math.max(Number(cfg.antiSpam.duplicateLimit) || 3, 2), 10);

  const entry = tracker.get(key) || {
    timestamps: [],
    lastContent: '',
    duplicateCount: 0,
    updatedAt: now,
  };

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  entry.timestamps.push(now);
  entry.updatedAt = now;

  const content = normalizeContent(message.content);
  if (content && content === entry.lastContent) {
    entry.duplicateCount += 1;
  } else {
    entry.lastContent = content;
    entry.duplicateCount = 1;
  }

  tracker.set(key, entry);

  const flood = entry.timestamps.length >= maxMessages;
  const duplicate = entry.duplicateCount >= duplicateLimit;
  if (!flood && !duplicate) return false;

  await message.delete().catch(() => {});

  const reason = flood ? 'Anti-spam: flood de mensagens' : 'Anti-spam: mensagens repetidas';
  const muteMinutes = Math.min(Math.max(Number(cfg.antiSpam.muteMinutes) || 10, 1), 40320);

  if (cfg.antiSpam.action !== 'delete' && member?.moderatable) {
    await timeoutMember(member, muteMinutes, reason, { tag: 'Failuerc Anti-Spam', id: '0' });
  }

  await sendModLog(message.guild, 'antispam', {
    moderator: message.client.user,
    target: message.author,
    channel: message.channel.toString(),
    reason,
    extra: flood
      ? `${entry.timestamps.length} mensagens em ${windowMs / 1000}s`
      : `${entry.duplicateCount} mensagens iguais`,
  });

  entry.timestamps = [];
  entry.duplicateCount = 0;
  tracker.set(key, entry);

  return true;
}

module.exports = { handleAntiSpam };
