const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { publishFaqPanel } = require('../../services/faqPanel');

module.exports = {
  name: 'faq',
  description: 'Publica painel de informações com menu',
  aliases: ['infos', 'info'],
  adminOnly: true,
  async execute(message, args) {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')] });
    }

    const sub = (args[0] || 'painel').toLowerCase();
    if (sub !== 'painel' && sub !== 'panel') {
      return message.reply({
        embeds: [errorEmbed('Usa `f!faq painel` para publicar o painel de informações neste canal.')],
      });
    }

    const result = await publishFaqPanel(message.channel, 'default');
    if (!result.ok) {
      return message.reply({ embeds: [errorEmbed(result.error)] });
    }

    return message.reply({
      embeds: [successEmbed('Painel publicado', 'O painel de informações com menu foi publicado neste canal ♡')],
    });
  },
};
