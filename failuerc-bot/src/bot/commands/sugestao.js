const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { getGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { publishSuggestionPanel } = require('../../services/suggestions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sugestao')
    .setDescription('Painel e configuração de sugestões')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('painel').setDescription('Publica o painel de sugestões neste canal'),
    )
    .addSubcommand((sub) =>
      sub.setName('info').setDescription('Mostra a configuração atual'),
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Precisas de permissão de administrador.')],
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'info') {
      const cfg = getGuildConfig(interaction.guild.id);
      const lines = [
        `**Canal:** ${cfg.suggestions?.channelId ? `<#${cfg.suggestions.channelId}>` : '— não publicado —'}`,
        `**Sugestões registadas:** ${Object.keys(cfg.suggestions?.posts || {}).length}`,
        '',
        'Usa o botão **Sugerir funcionalidade** no painel. O botão **Discuss** cria uma thread pública.',
      ];
      return interaction.reply({
        embeds: [infoEmbed('Sugestões', lines.join('\n'))],
        ephemeral: true,
      });
    }

    const msg = await publishSuggestionPanel(interaction.channel);

    return interaction.reply({
      embeds: [successEmbed('Painel publicado', `Sugestões ativas em ${msg.url}`)],
      ephemeral: true,
    });
  },
};
