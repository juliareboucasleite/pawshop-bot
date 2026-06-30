const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { getGuildConfig, updateGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comunidade')
    .setDescription('Configura canais de confissão e desabafo')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('configurar')
        .setDescription('Define os canais de confissão e desabafo')
        .addChannelOption((opt) =>
          opt.setName('confissao').setDescription('Canal para confissões').setRequired(false),
        )
        .addChannelOption((opt) =>
          opt.setName('desabafo').setDescription('Canal para desabafos').setRequired(false),
        ),
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
        `**Confissões:** ${cfg.community?.confissaoChannelId ? `<#${cfg.community.confissaoChannelId}>` : '— não definido —'}`,
        `**Desabafos:** ${cfg.community?.desabafoChannelId ? `<#${cfg.community.desabafoChannelId}>` : '— não definido —'}`,
        '',
        'Comandos: `f!confissao` e `f!desabafo`',
      ];
      return interaction.reply({
        embeds: [infoEmbed('Comunidade', lines.join('\n'))],
        ephemeral: true,
      });
    }

    const confissao = interaction.options.getChannel('confissao');
    const desabafo = interaction.options.getChannel('desabafo');

    if (!confissao && !desabafo) {
      return interaction.reply({
        embeds: [errorEmbed('Indica pelo menos um canal (confissão ou desabafo).')],
        ephemeral: true,
      });
    }

    updateGuildConfig(interaction.guild.id, (cfg) => ({
      ...cfg,
      community: {
        ...cfg.community,
        confissaoChannelId: confissao?.id || cfg.community?.confissaoChannelId || null,
        desabafoChannelId: desabafo?.id || cfg.community?.desabafoChannelId || null,
      },
    }));

    const parts = [];
    if (confissao) parts.push(`Confissões → ${confissao}`);
    if (desabafo) parts.push(`Desabafos → ${desabafo}`);

    return interaction.reply({
      embeds: [successEmbed('Comunidade configurada', parts.join('\n'))],
      ephemeral: true,
    });
  },
};
