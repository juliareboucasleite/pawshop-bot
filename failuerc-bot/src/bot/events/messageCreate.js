const { Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../../../config/default.json');
const { getGuildConfig } = require('../../utils/store');
const { isAdmin, isModerator } = require('../../utils/permissions');
const { isCommandChannelAllowed } = require('../../services/commandChannels');
const { handleInviteBlock } = require('../../services/inviteBlocker');
const { handleAntiSpam } = require('../../services/antiSpam');
const { handleRankMessage } = require('../../services/ranking');
const { handleFashionMessage } = require('../../services/fashionVotes');
const { handleMusicMessage } = require('../../services/musicShares');
const { errorEmbed, commandSuggestEmbed } = require('../../utils/embeds');
const { EmbedBuilder } = require('discord.js');
const {
  getUniqueCommandNames,
  findClosestCommand,
  parseAnyPrefixedCommand,
  buildSuggestedCommand,
  isWrongPrefix,
} = require('../../utils/commandSuggest');

const prefixCommands = new Map();
const prefixPath = path.join(__dirname, '..', 'prefix');
const suggestCooldown = new Map();

for (const file of fs.readdirSync(prefixPath).filter((f) => f.endsWith('.js'))) {
  const cmd = require(path.join(prefixPath, file));
  prefixCommands.set(cmd.name, cmd);
  if (Array.isArray(cmd.aliases)) {
    for (const alias of cmd.aliases) {
      prefixCommands.set(alias, cmd);
    }
  }
}

const commandNames = getUniqueCommandNames(prefixCommands);

function parsePrefixMessage(content) {
  const prefix = config.bot.prefix;
  if (!content.startsWith(prefix)) return null;

  const body = content.slice(prefix.length).trim();
  if (!body) return null;

  const [name, ...rest] = body.split(/\s+/);
  return { name: name.toLowerCase(), args: rest, prefix };
}

function canSuggest(userId) {
  const now = Date.now();
  const last = suggestCooldown.get(userId) || 0;
  if (now - last < 8000) return false;
  suggestCooldown.set(userId, now);
  return true;
}

async function replySuggestion(message, suggested, wrongAttempt) {
  if (!canSuggest(message.author.id)) return;
  await message.reply({
    embeds: [new EmbedBuilder(commandSuggestEmbed(suggested, wrongAttempt))],
  }).catch(() => {});
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    try {
      const spam = await handleAntiSpam(message);
      if (!spam) {
        await handleRankMessage(message);
      }
    } catch (err) {
      console.error('[anti-spam/rank]', err);
    }

    try {
      await handleInviteBlock(message, client);
    } catch (err) {
      console.error('[invite-blocker]', err);
    }

    try {
      await handleFashionMessage(message);
    } catch (err) {
      console.error('[fashion]', err);
    }

    try {
      await handleMusicMessage(message);
    } catch (err) {
      console.error('[music]', err);
    }

    const anyCmd = parseAnyPrefixedCommand(message.content);
    if (anyCmd?.hasCommand && isWrongPrefix(anyCmd.userPrefix)) {
      const match = prefixCommands.has(anyCmd.cmdName)
        ? anyCmd.cmdName
        : findClosestCommand(anyCmd.cmdName, commandNames);
      if (match) {
        await replySuggestion(
          message,
          buildSuggestedCommand(match),
          message.content.trim().split(/\s+/)[0],
        );
      }
      return;
    }

    const parsed = parsePrefixMessage(message.content);
    if (!parsed) return;

    if (!isCommandChannelAllowed(message.guild.id, message.channel.id)) {
      const cfg = getGuildConfig(message.guild.id);
      if (!isModerator(message.member, cfg.supportRoleIds)) {
        await message.reply({
          embeds: [errorEmbed('Comandos por prefixo não são permitidos neste canal.')],
        }).catch(() => {});
        return;
      }
    }

    const command = prefixCommands.get(parsed.name);
    if (!command) {
      const suggestion = findClosestCommand(parsed.name, commandNames);
      if (suggestion) {
        await replySuggestion(
          message,
          buildSuggestedCommand(suggestion),
          `${parsed.prefix}${parsed.name}`,
        );
      }
      return;
    }

    if (command.adminOnly && !isAdmin(message.member)) {
      await message.reply({
        embeds: [errorEmbed('Precisas de permissão de administrador.')],
      }).catch(() => {});
      return;
    }

    if (command.moderatorOnly) {
      const cfg = getGuildConfig(message.guild.id);
      if (!isModerator(message.member, cfg.supportRoleIds)) {
        await message.reply({
          embeds: [errorEmbed('Precisas de permissão de moderação.')],
        }).catch(() => {});
        return;
      }
    }

    try {
      await command.execute(message, parsed.args);
    } catch (err) {
      console.error(`[prefix] ${config.bot.prefix}${parsed.name}:`, err);
    }
  },
};
