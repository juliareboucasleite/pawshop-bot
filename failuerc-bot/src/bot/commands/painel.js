const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { errorEmbed } = require('../../utils/embeds');
const { buildAdminPanelEmbed } = require('../shared/adminPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Resumo da configuração do bot no servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')], ephemeral: true });
    }

    return interaction.reply({
      embeds: [buildAdminPanelEmbed(interaction.guild.id)],
      ephemeral: true,
    });
  },
};
