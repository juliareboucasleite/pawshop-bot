const { PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/store');
const { isAdmin, isModerator } = require('../utils/permissions');
const { levelUpEmbed } = require('../utils/embeds');

const MSG_COOLDOWN_MS_DEFAULT = 45 * 1000;

function computeLevel(messages) {
  return Math.floor(messages / 10);
}

function getSortedTiers(cfg) {
  return [...(cfg.ranking?.tiers || [])].sort((a, b) => a.messages - b.messages);
}

function getUserStats(cfg, userId) {
  return cfg.ranking?.users?.[userId] || { messages: 0, lastXpAt: 0 };
}

function getAchievedTier(cfg, messages) {
  const tiers = getSortedTiers(cfg);
  let achieved = null;
  for (const tier of tiers) {
    if (messages >= tier.messages) achieved = tier;
  }
  return achieved;
}

function getNextTier(cfg, messages) {
  const tiers = getSortedTiers(cfg);
  return tiers.find((t) => messages < t.messages) || null;
}

function isExempt(member, cfg) {
  if (!member || member.user.bot) return true;
  if (isAdmin(member)) return true;
  if (isModerator(member, cfg.supportRoleIds)) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const exemptRoles = cfg.ranking?.exemptRoleIds || [];
  return exemptRoles.some((id) => member.roles.cache.has(id));
}

async function applyTierRoles(member, cfg, messages) {
  const tiers = getSortedTiers(cfg).filter((t) => t.roleId);
  if (!tiers.length) return null;

  const achieved = getAchievedTier(cfg, messages);
  const tierRoleIds = new Set(tiers.map((t) => t.roleId));

  for (const tier of tiers) {
    if (tier.roleId && tier !== achieved && member.roles.cache.has(tier.roleId)) {
      await member.roles.remove(tier.roleId, 'Rank — atualização de cargo').catch(() => {});
    }
  }

  if (!achieved?.roleId) return null;

  if (!member.roles.cache.has(achieved.roleId)) {
    await member.roles.add(achieved.roleId, `Rank — ${achieved.messages} mensagens`).catch(() => {});
  }

  return achieved;
}

async function announceLevelUp(client, guild, member, tier, channel) {
  const cfg = getGuildConfig(guild.id);
  if (!cfg.ranking?.announceLevelUp) return;

  const targetId = cfg.ranking.levelUpChannelId || channel.id;
  const target = await guild.channels.fetch(targetId).catch(() => channel);
  if (!target?.isTextBased()) return;

  await target.send({
    content: `${member}`,
    embeds: [levelUpEmbed(member, tier)],
  }).catch(() => {});
}

async function handleRankMessage(message) {
  if (!message.guild || message.author.bot) return false;

  const cfg = getGuildConfig(message.guild.id);
  if (!cfg.ranking?.enabled) return false;
  if (!message.content?.trim() && !message.attachments.size) return false;

  let member = message.member;
  if (!member) {
    member = await message.guild.members.fetch(message.author.id).catch(() => null);
  }
  if (isExempt(member, cfg)) return false;

  const userId = message.author.id;
  const now = Date.now();
  const cooldownMs = (cfg.ranking.cooldownSeconds || 45) * 1000;

  let previousMessages = 0;
  let newMessages = 0;
  let previousTier = null;
  let newTier = null;

  updateGuildConfig(message.guild.id, (c) => {
    const users = { ...(c.ranking?.users || {}) };
    const current = users[userId] || { messages: 0, lastXpAt: 0 };
    previousMessages = current.messages;

    if (now - (current.lastXpAt || 0) < cooldownMs) {
      newMessages = previousMessages;
      return c;
    }

    newMessages = previousMessages + 1;
    users[userId] = { messages: newMessages, lastXpAt: now };

    previousTier = getAchievedTier(c, previousMessages);
    newTier = getAchievedTier({ ...c, ranking: { ...c.ranking, users } }, newMessages);

    return {
      ...c,
      ranking: { ...c.ranking, users },
    };
  });

  if (newMessages <= previousMessages) return false;

  const updatedCfg = getGuildConfig(message.guild.id);
  await applyTierRoles(member, updatedCfg, newMessages);

  if (newTier && (!previousTier || newTier.messages > previousTier.messages)) {
    await announceLevelUp(message.client, message.guild, member, newTier, message.channel);
  }

  return true;
}

function getLeaderboard(guildId, limit = 10) {
  const cfg = getGuildConfig(guildId);
  const users = cfg.ranking?.users || {};
  return Object.entries(users)
    .map(([userId, data]) => ({
      userId,
      messages: data.messages || 0,
      level: computeLevel(data.messages || 0),
      tier: getAchievedTier(cfg, data.messages || 0),
    }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, limit);
}

function getUserRankProfile(guildId, userId) {
  const cfg = getGuildConfig(guildId);
  const stats = getUserStats(cfg, userId);
  const messages = stats.messages || 0;
  const level = computeLevel(messages);
  const tier = getAchievedTier(cfg, messages);
  const next = getNextTier(cfg, messages);

  const leaderboard = getLeaderboard(guildId, 1000);
  const position = leaderboard.findIndex((e) => e.userId === userId) + 1;

  return {
    messages,
    level,
    tier,
    next,
    position: position || null,
  };
}

function resetUserRank(guildId, userId) {
  updateGuildConfig(guildId, (c) => {
    const users = { ...(c.ranking?.users || {}) };
    delete users[userId];
    return { ...c, ranking: { ...c.ranking, users } };
  });
}

function resetAllRanks(guildId) {
  updateGuildConfig(guildId, (c) => ({
    ...c,
    ranking: { ...c.ranking, users: {} },
  }));
}

module.exports = {
  computeLevel,
  getSortedTiers,
  getAchievedTier,
  getNextTier,
  handleRankMessage,
  getLeaderboard,
  getUserRankProfile,
  applyTierRoles,
  resetUserRank,
  resetAllRanks,
};
