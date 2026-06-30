const { EmbedBuilder } = require('discord.js');
const config = require('../../../config/default.json');
const { isAdmin } = require('../../utils/permissions');
const { getGuildConfig, updateGuildConfig } = require('../../utils/store');
const {
  errorEmbed,
  successEmbed,
  rankProfileEmbed,
  rankLeaderboardEmbed,
  rankTiersEmbed,
  rankHelpEmbed,
} = require('../../utils/embeds');
const { parseRoleArg, parseChannelArg } = require('../../utils/prefixArgs');
const {
  getLeaderboard,
  getUserRankProfile,
  getSortedTiers,
  computeLevel,
  applyTierRoles,
  resetUserRank,
  resetAllRanks,
} = require('../../services/ranking');

function parseMemberArg(arg, guild, message) {
  const mention = arg?.match(/^<@!?(\d+)>$/);
  if (mention) return mention[1];
  if (arg && /^\d{17,20}$/.test(arg)) return arg;
  return message.mentions.users.first()?.id || null;
}

module.exports = {
  name: 'rank',
  description: 'Sistema de rank por mensagens',
  aliases: ['ranking', 'nivel', 'level', 'xp'],
  async execute(message, args) {
    const cfg = getGuildConfig(message.guild.id);
    const sub = (args[0] || '').toLowerCase();
    const rest = args.slice(1);
    const p = config.bot.prefix;

    if (sub === 'ajuda' || sub === 'help') {
      return message.reply({ embeds: [new EmbedBuilder(rankHelpEmbed())] });
    }

    if (isAdmin(message.member)) {
      if (sub === 'on' || sub === 'ativar') {
        updateGuildConfig(message.guild.id, (c) => ({
          ...c,
          ranking: { ...c.ranking, enabled: true },
        }));
        return message.reply({
          embeds: [successEmbed('Ranking ativo', 'Membros ganham progresso ao enviar mensagens. Usa `f!rank ranks` para ver os marcos.')],
        });
      }

      if (sub === 'off' || sub === 'desativar') {
        updateGuildConfig(message.guild.id, (c) => ({
          ...c,
          ranking: { ...c.ranking, enabled: false },
        }));
        return message.reply({ embeds: [successEmbed('Ranking desativado', 'O sistema de rank foi pausado.')] });
      }

      if (sub === 'tier' || sub === 'rank' || sub === 'marco') {
        const action = (rest[0] || 'list').toLowerCase();

        if (action === 'list' || action === 'listar') {
          const tiers = getSortedTiers(getGuildConfig(message.guild.id));
          return message.reply({ embeds: [new EmbedBuilder(rankTiersEmbed(tiers))] });
        }

        if (action === 'remove' || action === 'remover') {
          const msgs = Number(rest[1]);
          if (!msgs) {
            return message.reply({ embeds: [errorEmbed(`Usa: \`${p}rank tier remove 300\``)] });
          }
          updateGuildConfig(message.guild.id, (c) => ({
            ...c,
            ranking: {
              ...c.ranking,
              tiers: (c.ranking?.tiers || []).filter((t) => t.messages !== msgs),
            },
          }));
          return message.reply({ embeds: [successEmbed('Rank removido', `Marco de **${msgs}** mensagens removido.`)] });
        }

        const messages = Number(rest[0]);
        if (!messages || Number.isNaN(messages)) {
          return message.reply({
            embeds: [errorEmbed(
              `Usa: \`${p}rank tier 300 @cargo Nome do Rank\`\n`
              + `Ou: \`${p}rank tier 300 30 @cargo Nome\` (mensagens, nível, cargo, nome)`,
            )],
          });
        }

        let level = computeLevel(messages);
        let roleId = null;
        let label = '';

        const maybeLevel = Number(rest[1]);
        if (rest[1] && !Number.isNaN(maybeLevel) && !String(rest[1]).startsWith('<@&')) {
          level = maybeLevel;
          const role = parseRoleArg(rest[2], message.guild) || message.mentions.roles.first();
          roleId = role?.id || null;
          label = rest.slice(3).join(' ').trim();
        } else {
          const role = parseRoleArg(rest[1], message.guild) || message.mentions.roles.first();
          roleId = role?.id || null;
          label = rest.slice(2).join(' ').trim();
        }

        if (!label) label = `Rank nível ${level}`;

        updateGuildConfig(message.guild.id, (c) => {
          const tiers = [...(c.ranking?.tiers || [])].filter((t) => t.messages !== messages);
          tiers.push({ messages, level, label, roleId });
          tiers.sort((a, b) => a.messages - b.messages);
          return { ...c, ranking: { ...c.ranking, tiers } };
        });

        return message.reply({
          embeds: [successEmbed(
            'Rank configurado',
            `**${label}** — nível **${level}** · **${messages}** mensagens${roleId ? ` → <@&${roleId}>` : ''}`,
          )],
        });
      }

      if (sub === 'sync' || sub === 'sincronizar') {
        const member = message.mentions.members.first()
          || (rest[0] && await message.guild.members.fetch(parseMemberArg(rest[0], message.guild, message)).catch(() => null));
        const targets = member ? [member] : [...message.guild.members.cache.values()];

        let count = 0;
        const freshCfg = getGuildConfig(message.guild.id);
        for (const m of targets) {
          if (m.user.bot) continue;
          const stats = freshCfg.ranking?.users?.[m.id];
          if (!stats?.messages) continue;
          await applyTierRoles(m, getGuildConfig(message.guild.id), stats.messages);
          count += 1;
        }

        return message.reply({
          embeds: [successEmbed('Sincronizado', `Cargos de rank atualizados para **${count}** membro(s).`)],
        });
      }

      if (sub === 'reset') {
        const userId = parseMemberArg(rest[0], message.guild, message);
        if (rest[0] === 'all' || rest[0] === 'todos') {
          resetAllRanks(message.guild.id);
          return message.reply({ embeds: [successEmbed('Reset', 'Todo o ranking do servidor foi limpo.')] });
        }
        if (!userId) {
          return message.reply({ embeds: [errorEmbed(`Usa: \`${p}rank reset @membro\` ou \`${p}rank reset all\``)] });
        }
        resetUserRank(message.guild.id, userId);
        const member = await message.guild.members.fetch(userId).catch(() => null);
        if (member) {
          const tiers = getSortedTiers(getGuildConfig(message.guild.id)).filter((t) => t.roleId);
          for (const t of tiers) {
            await member.roles.remove(t.roleId).catch(() => {});
          }
        }
        return message.reply({ embeds: [successEmbed('Reset', `Ranking de <@${userId}> limpo.`)] });
      }

      if (sub === 'log' || sub === 'logs') {
        const channel = parseChannelArg(rest[0], message.guild) || message.channel;
        updateGuildConfig(message.guild.id, (c) => ({
          ...c,
          ranking: { ...c.ranking, levelUpChannelId: channel.id },
        }));
        return message.reply({
          embeds: [successEmbed('Canal de rank', `Anúncios de subida de rank → ${channel}`)],
        });
      }
    }

    if (!cfg.ranking?.enabled && !['ranks', 'tier', 'top', 'leaderboard'].includes(sub)) {
      return message.reply({
        embeds: [errorEmbed(`O ranking ainda não está ativo neste servidor. Staff: \`${p}rank on\``)],
      });
    }

    if (sub === 'top' || sub === 'leaderboard' || sub === 'placar') {
      const entries = getLeaderboard(message.guild.id, 10);
      return message.reply({
        embeds: [new EmbedBuilder(rankLeaderboardEmbed(entries, message.guild.name))],
      });
    }

    if (sub === 'ranks' || sub === 'tiers' || sub === 'marcadores') {
      const tiers = getSortedTiers(cfg);
      return message.reply({ embeds: [new EmbedBuilder(rankTiersEmbed(tiers))] });
    }

    const userId = parseMemberArg(sub, message.guild, message) || message.author.id;
    const user = await message.client.users.fetch(userId).catch(() => null);
    if (!user) {
      return message.reply({ embeds: [errorEmbed('Utilizador não encontrado.')] });
    }

    const profile = getUserRankProfile(message.guild.id, userId);
    return message.reply({
      embeds: [new EmbedBuilder(rankProfileEmbed(user, profile, message.guild.name))],
    });
  },
};
