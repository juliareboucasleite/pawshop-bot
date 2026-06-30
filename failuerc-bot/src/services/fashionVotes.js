const { EmbedBuilder } = require('discord.js');
const { getGuildConfig, updateGuildConfig, readGuilds } = require('../utils/store');
const { fashionMonthlyReportEmbed } = require('../utils/embeds');

const YES_EMOJI = '✅';
const NO_EMOJI = '❌';

function currentMonthKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(date).slice(0, 7);
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getFashionChannelId(cfg) {
  return cfg.fashion?.channelId || null;
}

function messageHasImage(message) {
  if (message.attachments.some((attachment) => {
    const type = attachment.contentType || '';
    return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(attachment.url);
  })) return true;

  if (message.embeds.some((embed) => embed.image || embed.thumbnail)) return true;
  if (message.stickers?.size > 0) return true;

  return false;
}

function adjustFashionVote(guildId, userId, type, delta) {
  if (!userId || !type || !delta) return;

  updateGuildConfig(guildId, (cfg) => {
    const monthKey = currentMonthKey();
    const base = cfg.fashion?.monthKey === monthKey
      ? cfg
      : {
          ...cfg,
          fashion: {
            ...cfg.fashion,
            monthKey,
            votes: {},
          },
        };

    const votes = { ...(base.fashion?.votes || {}) };
    const current = votes[userId] || { yes: 0, no: 0 };
    const next = {
      yes: Math.max(0, (current.yes || 0) + (type === 'yes' ? delta : 0)),
      no: Math.max(0, (current.no || 0) + (type === 'no' ? delta : 0)),
    };

    if (next.yes === 0 && next.no === 0) delete votes[userId];
    else votes[userId] = next;

    return {
      ...base,
      fashion: {
        ...base.fashion,
        votes,
      },
    };
  });
}

function voteTypeFromEmoji(emoji) {
  const name = emoji?.name;
  if (name === YES_EMOJI) return 'yes';
  if (name === NO_EMOJI) return 'no';
  return null;
}

async function handleFashionMessage(message) {
  if (message.author.bot || !message.guild) return false;

  const cfg = getGuildConfig(message.guild.id);
  const channelId = getFashionChannelId(cfg);
  if (!channelId || message.channel.id !== channelId) return false;
  if (!messageHasImage(message)) return false;

  try {
    await message.react(YES_EMOJI);
    await message.react(NO_EMOJI);
  } catch (err) {
    console.error(`[fashion] react ${message.id}:`, err.message);
  }

  return true;
}

async function fetchReactionMessage(reaction) {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return null;
    }
  }

  if (reaction.message.partial) {
    try {
      await reaction.message.fetch();
    } catch {
      return null;
    }
  }

  return reaction.message;
}

async function handleFashionReaction(reaction, user, added) {
  if (user.bot) return false;

  const message = await fetchReactionMessage(reaction);
  if (!message?.guild) return false;

  const cfg = getGuildConfig(message.guild.id);
  const channelId = getFashionChannelId(cfg);
  if (!channelId || message.channel.id !== channelId) return false;

  const voteType = voteTypeFromEmoji(reaction.emoji);
  if (!voteType) return false;

  await rolloverFashionMonth(reaction.client, message.guild.id);
  adjustFashionVote(message.guild.id, user.id, voteType, added ? 1 : -1);
  return true;
}

async function sendFashionMonthlyReports(client, guildId, fashionCfg) {
  const votes = fashionCfg?.votes || {};
  const monthKey = fashionCfg?.monthKey || currentMonthKey();
  const monthLabel = formatMonthLabel(monthKey);

  for (const [userId, counts] of Object.entries(votes)) {
    const yes = counts?.yes || 0;
    const no = counts?.no || 0;
    if (yes === 0 && no === 0) continue;

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) continue;

    const embed = fashionMonthlyReportEmbed({ yes, no, monthLabel });
    await user.send({ embeds: [new EmbedBuilder(embed)] }).catch(() => {});
  }
}

async function rolloverFashionMonth(client, guildId) {
  const cfg = getGuildConfig(guildId);
  if (!getFashionChannelId(cfg)) return;

  const nowKey = currentMonthKey();
  if (!cfg.fashion?.monthKey) {
    updateGuildConfig(guildId, (c) => ({
      ...c,
      fashion: { ...c.fashion, monthKey: nowKey, votes: c.fashion?.votes || {} },
    }));
    return;
  }

  if (cfg.fashion.monthKey === nowKey) return;

  await sendFashionMonthlyReports(client, guildId, cfg.fashion);

  updateGuildConfig(guildId, (c) => ({
    ...c,
    fashion: {
      ...c.fashion,
      monthKey: nowKey,
      votes: {},
      lastReportAt: Date.now(),
    },
  }));
}

function startFashionMonthlyScheduler(client) {
  const tick = async () => {
    let guildIds;
    try {
      guildIds = Object.keys(readGuilds());
    } catch {
      guildIds = [...client.guilds.cache.keys()];
    }

    for (const guildId of guildIds) {
      try {
        await rolloverFashionMonth(client, guildId);
      } catch (err) {
        console.error(`[fashion] monthly ${guildId}:`, err.message);
      }
    }
  };

  tick();
  setInterval(tick, 60 * 60 * 1000);
}

module.exports = {
  handleFashionMessage,
  handleFashionReaction,
  startFashionMonthlyScheduler,
  messageHasImage,
  currentMonthKey,
};
