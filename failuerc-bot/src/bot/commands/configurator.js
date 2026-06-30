const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { errorEmbed } = require('../../utils/embeds');
const { renderView } = require('../configurator/views');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configurator')
    .setDescription('Abre o configurador interativo de tickets e verificação')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')], ephemeral: true });
    }

    const payload = renderView('main', interaction.guild.id);
    return interaction.reply({ ...payload, ephemeral: true });
  },
};
