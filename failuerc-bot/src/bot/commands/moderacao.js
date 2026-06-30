const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator } = require('../../utils/permissions');
const { getGuildConfig, updateGuildConfig } = require('../../utils/store');
const { verifyMember } = require('../../services/verification');
const { errorEmbed, successEmbed, infoEmbed, modHelpEmbed, warnListEmbed } = require('../../utils/embeds');
const {
  showCloseTicketModal,
  isTicketChannel,
  parseTicketOwnerId,
} = require('../../services/tickets');
const {
  purgeMessages,
  nukeChannel,
  kickMember,
  banMember,
  timeoutMember,
  untimeoutMember,
  clampAmount,
  clampMinutes,
  requireModPermission,
  PermissionFlagsBits: ModPerms,
} = require('../../services/moderationActions');
const { warnMember, getWarnings, clearWarnings, applyAutoPunish } = require('../../services/warnings');
const { scanChannelForInvites } = require('../../services/inviteScan');
const { EmbedBuilder } = require('discord.js');

function checkModerator(interaction, cfg) {
  if (!isModerator(interaction.member, cfg.supportRoleIds)) {
    return false;
  }
  return true;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderacao')
    .setDescription('Ferramentas de moderação')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('limpar')
        .setDescription('Apaga mensagens do canal (até 100)')
        .addIntegerOption((opt) =>
          opt.setName('quantidade').setDescription('1–100 mensagens').setRequired(true).setMinValue(1).setMaxValue(100),
        )
        .addUserOption((opt) =>
          opt.setName('membro').setDescription('Apagar só mensagens deste membro'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('nuke')
        .setDescription('Recria o canal atual (apaga todo o histórico)')
        .addBooleanOption((opt) =>
          opt.setName('confirmar').setDescription('Confirma que queres apagar o canal').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('expulsar')
        .setDescription('Expulsa um membro do servidor')
        .addUserOption((opt) =>
          opt.setName('membro').setDescription('Membro a expulsar').setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName('motivo').setDescription('Motivo da expulsão'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('banir')
        .setDescription('Bane um membro do servidor')
        .addUserOption((opt) =>
          opt.setName('membro').setDescription('Membro a banir').setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName('motivo').setDescription('Motivo do banimento'),
        )
        .addIntegerOption((opt) =>
          opt.setName('apagar_mensagens').setDescription('Apagar mensagens dos últimos dias (0–7)').setMinValue(0).setMaxValue(7),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('silenciar')
        .setDescription('Silencia um membro (timeout)')
        .addUserOption((opt) =>
          opt.setName('membro').setDescription('Membro a silenciar').setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName('minutos').setDescription('Duração em minutos').setRequired(true).setMinValue(1).setMaxValue(40320),
        )
        .addStringOption((opt) =>
          opt.setName('motivo').setDescription('Motivo'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('dessilenciar')
        .setDescription('Remove o silenciamento de um membro')
        .addUserOption((opt) =>
          opt.setName('membro').setDescription('Membro').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('convites')
        .setDescription('Configura o bloqueador de convites externos')
        .addStringOption((opt) =>
          opt
            .setName('acao')
            .setDescription('O que fazer ao detetar convite de outro servidor')
            .addChoices(
              { name: 'Só apagar mensagem', value: 'delete' },
              { name: 'Silenciar autor', value: 'mute' },
              { name: 'Expulsar autor', value: 'kick' },
            ),
        )
        .addBooleanOption((opt) =>
          opt.setName('ativo').setDescription('Ativar ou desativar o bloqueador'),
        )
        .addChannelOption((opt) =>
          opt.setName('logs').setDescription('Canal para registos de moderação'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('avisar')
        .setDescription('Regista uma advertência a um membro')
        .addUserOption((opt) =>
          opt.setName('membro').setDescription('Membro').setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName('motivo').setDescription('Motivo da advertência'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('avisos')
        .setDescription('Lista as advertências de um membro')
        .addUserOption((opt) =>
          opt.setName('membro').setDescription('Membro').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('scan-convites')
        .setDescription('Procura convites em mensagens antigas do canal')
        .addChannelOption((opt) =>
          opt.setName('canal').setDescription('Canal a varrer (padrão: atual)'),
        )
        .addIntegerOption((opt) =>
          opt.setName('limite').setDescription('Mensagens a analisar (10–1000)').setMinValue(10).setMaxValue(1000),
        )
        .addBooleanOption((opt) =>
          opt.setName('apagar').setDescription('Apagar mensagens com convites externos'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('antispam')
        .setDescription('Ativa ou desativa o anti-spam')
        .addBooleanOption((opt) =>
          opt.setName('ativo').setDescription('Ativar ou desativar'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('ajuda')
        .setDescription('Lista comandos de moderação'),
    )
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

    if (sub === 'ajuda') {
      return interaction.reply({ embeds: [modHelpEmbed()], ephemeral: true });
    }

    if (sub === 'verificar') {
      if (!checkModerator(interaction, cfg)) {
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
      if (!checkModerator(interaction, cfg) && interaction.user.id !== ownerId) {
        return interaction.reply({ embeds: [errorEmbed('Sem permissão.')], ephemeral: true });
      }

      return showCloseTicketModal(interaction);
    }

    if (!checkModerator(interaction, cfg)) {
      return interaction.reply({ embeds: [errorEmbed('Sem permissão de moderação.')], ephemeral: true });
    }

    if (sub === 'limpar') {
      const perm = requireModPermission(interaction.member, ModPerms.ManageMessages);
      if (!perm.ok) return interaction.reply({ embeds: [errorEmbed(perm.error)], ephemeral: true });

      const amount = clampAmount(interaction.options.getInteger('quantidade'));
      const user = interaction.options.getUser('membro');

      await interaction.deferReply({ ephemeral: true });
      const deleted = await purgeMessages(interaction.channel, amount, {
        userId: user?.id,
        moderator: interaction.user,
      });

      return interaction.editReply({
        embeds: [successEmbed(
          'Mensagens apagadas',
          `**${deleted}** mensagem(ns) removida(s)${user ? ` de ${user}` : ''}.`,
        )],
      });
    }

    if (sub === 'nuke') {
      const perm = requireModPermission(interaction.member, ModPerms.ManageChannels);
      if (!perm.ok) return interaction.reply({ embeds: [errorEmbed(perm.error)], ephemeral: true });

      if (!interaction.options.getBoolean('confirmar')) {
        return interaction.reply({
          embeds: [errorEmbed('Precisas de confirmar com `confirmar: Sim` para recriar o canal.')],
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });
      const newChannel = await nukeChannel(interaction.channel, interaction.user);

      return interaction.editReply({
        embeds: [successEmbed('Canal recriado', `Nuke concluído → ${newChannel}`)],
      });
    }

    if (sub === 'expulsar') {
      const perm = requireModPermission(interaction.member, ModPerms.KickMembers);
      if (!perm.ok) return interaction.reply({ embeds: [errorEmbed(perm.error)], ephemeral: true });

      const user = interaction.options.getUser('membro');
      const reason = interaction.options.getString('motivo') || '';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        return interaction.reply({ embeds: [errorEmbed('Membro não encontrado.')], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const result = await kickMember(member, reason, interaction.user);

      if (!result.ok) return interaction.editReply({ embeds: [errorEmbed(result.error)] });
      return interaction.editReply({
        embeds: [successEmbed('Membro expulso', `${user.tag} foi expulso do servidor.`)],
      });
    }

    if (sub === 'banir') {
      const perm = requireModPermission(interaction.member, ModPerms.BanMembers);
      if (!perm.ok) return interaction.reply({ embeds: [errorEmbed(perm.error)], ephemeral: true });

      const user = interaction.options.getUser('membro');
      const reason = interaction.options.getString('motivo') || '';
      const days = interaction.options.getInteger('apagar_mensagens') ?? 0;

      await interaction.deferReply({ ephemeral: true });
      const result = await banMember(interaction.guild, user, reason, interaction.user, days);

      if (!result.ok) return interaction.editReply({ embeds: [errorEmbed(result.error)] });
      return interaction.editReply({
        embeds: [successEmbed('Membro banido', `${user.tag} foi banido do servidor.`)],
      });
    }

    if (sub === 'silenciar') {
      const perm = requireModPermission(interaction.member, ModPerms.ModerateMembers);
      if (!perm.ok) return interaction.reply({ embeds: [errorEmbed(perm.error)], ephemeral: true });

      const user = interaction.options.getUser('membro');
      const minutes = clampMinutes(interaction.options.getInteger('minutos'));
      const reason = interaction.options.getString('motivo') || '';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        return interaction.reply({ embeds: [errorEmbed('Membro não encontrado.')], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const result = await timeoutMember(member, minutes, reason, interaction.user);

      if (!result.ok) return interaction.editReply({ embeds: [errorEmbed(result.error)] });
      return interaction.editReply({
        embeds: [successEmbed('Membro silenciado', `${user.tag} silenciado por **${minutes}** min.`)],
      });
    }

    if (sub === 'dessilenciar') {
      const perm = requireModPermission(interaction.member, ModPerms.ModerateMembers);
      if (!perm.ok) return interaction.reply({ embeds: [errorEmbed(perm.error)], ephemeral: true });

      const user = interaction.options.getUser('membro');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        return interaction.reply({ embeds: [errorEmbed('Membro não encontrado.')], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const result = await untimeoutMember(member, interaction.user);

      if (!result.ok) return interaction.editReply({ embeds: [errorEmbed(result.error)] });
      return interaction.editReply({
        embeds: [successEmbed('Silenciamento removido', `${user.tag} pode falar novamente.`)],
      });
    }

    if (sub === 'convites') {
      const ativo = interaction.options.getBoolean('ativo');
      const acao = interaction.options.getString('acao');
      const logs = interaction.options.getChannel('logs');

      if (ativo === null && !acao && !logs) {
        const ib = cfg.inviteBlocker || {};
        const actionLabel = ib.action === 'kick' ? 'Expulsar' : ib.action === 'mute' ? 'Silenciar' : 'Só apagar';
        return interaction.reply({
          embeds: [infoEmbed('Bloqueador de convites', [
            `**Estado:** ${ib.enabled ? '✅ Ativo' : '❌ Inativo'}`,
            `**Ação:** ${actionLabel}`,
            `**Logs:** ${ib.logChannelId ? `<#${ib.logChannelId}>` : '—'}`,
            '',
            'Monitoriza **todos** os canais de texto e remove convites de outros servidores.',
          ].join('\n'))],
          ephemeral: true,
        });
      }

      updateGuildConfig(interaction.guild.id, (c) => ({
        ...c,
        inviteBlocker: {
          ...c.inviteBlocker,
          enabled: ativo ?? c.inviteBlocker?.enabled ?? false,
          action: acao || c.inviteBlocker?.action || 'delete',
          logChannelId: logs?.id ?? c.inviteBlocker?.logChannelId ?? null,
        },
        moderation: {
          ...c.moderation,
          logChannelId: logs?.id ?? c.moderation?.logChannelId ?? null,
        },
      }));

      const updated = getGuildConfig(interaction.guild.id);
      const ib = updated.inviteBlocker;

      return interaction.reply({
        embeds: [successEmbed(
          'Bloqueador atualizado',
          `**Estado:** ${ib.enabled ? 'Ativo' : 'Inativo'}\n**Ação:** ${ib.action}\n**Logs:** ${ib.logChannelId ? `<#${ib.logChannelId}>` : '—'}`,
        )],
        ephemeral: true,
      });
    }

    if (sub === 'avisar') {
      const perm = requireModPermission(interaction.member, ModPerms.ModerateMembers);
      if (!perm.ok) return interaction.reply({ embeds: [errorEmbed(perm.error)], ephemeral: true });

      const user = interaction.options.getUser('membro');
      const reason = interaction.options.getString('motivo') || 'Sem motivo indicado';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      await interaction.deferReply({ ephemeral: true });
      const result = warnMember(interaction.guild, user, reason, interaction.user);

      let extra = `**${user.tag}** agora tem **${result.count}** aviso(s).`;
      if (member) {
        const auto = await applyAutoPunish(member, result.count, cfg, interaction.user);
        if (auto?.action === 'mute') extra += `\nSilenciado automaticamente por **${auto.minutes}** min.`;
        if (auto?.action === 'kick') extra += '\nExpulso automaticamente por avisos acumulados.';
      }

      return interaction.editReply({ embeds: [successEmbed('Advertência registada', extra)] });
    }

    if (sub === 'avisos') {
      const user = interaction.options.getUser('membro');
      const warnings = getWarnings(cfg, user.id);
      return interaction.reply({
        embeds: [new EmbedBuilder(warnListEmbed(user, warnings))],
        ephemeral: true,
      });
    }

    if (sub === 'scan-convites') {
      const perm = requireModPermission(interaction.member, ModPerms.ManageMessages);
      if (!perm.ok) return interaction.reply({ embeds: [errorEmbed(perm.error)], ephemeral: true });

      const channel = interaction.options.getChannel('canal') || interaction.channel;
      const limit = interaction.options.getInteger('limite') || 200;
      const deleteForeign = interaction.options.getBoolean('apagar') || false;

      await interaction.deferReply({ ephemeral: true });
      const results = await scanChannelForInvites(channel, interaction.client, { limit, deleteForeign });

      const lines = [
        `**Mensagens analisadas:** ${results.scanned}`,
        `**Convites externos:** ${results.foreign.length}`,
        `**Convites deste servidor:** ${results.local.length}`,
      ];
      if (deleteForeign) lines.push(`**Apagadas:** ${results.deleted}`);

      return interaction.editReply({
        embeds: [infoEmbed('Scan de convites', lines.join('\n'))],
      });
    }

    if (sub === 'antispam') {
      const ativo = interaction.options.getBoolean('ativo');
      if (ativo === null) {
        const as = cfg.antiSpam || {};
        return interaction.reply({
          embeds: [infoEmbed('Anti-spam', `**Estado:** ${as.enabled ? '✅ Ativo' : '❌ Inativo'}`)],
          ephemeral: true,
        });
      }

      updateGuildConfig(interaction.guild.id, (c) => ({
        ...c,
        antiSpam: { ...c.antiSpam, enabled: ativo },
      }));

      return interaction.reply({
        embeds: [successEmbed('Anti-spam', ativo ? 'Anti-spam **ativado**.' : 'Anti-spam **desativado**.')],
        ephemeral: true,
      });
    }
  },
};
