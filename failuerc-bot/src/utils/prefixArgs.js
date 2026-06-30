const { ChannelType } = require('discord.js');

function parseChannelArg(arg, guild) {
  if (!arg) return null;

  const mention = arg.match(/^<#(\d+)>$/);
  if (mention) return guild.channels.cache.get(mention[1]) || null;

  if (/^\d{17,20}$/.test(arg)) return guild.channels.cache.get(arg) || null;

  const name = arg.replace(/^#/, '').toLowerCase();
  return guild.channels.cache.find((channel) => channel.name.toLowerCase() === name) || null;
}

function parseRoleArg(arg, guild) {
  if (!arg) return null;

  const mention = arg.match(/^<@&(\d+)>$/);
  if (mention) return guild.roles.cache.get(mention[1]) || null;

  if (/^\d{17,20}$/.test(arg)) return guild.roles.cache.get(arg) || null;

  const name = arg.replace(/^@/, '').toLowerCase();
  return guild.roles.cache.find((role) => role.name.toLowerCase() === name) || null;
}

function parseCategoryArg(arg, guild) {
  const channel = parseChannelArg(arg, guild);
  if (!channel) return null;
  return channel.type === ChannelType.GuildCategory ? channel : null;
}

function parseChannelsFromArgs(args, guild) {
  return args.map((arg) => parseChannelArg(arg, guild)).filter(Boolean);
}

function parseRolesFromArgs(args, guild) {
  return args.map((arg) => parseRoleArg(arg, guild)).filter(Boolean);
}

module.exports = {
  parseChannelArg,
  parseRoleArg,
  parseCategoryArg,
  parseChannelsFromArgs,
  parseRolesFromArgs,
};
