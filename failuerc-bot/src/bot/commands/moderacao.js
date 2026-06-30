const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator } = require('../../utils/permissions');
const { getGuildConfig } = require('../../utils/store');
const { verifyMember } = require('../../services/verification');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const {
  showCloseTicketModal,
  isTicketChannel,
  parseTicketOwnerId,
} = require('../../services/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderacao')
    .setDescription('Ferramentas de moderação')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('verificar')
        .setDescription('Verifica manualmente um membro')
        .addUserOption((opt) =>
          opt.setName('membro').setDescription('Membro a verificar').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('fechar-ticket')
        .setDescription('Fecha o ticket do canal atual'),
    ),

  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    const sub = interaction.options.getSubcommand();

    if (sub === 'verificar') {
      if (!isModerator(interaction.member, cfg.supportRoleIds)) {
        return interaction.reply({ embeds: [errorEmbed('Sem permissão.')], ephemeral: true });
      }

      const user = interaction.options.getUser('membro');
      await interaction.deferReply({ ephemeral: true });
      const result = await verifyMember(interaction.client, interaction.guild.id, user.id, {
        skipAltCheck: true,
        source: 'manual',
        moderator: interaction.user.tag,
      });

      if (!result.ok) {
        return interaction.editReply({ embeds: [errorEmbed(result.error)] });
      }

      return interaction.editReply({
        embeds: [successEmbed('Membro verificado', `${user.tag} recebeu **${result.roleName}**.`)],
      });
    }

    if (sub === 'fechar-ticket') {
      if (!isTicketChannel(interaction.channel)) {
        return interaction.reply({ embeds: [errorEmbed('Este canal não é um ticket.')], ephemeral: true });
      }

      const ownerId = parseTicketOwnerId(interaction.channel.topic || '');
      if (!isModerator(interaction.member, cfg.supportRoleIds) && interaction.user.id !== ownerId) {
        return interaction.reply({ embeds: [errorEmbed('Sem permissão.')], ephemeral: true });
      }

      return showCloseTicketModal(interaction);
    }
  },
};
