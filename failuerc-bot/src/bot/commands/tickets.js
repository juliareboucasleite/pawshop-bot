const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { setGuildConfig, getGuildConfig } = require('../../utils/store');
const { ticketPanel, errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { ticketOpenButton } = require('../../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('Sistema de tickets de suporte')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('painel').setDescription('Publica o painel de abertura de tickets'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('configurar')
        .setDescription('Define categoria e cargos de suporte')
        .addChannelOption((opt) =>
          opt
            .setName('categoria')
            .setDescription('Categoria onde os tickets serão criados')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName('suporte1').setDescription('Cargo de moderação/suporte').setRequired(false),
        )
        .addRoleOption((opt) =>
          opt.setName('suporte2').setDescription('Cargo de suporte extra').setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('info').setDescription('Mostra a configuração de tickets'),
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'configurar') {
      const category = interaction.options.getChannel('categoria');
      const roles = ['suporte1', 'suporte2']
        .map((k) => interaction.options.getRole(k))
        .filter(Boolean)
        .map((r) => r.id);

      setGuildConfig(interaction.guild.id, {
        ticketCategoryId: category.id,
        supportRoleIds: roles,
      });

      const roleText = roles.length ? roles.map((id) => `<@&${id}>`).join(', ') : 'nenhum cargo extra';
      return interaction.reply({
        embeds: [successEmbed('Tickets configurados', `Categoria: ${category.name}\nSuporte: ${roleText}`)],
        ephemeral: true,
      });
    }

    if (sub === 'info') {
      const cfg = getGuildConfig(interaction.guild.id);
      const lines = [
        `**Categoria:** ${cfg.ticketCategoryId ? `<#${cfg.ticketCategoryId}>` : '—'}`,
        `**Suporte:** ${cfg.supportRoleIds?.length ? cfg.supportRoleIds.map((id) => `<@&${id}>`).join(', ') : '—'}`,
        `**Painel:** ${cfg.tickets?.messageId ? `<#${cfg.tickets.channelId}>` : '—'}`,
      ];
      return interaction.reply({ embeds: [infoEmbed('Tickets', lines.join('\n'))], ephemeral: true });
    }

    if (sub === 'painel') {
      const cfg = getGuildConfig(interaction.guild.id);
      if (!cfg.ticketCategoryId) {
        return interaction.reply({
          embeds: [errorEmbed('Configura primeiro com `/tickets configurar`.')],
          ephemeral: true,
        });
      }

  const embed = new EmbedBuilder(ticketPanel(cfg.tickets?.panelTitle, cfg.tickets?.panelDescription));
      const msg = await interaction.channel.send({
        embeds: [embed],
        components: [ticketOpenButton()],
      });

      setGuildConfig(interaction.guild.id, {
        tickets: { channelId: msg.channel.id, messageId: msg.id },
      });

      return interaction.reply({
        embeds: [successEmbed('Painel de tickets publicado', msg.url)],
        ephemeral: true,
      });
    }
  },
};
