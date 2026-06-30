const { isAdmin } = require('../../utils/permissions');
const { errorEmbed } = require('../../utils/embeds');
const { buildAdminPanelEmbed } = require('../shared/adminPanel');

module.exports = {
  name: 'painel',
  description: 'Resumo da configuração (admin)',
  adminOnly: true,
  async execute(message) {
    const member = message.member;
    if (!member || !isAdmin(member)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')] });
    }

    await message.reply({ embeds: [buildAdminPanelEmbed(message.guild.id)] });
  },
};
