const { EmbedBuilder } = require('discord.js');
const config = require('../../../config/default.json');
const { isModerator } = require('../../utils/permissions');
const { getGuildConfig, updateGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed, infoEmbed, modHelpEmbed, warnListEmbed } = require('../../utils/embeds');
const { parseChannelArg } = require('../../utils/prefixArgs');
const {
  kickMember,
  banMember,
  timeoutMember,
  untimeoutMember,
  clampMinutes,
  requireModPermission,
  PermissionFlagsBits,
} = require('../../services/moderationActions');
const { warnMember, getWarnings, clearWarnings, applyAutoPunish } = require('../../services/warnings');
const { scanChannelForInvites } = require('../../services/inviteScan');

function parseMemberArg(arg, guild) {
  if (!arg) return null;
  const mention = arg.match(/^<@!?(\d+)>$/);
  if (mention) return guild.members.cache.get(mention[1]) || null;
  const byId = guild.members.cache.get(arg);
  if (byId) return byId;
  const lower = arg.toLowerCase();
  return guild.members.cache.find(
    (m) => m.user.username.toLowerCase() === lower || m.displayName.toLowerCase() === lower,
  ) || null;
}

function showConvitesStatus(message) {
  const cfg = getGuildConfig(message.guild.id);
  const ib = cfg.inviteBlocker || {};
  const actionLabel = ib.action === 'kick' ? 'Expulsar' : ib.action === 'mute' ? 'Silenciar' : 'Só apagar';
  const p = config.bot.prefix;

  return message.reply({
    embeds: [new EmbedBuilder(infoEmbed('Bloqueador de convites', [
      `**Estado:** ${ib.enabled ? '✅ Ativo' : '❌ Inativo'}`,
      `**Ação:** ${actionLabel}`,
      `**Logs:** ${ib.logChannelId ? `<#${ib.logChannelId}>` : '—'}`,
      '',
      'Monitoriza todos os canais e remove convites de outros servidores.',
      '',
      `\`${p}mod convites on\` · \`${p}mod convites off\``,
      `\`${p}mod convites acao apagar|silenciar|expulsar\``,
      `\`${p}mod convites log #canal\``,
      `\`${p}mod convites scan [#canal] [limite]\` — procura convites antigos`,
    ].join('\n')))],
  });
}

async function handleConvites(message, args) {
  const sub = (args[0] || 'status').toLowerCase();
  const cfg = getGuildConfig(message.guild.id);

  if (sub === 'status' || sub === 'info' || sub === 'estado') {
    return showConvitesStatus(message);
  }

  if (sub === 'on' || sub === 'ativar' || sub === 'liga') {
    updateGuildConfig(message.guild.id, (c) => ({
      ...c,
      inviteBlocker: { ...c.inviteBlocker, enabled: true },
    }));
    return message.reply({
      embeds: [successEmbed('Convites', 'Bloqueador de convites **ativado**. Convites externos serão removidos.')],
    });
  }

  if (sub === 'off' || sub === 'desativar' || sub === 'desliga') {
    updateGuildConfig(message.guild.id, (c) => ({
      ...c,
      inviteBlocker: { ...c.inviteBlocker, enabled: false },
    }));
    return message.reply({
      embeds: [successEmbed('Convites', 'Bloqueador de convites **desativado**.')],
    });
  }

  if (sub === 'acao' || sub === 'ação' || sub === 'action') {
    const raw = (args[1] || '').toLowerCase();
    const map = {
      apagar: 'delete',
      delete: 'delete',
      silenciar: 'mute',
      mute: 'mute',
      expulsar: 'kick',
      kick: 'kick',
    };
    const action = map[raw];
    if (!action) {
      return message.reply({
        embeds: [errorEmbed('Usa: `acao apagar`, `acao silenciar` ou `acao expulsar`.')],
      });
    }

    updateGuildConfig(message.guild.id, (c) => ({
      ...c,
      inviteBlocker: { ...c.inviteBlocker, action },
    }));

    const labels = { delete: 'só apagar mensagem', mute: 'silenciar autor', kick: 'expulsar autor' };
    return message.reply({
      embeds: [successEmbed('Convites', `Ação definida: **${labels[action]}**.`)],
    });
  }

  if (sub === 'log' || sub === 'logs') {
    const channel = parseChannelArg(args[1], message.guild);
    if (!channel) {
      return message.reply({ embeds: [errorEmbed('Indica um canal: `f!mod convites log #canal`.')] });
    }

    updateGuildConfig(message.guild.id, (c) => ({
      ...c,
      inviteBlocker: { ...c.inviteBlocker, logChannelId: channel.id },
      moderation: { ...c.moderation, logChannelId: channel.id },
    }));

    return message.reply({
      embeds: [successEmbed('Convites', `Logs de moderação → ${channel}`)],
    });
  }

  if (sub === 'scan' || sub === 'varrer' || sub === 'procurar') {
    let channel = message.channel;
    let limit = 200;
    const chArg = parseChannelArg(args[1], message.guild);
    if (chArg) {
      channel = chArg;
      limit = Number(args[2]) || 200;
    } else if (args[1] && !Number.isNaN(Number(args[1]))) {
      limit = Number(args[1]);
    }
    const deleteForeign = (args.includes('apagar') || args.includes('delete'));

    const status = await message.reply({
      embeds: [successEmbed('A varrer…', `A procurar convites em ${channel} (até ${limit} mensagens)…`)],
    });

    const results = await scanChannelForInvites(channel, message.client, {
      limit,
      deleteForeign,
    });

    const lines = [
      `**Mensagens analisadas:** ${results.scanned}`,
      `**Com convites:** ${results.withInvites}`,
      `**Convites externos:** ${results.foreign.length}`,
      `**Convites deste servidor:** ${results.local.length}`,
    ];
    if (deleteForeign) lines.push(`**Mensagens apagadas:** ${results.deleted}`);

    if (results.foreign.length) {
      lines.push('', '**Convites externos encontrados:**');
      for (const item of results.foreign.slice(0, 8)) {
        lines.push(`› ${item.authorTag} — \`${item.code}\` — [ir](${item.jumpUrl})`);
      }
      if (results.foreign.length > 8) {
        lines.push(`› … e mais ${results.foreign.length - 8}`);
      }
    }

    return status.edit({
      embeds: [new EmbedBuilder(infoEmbed('Scan de convites', lines.join('\n')))],
    });
  }

  return showConvitesStatus(message);
}

module.exports = {
  name: 'mod',
  description: 'Ferramentas de moderação',
  moderatorOnly: true,
  async execute(message, args) {
    const cfg = getGuildConfig(message.guild.id);
    if (!isModerator(message.member, cfg.supportRoleIds)) {
      return message.reply({ embeds: [errorEmbed('Sem permissão de moderação.')] });
    }

    const sub = (args[0] || 'ajuda').toLowerCase();
    const rest = args.slice(1);

    if (sub === 'ajuda' || sub === 'help') {
      return message.reply({ embeds: [new EmbedBuilder(modHelpEmbed())] });
    }

    if (sub === 'convites' || sub === 'invites') {
      return handleConvites(message, rest);
    }

    if (sub === 'antispam') {
      const action = (rest[0] || 'status').toLowerCase();
      if (action === 'on' || action === 'ativar') {
        updateGuildConfig(message.guild.id, (c) => ({
          ...c,
          antiSpam: { ...c.antiSpam, enabled: true },
        }));
        return message.reply({
          embeds: [successEmbed('Anti-spam', 'Anti-spam **ativado** — flood e mensagens repetidas serão bloqueadas.')],
        });
      }
      if (action === 'off' || action === 'desativar') {
        updateGuildConfig(message.guild.id, (c) => ({
          ...c,
          antiSpam: { ...c.antiSpam, enabled: false },
        }));
        return message.reply({ embeds: [successEmbed('Anti-spam', 'Anti-spam **desativado**.')] });
      }
      const as = cfg.antiSpam || {};
      return message.reply({
        embeds: [infoEmbed('Anti-spam', [
          `**Estado:** ${as.enabled ? '✅ Ativo' : '❌ Inativo'}`,
          `**Limite:** ${as.maxMessages || 5} msgs / ${as.windowSeconds || 5}s`,
          `**Repetidas:** ${as.duplicateLimit || 3} iguais`,
          '',
          `\`${config.bot.prefix}mod antispam on\` · \`off\``,
        ].join('\n'))],
      });
    }

    if (sub === 'avisar' || sub === 'warn') {
      const perm = requireModPermission(message.member, PermissionFlagsBits.ModerateMembers);
      if (!perm.ok) return message.reply({ embeds: [errorEmbed(perm.error)] });

      const member = parseMemberArg(rest[0], message.guild) || message.mentions.members.first();
      if (!member) {
        return message.reply({ embeds: [errorEmbed('Menciona um membro: `f!mod avisar @membro [motivo]`.')] });
      }

      const reason = rest.slice(1).join(' ').trim() || 'Sem motivo indicado';
      const result = warnMember(message.guild, member.user, reason, message.author);
      const auto = await applyAutoPunish(member, result.count, cfg, message.author);

      let extra = `**${member.user.tag}** agora tem **${result.count}** aviso(s).`;
      if (auto?.action === 'mute') extra += `\nSilenciado automaticamente por **${auto.minutes}** min.`;
      if (auto?.action === 'kick') extra += '\nExpulso automaticamente por avisos acumulados.';

      return message.reply({ embeds: [successEmbed('Advertência registada', extra)] });
    }

    if (sub === 'avisos' || sub === 'warns') {
      const member = parseMemberArg(rest[0], message.guild) || message.mentions.members.first();
      if (!member) {
        return message.reply({ embeds: [errorEmbed('Menciona um membro: `f!mod avisos @membro`.')] });
      }
      const warnings = getWarnings(cfg, member.id);
      return message.reply({ embeds: [new EmbedBuilder(warnListEmbed(member.user, warnings))] });
    }

    if (sub === 'limpar-avisos' || sub === 'clearwarns') {
      const member = parseMemberArg(rest[0], message.guild) || message.mentions.members.first();
      if (!member) {
        return message.reply({ embeds: [errorEmbed('Menciona um membro: `f!mod limpar-avisos @membro`.')] });
      }
      clearWarnings(message.guild.id, member.id, message.author);
      return message.reply({
        embeds: [successEmbed('Avisos limpos', `Todos os avisos de **${member.user.tag}** foram removidos.`)],
      });
    }

    if (sub === 'expulsar' || sub === 'kick') {
      const perm = requireModPermission(message.member, PermissionFlagsBits.KickMembers);
      if (!perm.ok) return message.reply({ embeds: [errorEmbed(perm.error)] });

      const member = parseMemberArg(rest[0], message.guild)
        || (message.mentions.members.first());
      if (!member) {
        return message.reply({ embeds: [errorEmbed('Menciona um membro: `f!mod expulsar @membro [motivo]`.')] });
      }

      const reason = rest.slice(1).join(' ').trim();
      const result = await kickMember(member, reason, message.author);
      if (!result.ok) return message.reply({ embeds: [errorEmbed(result.error)] });

      return message.reply({
        embeds: [successEmbed('Membro expulso', `${member.user.tag} foi expulso.`)],
      });
    }

    if (sub === 'banir' || sub === 'ban') {
      const perm = requireModPermission(message.member, PermissionFlagsBits.BanMembers);
      if (!perm.ok) return message.reply({ embeds: [errorEmbed(perm.error)] });

      const member = parseMemberArg(rest[0], message.guild)
        || (message.mentions.members.first());
      if (!member) {
        return message.reply({ embeds: [errorEmbed('Menciona um membro: `f!mod banir @membro [motivo]`.')] });
      }

      const reason = rest.slice(1).join(' ').trim();
      const result = await banMember(message.guild, member.user, reason, message.author);
      if (!result.ok) return message.reply({ embeds: [errorEmbed(result.error)] });

      return message.reply({
        embeds: [successEmbed('Membro banido', `${member.user.tag} foi banido.`)],
      });
    }

    if (sub === 'silenciar' || sub === 'mute' || sub === 'timeout') {
      const perm = requireModPermission(message.member, PermissionFlagsBits.ModerateMembers);
      if (!perm.ok) return message.reply({ embeds: [errorEmbed(perm.error)] });

      const member = parseMemberArg(rest[0], message.guild)
        || (message.mentions.members.first());
      if (!member) {
        return message.reply({
          embeds: [errorEmbed('Menciona um membro: `f!mod silenciar @membro 60 [motivo]`.')],
        });
      }

      const minutes = clampMinutes(rest[1] || 60);
      const reason = rest.slice(2).join(' ').trim();
      const result = await timeoutMember(member, minutes, reason, message.author);
      if (!result.ok) return message.reply({ embeds: [errorEmbed(result.error)] });

      return message.reply({
        embeds: [successEmbed('Membro silenciado', `${member.user.tag} silenciado por **${minutes}** min.`)],
      });
    }

    if (sub === 'dessilenciar' || sub === 'unmute') {
      const perm = requireModPermission(message.member, PermissionFlagsBits.ModerateMembers);
      if (!perm.ok) return message.reply({ embeds: [errorEmbed(perm.error)] });

      const member = parseMemberArg(rest[0], message.guild)
        || (message.mentions.members.first());
      if (!member) {
        return message.reply({ embeds: [errorEmbed('Menciona um membro: `f!mod dessilenciar @membro`.')] });
      }

      const result = await untimeoutMember(member, message.author);
      if (!result.ok) return message.reply({ embeds: [errorEmbed(result.error)] });

      return message.reply({
        embeds: [successEmbed('Silenciamento removido', `${member.user.tag} pode falar novamente.`)],
      });
    }

    return message.reply({ embeds: [new EmbedBuilder(modHelpEmbed())] });
  },
};
