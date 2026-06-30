const { PermissionFlagsBits } = require('discord.js');
const {
  extractInviteCodes,
  isForeignInvite,
} = require('./inviteBlocker');
const { getGuildConfig } = require('../utils/store');

function messageText(message) {
  const parts = [message.content || ''];
  for (const embed of message.embeds) {
    parts.push(embed.url || '', embed.title || '', embed.description || '');
  }
  return parts.join('\n');
}

async function scanChannelForInvites(channel, client, {
  limit = 200,
  deleteForeign = false,
  onProgress,
} = {}) {
  const max = Math.min(Math.max(Number(limit) || 200, 10), 1000);
  const cfg = getGuildConfig(channel.guild.id);
  const results = {
    scanned: 0,
    withInvites: 0,
    foreign: [],
    local: [],
    deleted: 0,
    errors: [],
  };

  let lastId;
  const collected = [];

  while (collected.length < max) {
    const options = { limit: Math.min(100, max - collected.length) };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (!batch.size) break;

    collected.push(...batch.values());
    lastId = batch.last().id;
    if (onProgress) onProgress(collected.length, max);
  }

  const inviteCache = new Map();

  for (const message of collected) {
    if (message.author.bot) continue;
    results.scanned += 1;

    const codes = extractInviteCodes(messageText(message));
    if (!codes.length) continue;

    results.withInvites += 1;

    for (const code of codes) {
      let foreign;
      if (inviteCache.has(code)) {
        foreign = inviteCache.get(code);
      } else {
        foreign = await isForeignInvite(client, channel.guild.id, code);
        inviteCache.set(code, foreign);
      }

      const item = {
        code,
        messageId: message.id,
        authorId: message.author.id,
        authorTag: message.author.tag,
        channelId: channel.id,
        jumpUrl: message.url,
        foreign,
      };

      if (foreign) {
        results.foreign.push(item);
        if (deleteForeign && message.deletable) {
          const deleted = await message.delete().catch(() => false);
          if (deleted !== false) results.deleted += 1;
        }
      } else {
        results.local.push(item);
      }
    }
  }

  return results;
}

function canScanChannel(member) {
  return member?.permissions?.has(PermissionFlagsBits.ManageMessages);
}

module.exports = {
  scanChannelForInvites,
  canScanChannel,
};
