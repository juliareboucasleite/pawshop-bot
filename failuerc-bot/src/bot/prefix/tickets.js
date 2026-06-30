const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { setGuildConfig, getGuildConfig } = require('../../utils/store');
const { ticketPanel, errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { ticketOpenButton } = require('../../utils/components');
const { parseCategoryArg, parseRoleArg } = require('../../utils/prefixArgs');
const config = require('../../../config/default.json');

module.exports = {
  name: 'tickets',
  description: 'Painel e configuração de tickets',
  adminOnly: true,
  async execute(message, args) {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')] });
    }

    const sub = (args[0] || 'info').toLowerCase();
    const p = config.bot.prefix;

    if (sub === 'info' || sub === 'ajuda') {
      const cfg = getGuildConfig(message.guild.id);
      const lines = [
        `**Categoria:** ${cfg.ticketCategoryId ? `<#${cfg.ticketCategoryId}>` : '—'}`,
        `**Suporte:** ${cfg.supportRoleIds?.length ? cfg.supportRoleIds.map((id) => `<@&${id}>`).join(', ') : '—'}`,
        `**Painel:** ${cfg.tickets?.messageId ? `<#${cfg.tickets.channelId}>` : '—'}`,
        '',
        `**Comandos:**`,
        `\`${p}tickets configurar #categoria @suporte\` — configura tickets`,
        `\`${p}tickets painel\` — publica painel neste canal`,
      ];
      return message.reply({ embeds: [new EmbedBuilder(infoEmbed('Tickets', lines.join('\n')))] });
    }

    if (sub === 'configurar') {
      const category = parseCategoryArg(args[1], message.guild);
      if (!category) {
        return message.reply({
          embeds: [errorEmbed(`Indica a categoria. Ex: \`${p}tickets configurar #Tickets @Suporte\``)],
        });
      }

      const roles = [args[2], args[3]]
        .map((arg) => parseRoleArg(arg, message.guild))
        .filter(Boolean)
        .map((role) => role.id);

      setGuildConfig(message.guild.id, {
        ticketCategoryId: category.id,
        supportRoleIds: roles,
      });

      const roleText = roles.length ? roles.map((id) => `<@&${id}>`).join(', ') : 'nenhum cargo extra';
      return message.reply({
        embeds: [successEmbed('Tickets configurados', `Categoria: ${category.name}\nSuporte: ${roleText}`)],
      });
    }

    if (sub === 'painel') {
      const cfg = getGuildConfig(message.guild.id);
      if (!cfg.ticketCategoryId) {
        return message.reply({
          embeds: [errorEmbed(`Configura primeiro com \`${p}tickets configurar #categoria\`.`)],
        });
      }

      const embed = new EmbedBuilder(ticketPanel(cfg.tickets?.panelTitle, cfg.tickets?.panelDescription));
      const msg = await message.channel.send({
        embeds: [embed],
        components: [ticketOpenButton()],
      });

      setGuildConfig(message.guild.id, {
        tickets: { ...cfg.tickets, channelId: msg.channel.id, messageId: msg.id },
      });

      return message.reply({
        embeds: [successEmbed('Painel de tickets publicado', msg.url)],
      });
    }

    return message.reply({
      embeds: [errorEmbed(`Subcomando desconhecido. Usa \`${p}tickets info\`.`)],
    });
  },
};
