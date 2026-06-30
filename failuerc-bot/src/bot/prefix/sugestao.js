const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { getGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { publishSuggestionPanel } = require('../../services/suggestions');
const config = require('../../../config/default.json');

module.exports = {
  name: 'sugestao',
  description: 'Publica o painel de sugestões',
  adminOnly: true,
  async execute(message, args) {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')] });
    }

    const sub = (args[0] || 'painel').toLowerCase();
    const p = config.bot.prefix;

    if (sub === 'info' || sub === 'ajuda') {
      const cfg = getGuildConfig(message.guild.id);
      const lines = [
        `**Canal:** ${cfg.suggestions?.channelId ? `<#${cfg.suggestions.channelId}>` : '— não publicado —'}`,
        `**Sugestões registadas:** ${Object.keys(cfg.suggestions?.posts || {}).length}`,
        '',
        `Usa \`${p}sugestao painel\` neste canal para publicar o painel.`,
        'O botão **Discuss** cria uma thread pública.',
      ];
      return message.reply({ embeds: [new EmbedBuilder(infoEmbed('Sugestões', lines.join('\n')))] });
    }

    if (sub === 'painel') {
      const msg = await publishSuggestionPanel(message.channel);
      return message.reply({
        embeds: [successEmbed('Painel publicado', `Sugestões ativas em ${msg.url}`)],
      });
    }

    return message.reply({
      embeds: [errorEmbed(`Subcomando desconhecido. Usa \`${p}sugestao painel\`.`)],
    });
  },
};
