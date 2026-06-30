const { EmbedBuilder } = require('discord.js');
const config = require('../../../config/default.json');
const { isAdmin, isModerator } = require('../../utils/permissions');
const { getGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed, infoEmbed, giveawayHelpEmbed } = require('../../utils/embeds');
const {
  parseCreateInput,
  createGiveaway,
  endGiveaway,
  cancelGiveaway,
  listActiveGiveaways,
} = require('../../services/giveaways');

function canManageGiveaway(member, cfg) {
  return isAdmin(member) || isModerator(member, cfg.supportRoleIds);
}

module.exports = {
  name: 'sorteio',
  description: 'Cria e gere sorteios no servidor',
  aliases: ['giveaway', 'gw'],
  async execute(message, args) {
    const cfg = getGuildConfig(message.guild.id);
    const sub = (args[0] || 'ajuda').toLowerCase();
    const rest = args.slice(1);
    const p = config.bot.prefix;

    if (sub === 'ajuda' || sub === 'help') {
      return message.reply({ embeds: [new EmbedBuilder(giveawayHelpEmbed())] });
    }

    if (!canManageGiveaway(message.member, cfg)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de moderação ou administrador.')] });
    }

    if (sub === 'criar' || sub === 'create' || sub === 'novo') {
      const raw = rest.join(' ');
      if (!raw.includes('|')) {
        return message.reply({
          embeds: [errorEmbed(
            `Usa: \`${p}sorteio criar Título | horas | prémio\`\n`
            + `Exemplo: \`${p}sorteio criar Nitro mensal | 24 | 1 mês de Discord Nitro\``,
          )],
        });
      }

      const parsed = parseCreateInput(raw, message.guild, message);
      if (!parsed.ok) {
        return message.reply({ embeds: [errorEmbed(parsed.error)] });
      }

      const result = await createGiveaway(message.channel, message.author, parsed);
      return message.reply({
        embeds: [successEmbed(
          'Sorteio criado',
          `**#${result.giveaway.id}** — ${result.giveaway.title}\n`
          + `Termina <t:${Math.floor(new Date(result.giveaway.endsAt).getTime() / 1000)}:R>\n`
          + `${result.message.url}`,
        )],
      });
    }

    if (sub === 'list' || sub === 'listar') {
      const active = listActiveGiveaways(message.guild.id);
      if (!active.length) {
        return message.reply({ embeds: [infoEmbed('Sorteios', 'Nenhum sorteio ativo.')] });
      }

      const lines = active.map((g) => {
        const ends = Math.floor(new Date(g.endsAt).getTime() / 1000);
        return `**#${g.id}** — ${g.title}\n› prémio: ${g.prize}\n› participantes: ${g.entrants.length} · termina <t:${ends}:R>`;
      });

      return message.reply({ embeds: [infoEmbed('Sorteios ativos', lines.join('\n\n'))] });
    }

    const id = rest[0];
    if (!id) {
      return message.reply({ embeds: [new EmbedBuilder(giveawayHelpEmbed())] });
    }

    if (sub === 'cancelar' || sub === 'cancel') {
      const result = await cancelGiveaway(message.client, message.guild.id, id);
      if (!result.ok) return message.reply({ embeds: [errorEmbed(result.error)] });
      return message.reply({ embeds: [successEmbed('Sorteio cancelado', `Sorteio **#${id}** foi cancelado.`)] });
    }

    if (sub === 'end' || sub === 'terminar' || sub === 'finalizar') {
      const result = await endGiveaway(message.client, message.guild.id, id);
      if (!result.ok) return message.reply({ embeds: [errorEmbed(result.error)] });
      const mentions = result.winnerIds?.map((uid) => `<@${uid}>`).join(', ') || 'ninguém';
      return message.reply({
        embeds: [successEmbed('Sorteio terminado', `Vencedor(es): ${mentions}`)],
      });
    }

    if (sub === 'reroll' || sub === 'sortear') {
      const result = await endGiveaway(message.client, message.guild.id, id, { reroll: true });
      if (!result.ok) return message.reply({ embeds: [errorEmbed(result.error)] });
      const mentions = result.winnerIds?.map((uid) => `<@${uid}>`).join(', ') || 'ninguém';
      return message.reply({
        embeds: [successEmbed('Novo sorteio', `Novo(s) vencedor(es): ${mentions}`)],
      });
    }

    return message.reply({ embeds: [new EmbedBuilder(giveawayHelpEmbed())] });
  },
};
