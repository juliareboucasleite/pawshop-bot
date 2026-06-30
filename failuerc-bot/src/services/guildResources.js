const { ChannelType } = require('discord.js');

function mapRoles(guild) {
  return [...guild.roles.cache.values()]
    .filter((r) => r.id !== guild.id && !r.managed)
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }));
}

function mapCategories(guild) {
  return [...guild.channels.cache.values()]
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .map((c) => ({ id: c.id, name: c.name }));
}

function mapTextChannels(guild) {
  return [...guild.channels.cache.values()]
    .filter((c) => {
      if (c.type === ChannelType.GuildCategory) return false;
      if (typeof c.isThread === 'function' && c.isThread()) return false;
      return typeof c.isTextBased === 'function' && c.isTextBased();
    })
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }));
}

async function ensureGuildData(guild) {
  await Promise.all([
    guild.fetch().catch(() => null),
    guild.roles.fetch().catch(() => null),
    guild.channels.fetch().catch(() => null),
  ]);
}

async function fetchGuildResources(client, guildId) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;

  await ensureGuildData(guild);

  const roles = mapRoles(guild);
  const categories = mapCategories(guild);
  const textChannels = mapTextChannels(guild);

  return { roles, categories, textChannels };
}

module.exports = {
  fetchGuildResources,
  ensureGuildData,
  mapRoles,
  mapTextChannels,
};
