const { SlashCommandBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/store');
const { errorEmbed } = require('../../utils/embeds');
const { showConfessModal } = require('../../services/communityPosts');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confess')
    .setDescription('Abre o formulário de confissão anónima'),

  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.community?.confissaoChannelId) {
      return interaction.reply({
        embeds: [errorEmbed('O canal de confissão ainda não foi configurado.')],
        ephemeral: true,
      });
    }

    await showConfessModal(interaction, interaction.guild.id);
  },
};
