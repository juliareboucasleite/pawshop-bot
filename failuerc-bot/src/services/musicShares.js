const { EmbedBuilder } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/store');
const { musicPanelEmbed, musicShareEmbed, musicProfileEmbed } = require('../utils/embeds');
const { extractMusicUrls, resolveMusicLink } = require('./musicResolver');

const MAX_SHARES_PER_USER = 150;

function getMusicChannelId(cfg) {
  return cfg.music?.channelId || null;
}

function getUserProfile(cfg, userId) {
  return cfg.music?.users?.[userId] || { shares: [] };
}

function nextMusicShareId(guildId) {
  let id = 0;
  updateGuildConfig(guildId, (cfg) => {
    id = (cfg.music?.shareCounter || 0) + 1;
    return {
      ...cfg,
      music: {
        ...cfg.music,
        shareCounter: id,
      },
    };
  });
  return id;
}

function saveMusicShare(guildId, userId, share) {
  updateGuildConfig(guildId, (cfg) => {
    const users = { ...(cfg.music?.users || {}) };
    const profile = users[userId] || { shares: [] };
    const shares = [...profile.shares, share].slice(-MAX_SHARES_PER_USER);

    users[userId] = { shares };

    return {
      ...cfg,
      music: {
        ...cfg.music,
        users,
      },
    };
  });
}

async function publishMusicPanel(channel) {
  const embed = new EmbedBuilder(musicPanelEmbed());
  const msg = await channel.send({ embeds: [embed] });

  updateGuildConfig(channel.guild.id, (cfg) => ({
    ...cfg,
    music: {
      ...cfg.music,
      channelId: channel.id,
      panelMessageId: msg.id,
    },
  }));

  return msg;
}

async function handleMusicMessage(message) {
  if (message.author.bot || !message.guild) return false;

  const cfg = getGuildConfig(message.guild.id);
  const channelId = getMusicChannelId(cfg);
  if (!channelId || message.channel.id !== channelId) return false;

  const links = extractMusicUrls(message.content);
  if (!links.length) return false;

  const resolved = [];
  for (const link of links) {
    try {
      const meta = await resolveMusicLink(link);
      const shareId = nextMusicShareId(message.guild.id);
      const entry = {
        id: shareId,
        ...meta,
        sharedAt: Date.now(),
        messageId: message.id,
      };
      saveMusicShare(message.guild.id, message.author.id, entry);
      resolved.push(entry);
    } catch (err) {
      console.error(`[music] resolve ${link.url}:`, err.message);
    }
  }

  if (!resolved.length) return false;

  const embeds = resolved.slice(0, 3).map((share) => new EmbedBuilder(musicShareEmbed(share, message.member)));
  await message.reply({ embeds }).catch(() => {});

  return true;
}

function buildProfileEmbed(user, guildId) {
  const cfg = getGuildConfig(guildId);
  const profile = getUserProfile(cfg, user.id);
  return new EmbedBuilder(musicProfileEmbed(user, profile));
}

function buildHistoryEmbed(user, guildId, limit = 10) {
  const cfg = getGuildConfig(guildId);
  const shares = getUserProfile(cfg, user.id).shares.slice(-limit).reverse();

  if (!shares.length) {
    return new EmbedBuilder(musicProfileEmbed(user, { shares: [] }));
  }

  const lines = shares.map((s) => {
    const type = { track: '🎵', album: '💿', playlist: '📀', artist: '🎤', video: '▶️' }[s.type] || '🔗';
    const artist = s.artist ? ` — *${s.artist}*` : '';
    return `${type} [${s.title}](${s.url})${artist}`;
  });

  return new EmbedBuilder({
    color: 0xc4b5fd,
    author: {
      name: `✿ histórico musical de ${user.displayName || user.username} ✿`,
      icon_url: user.displayAvatarURL({ size: 128 }),
    },
    description: lines.join('\n'),
    footer: { text: `Últimas ${shares.length} partilhas` },
  });
}

module.exports = {
  getMusicChannelId,
  publishMusicPanel,
  handleMusicMessage,
  buildProfileEmbed,
  buildHistoryEmbed,
  getUserProfile,
};
