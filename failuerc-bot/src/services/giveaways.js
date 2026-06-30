const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
  getGuildConfig,
  updateGuildConfig,
  readGuilds,
  nextGiveawayId,
} = require('../utils/store');
const {
  giveawayActiveEmbed,
  giveawayEndedEmbed,
} = require('../utils/embeds');
const { giveawayJoinButton, giveawayJoinId, parseGiveawayJoinId } = require('../utils/components');

const CHECK_INTERVAL_MS = 30 * 1000;
const MIN_HOURS = 0.25;
const MAX_HOURS = 720;

function clampHours(raw) {
  const n = Number(String(raw).replace(/h$/i, '').replace(',', '.'));
  if (Number.isNaN(n)) return null;
  return Math.min(Math.max(n, MIN_HOURS), MAX_HOURS);
}

function clampWinners(n) {
  return Math.min(Math.max(Number(n) || 1, 1), 20);
}

function getGiveaway(cfg, id) {
  return cfg.giveaways?.items?.[id] || null;
}

function saveGiveaway(guildId, giveaway) {
  updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    giveaways: {
      ...cfg.giveaways,
      items: {
        ...(cfg.giveaways?.items || {}),
        [giveaway.id]: giveaway,
      },
    },
  }));
}

function pickWinners(entrants, count) {
  const pool = [...new Set(entrants)];
  const winners = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

const { parseRoleArg } = require('../utils/prefixArgs');

function parseCreateInput(text, guild, message) {
  const parts = text.split('|').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) {
    return { ok: false, error: 'Formato: `Título | horas | prémio [| vencedores] [| @cargo]`' };
  }

  const title = parts[0];
  const hours = clampHours(parts[1]);
  if (!hours) {
    return { ok: false, error: 'Horas inválidas. Exemplo: `24` ou `1.5` (mín. 0.25h, máx. 720h).' };
  }

  const prize = parts[2];
  let winnersCount = 1;
  let requiredRoleId = null;

  if (parts[3]) {
    const roleFromArg = parseRoleArg(parts[3], guild);
    const mentioned = message.mentions.roles.first();
    const role = roleFromArg || mentioned;
    if (role) {
      requiredRoleId = role.id;
    } else if (!Number.isNaN(Number(parts[3]))) {
      winnersCount = clampWinners(parts[3]);
      const role2 = parseRoleArg(parts[4], guild) || message.mentions.roles.last();
      if (role2) requiredRoleId = role2.id;
    }
  }

  return {
    ok: true,
    title,
    hours,
    prize,
    winnersCount,
    requiredRoleId,
  };
}

async function createGiveaway(channel, host, options) {
  const guildId = channel.guild.id;
  const id = nextGiveawayId(guildId);
  const endsAt = new Date(Date.now() + options.hours * 60 * 60 * 1000).toISOString();

  const giveaway = {
    id,
    guildId,
    channelId: channel.id,
    messageId: null,
    hostId: host.id,
    title: options.title,
    prize: options.prize,
    winnersCount: options.winnersCount,
    requiredRoleId: options.requiredRoleId || null,
    endsAt,
    entrants: [],
    ended: false,
    winnerIds: [],
    createdAt: new Date().toISOString(),
  };

  const embed = new EmbedBuilder(giveawayActiveEmbed(giveaway, host));
  const row = giveawayJoinButton(guildId, id, 0);
  const msg = await channel.send({ embeds: [embed], components: [row] });

  giveaway.messageId = msg.id;
  saveGiveaway(guildId, giveaway);

  return { ok: true, giveaway, message: msg };
}

async function updateGiveawayMessage(client, guildId, giveaway) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) return;

  const host = await client.users.fetch(giveaway.hostId).catch(() => null);
  const embed = new EmbedBuilder(giveawayActiveEmbed(giveaway, host));
  const row = giveawayJoinButton(guildId, giveaway.id, giveaway.entrants.length);

  await message.edit({ embeds: [embed], components: [row] }).catch(() => {});
}

async function endGiveaway(client, guildId, giveawayId, { reroll = false } = {}) {
  const cfg = getGuildConfig(guildId);
  const giveaway = getGiveaway(cfg, giveawayId);
  if (!giveaway) return { ok: false, error: 'Sorteio não encontrado.' };
  if (giveaway.ended && !reroll) return { ok: false, error: 'Sorteio já terminado.' };
  if (reroll && !giveaway.ended) {
    return { ok: false, error: 'O sorteio ainda está ativo. Usa `end` para terminar primeiro.' };
  }

  const winnerIds = pickWinners(giveaway.entrants, giveaway.winnersCount);
  const updated = {
    ...giveaway,
    ended: true,
    endedAt: giveaway.endedAt || new Date().toISOString(),
    winnerIds,
  };
  saveGiveaway(guildId, updated);

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: true, giveaway: updated, winnerIds };

  const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
  const winnerMentions = winnerIds.map((uid) => `<@${uid}>`);

  if (channel?.isTextBased()) {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) {
      const embed = new EmbedBuilder(giveawayEndedEmbed(updated, winnerMentions));
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(giveawayJoinId(guildId, giveawayId))
          .setLabel('Sorteio terminado')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );
      await message.edit({ embeds: [embed], components: [disabledRow] }).catch(() => {});

      const announce = reroll
        ? `🔄 Novo sorteio — ${winnerMentions.join(', ')} ganha(m) **${giveaway.prize}**!`
        : `🎉 Parabéns ${winnerMentions.join(', ')}! Ganhaste **${giveaway.prize}** no sorteio *${giveaway.title}* ♡`;

      if (winnerMentions.length) {
        await channel.send({ content: announce }).catch(() => {});
      } else if (!reroll) {
        await channel.send({ content: '😔 O sorteio terminou sem participantes.' }).catch(() => {});
      }
    }
  }

  if (!reroll) {
    for (const userId of winnerIds) {
      const user = await client.users.fetch(userId).catch(() => null);
      if (!user) continue;
      await user.send({
        content: `🎉 Ganhaste o sorteio **${giveaway.title}** em **${guild.name}**!\nPrémio: **${giveaway.prize}**`,
      }).catch(() => {});
    }
  }

  return { ok: true, giveaway: updated, winnerIds };
}

async function cancelGiveaway(client, guildId, giveawayId) {
  const cfg = getGuildConfig(guildId);
  const giveaway = getGiveaway(cfg, giveawayId);
  if (!giveaway) return { ok: false, error: 'Sorteio não encontrado.' };
  if (giveaway.ended) return { ok: false, error: 'Sorteio já terminado.' };

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (guild) {
    const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (channel?.isTextBased()) {
      const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
      if (message) {
        await message.edit({ components: [] }).catch(() => {});
        await message.reply('❌ Sorteio **cancelado** pela staff.').catch(() => {});
      }
    }
  }

  updateGuildConfig(guildId, (c) => {
    const items = { ...(c.giveaways?.items || {}) };
    delete items[giveawayId];
    return { ...c, giveaways: { ...c.giveaways, items } };
  });

  return { ok: true };
}

async function handleGiveawayJoin(interaction) {
  const parsed = parseGiveawayJoinId(interaction.customId);
  if (!parsed || parsed.guildId !== interaction.guild?.id) return false;

  const cfg = getGuildConfig(interaction.guild.id);
  const g = getGiveaway(cfg, parsed.giveawayId);

  if (!g || g.ended) {
    await interaction.reply({ content: 'Este sorteio já terminou.', ephemeral: true });
    return true;
  }

  if (g.entrants.includes(interaction.user.id)) {
    await interaction.reply({ content: 'Já estás inscrito neste sorteio ♡', ephemeral: true });
    return true;
  }

  if (g.requiredRoleId && !interaction.member.roles.cache.has(g.requiredRoleId)) {
    await interaction.reply({
      content: `Precisas do cargo <@&${g.requiredRoleId}> para participar.`,
      ephemeral: true,
    });
    return true;
  }

  const updated = {
    ...g,
    entrants: [...g.entrants, interaction.user.id],
  };
  saveGiveaway(interaction.guild.id, updated);
  await updateGiveawayMessage(interaction.client, interaction.guild.id, updated);

  await interaction.reply({
    content: `Entraste no sorteio **${g.title}**! Boa sorte 🍀`,
    ephemeral: true,
  });
  return true;
}

function listActiveGiveaways(guildId) {
  const cfg = getGuildConfig(guildId);
  return Object.values(cfg.giveaways?.items || {}).filter((g) => !g.ended);
}

async function processExpiredGiveaways(client) {
  const all = readGuilds();
  const now = Date.now();

  for (const [guildId, cfg] of Object.entries(all)) {
    const items = cfg.giveaways?.items || {};
    for (const giveaway of Object.values(items)) {
      if (giveaway.ended) continue;
      if (new Date(giveaway.endsAt).getTime() > now) continue;
      try {
        await endGiveaway(client, guildId, giveaway.id);
      } catch (err) {
        console.error(`[giveaway] end ${guildId}/${giveaway.id}:`, err.message);
      }
    }
  }
}

function startGiveawayScheduler(client) {
  processExpiredGiveaways(client);
  setInterval(() => processExpiredGiveaways(client), CHECK_INTERVAL_MS);
}

module.exports = {
  parseCreateInput,
  createGiveaway,
  endGiveaway,
  cancelGiveaway,
  listActiveGiveaways,
  handleGiveawayJoin,
  startGiveawayScheduler,
  getGiveaway,
};
