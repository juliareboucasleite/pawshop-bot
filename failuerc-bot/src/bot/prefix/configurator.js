const { isAdmin } = require('../../utils/permissions');
const { errorEmbed } = require('../../utils/embeds');
const { renderView } = require('../configurator/views');

module.exports = {
  name: 'configurator',
  description: 'Abre o configurador de tickets e verificação (admin)',
  async execute(message) {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')] });
    }

    const payload = renderView('main', message.guild.id);
    await message.reply(payload);
  },
};
