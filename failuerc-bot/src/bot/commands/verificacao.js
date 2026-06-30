const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { setGuildConfig, getGuildConfig, updateGuildConfig } = require('../../utils/store');
const { verificationPanel, errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { verifyButton } = require('../../utils/components');
const { buildVerifyUrl } = require('../../utils/urls');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verificacao')
    .setDescription('Painel e configuração de verificação via site')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('painel').setDescription('Publica o painel de verificação neste canal'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('configurar')
        .setDescription('Define o cargo dado após verificação no site')
        .addRoleOption((opt) =>
          opt.setName('cargo').setDescription('Cargo de verificado').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('info').setDescription('Mostra a configuração atual'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('notificacoes')
        .setDescription('Define canais de notificação de verificação')
        .addChannelOption((opt) =>
          opt.setName('verificados').setDescription('Canal para membros verificados').setRequired(false),
        )
        .addChannelOption((opt) =>
          opt.setName('aguardando').setDescription('Canal para quem aguarda verificação').setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('welcome')
        .setDescription('Canal de boas-vindas quando alguém é verificado')
        .addChannelOption((opt) =>
          opt.setName('canal').setDescription('Canal de welcome').setRequired(true),
        ),
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'configurar') {
      const role = interaction.options.getRole('cargo');
      setGuildConfig(interaction.guild.id, { verifiedRoleId: role.id });
      return interaction.reply({
        embeds: [successEmbed('Verificação configurada', `Cargo de verificado: ${role}`)],
        ephemeral: true,
      });
    }

    if (sub === 'info') {
      const cfg = getGuildConfig(interaction.guild.id);
      const lines = [
        `**Cargo verificado:** ${cfg.verifiedRoleId ? `<@&${cfg.verifiedRoleId}>` : '— não definido —'}`,
        `**Painel:** ${cfg.verification?.messageId ? `<#${cfg.verification.channelId}>` : '— não publicado —'}`,
        `**Verificadas (log):** ${cfg.verification?.logChannelId ? `<#${cfg.verification.logChannelId}>` : '—'}`,
        `**Waiting-verificação:** ${cfg.verification?.waitingChannelId ? `<#${cfg.verification.waitingChannelId}>` : '—'}`,
        `**Chat-tickets (staff):** ${cfg.verification?.staffChatChannelId ? `<#${cfg.verification.staffChatChannelId}>` : '—'}`,
        `**Notif. verificados:** ${cfg.verification?.verifiedNotifyChannelId ? `<#${cfg.verification.verifiedNotifyChannelId}>` : '—'}`,
        `**Notif. aguardando:** ${cfg.verification?.waitingNotifyChannelId ? `<#${cfg.verification.waitingNotifyChannelId}>` : '—'}`,
        `**Welcome verificados:** ${cfg.verification?.welcomeChannelId ? `<#${cfg.verification.welcomeChannelId}>` : '—'}`,
      ];
      return interaction.reply({ embeds: [infoEmbed('Verificação', lines.join('\n'))], ephemeral: true });
    }

    if (sub === 'notificacoes') {
      const verificados = interaction.options.getChannel('verificados');
      const aguardando = interaction.options.getChannel('aguardando');

      if (!verificados && !aguardando) {
        return interaction.reply({
          embeds: [errorEmbed('Indica pelo menos um canal (verificados ou aguardando).')],
          ephemeral: true,
        });
      }

      updateGuildConfig(interaction.guild.id, (cfg) => ({
        ...cfg,
        verification: {
          ...cfg.verification,
          verifiedNotifyChannelId: verificados?.id || cfg.verification?.verifiedNotifyChannelId || null,
          waitingNotifyChannelId: aguardando?.id || cfg.verification?.waitingNotifyChannelId || null,
        },
      }));

      const parts = [];
      if (verificados) parts.push(`Verificados → ${verificados}`);
      if (aguardando) parts.push(`Aguardando → ${aguardando}`);

      return interaction.reply({
        embeds: [successEmbed('Notificações configuradas', parts.join('\n'))],
        ephemeral: true,
      });
    }

    if (sub === 'welcome') {
      const channel = interaction.options.getChannel('canal');

      updateGuildConfig(interaction.guild.id, (cfg) => ({
        ...cfg,
        verification: {
          ...cfg.verification,
          welcomeChannelId: channel.id,
        },
      }));

      return interaction.reply({
        embeds: [successEmbed('Welcome configurado', `Boas-vindas de verificados → ${channel}`)],
        ephemeral: true,
      });
    }

    if (sub === 'painel') {
      const cfg = getGuildConfig(interaction.guild.id);
      if (!cfg.verifiedRoleId) {
        return interaction.reply({
          embeds: [errorEmbed('Configura primeiro o cargo com `/verificacao configurar`.')],
          ephemeral: true,
        });
      }

      const verifyUrl = buildVerifyUrl(interaction.guild.id);
      const embed = new EmbedBuilder(verificationPanel(interaction.guild.name, verifyUrl));
      const msg = await interaction.channel.send({
        embeds: [embed],
        components: [verifyButton(verifyUrl)],
      });

      setGuildConfig(interaction.guild.id, {
        verification: { channelId: msg.channel.id, messageId: msg.id },
      });

      return interaction.reply({
        embeds: [successEmbed('Painel publicado', `Verificação ativa em ${msg.url}`)],
        ephemeral: true,
      });
    }
  },
};
