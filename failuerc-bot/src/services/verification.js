const { ChannelType, EmbedBuilder } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/store');
const { checkAltAccount } = require('./altDetection');
const {
  successEmbed,
  errorEmbed,
  verifiedLogEmbed,
  verificationWaitingEmbed,
  verifiedNotifyEmbed,
  waitingNotifyEmbed,
} = require('../utils/embeds');

function supportMentions(cfg) {
  if (!cfg.supportRoleIds?.length) return '';
  return cfg.supportRoleIds.map((id) => `<@&${id}>`).join(' ');
}

function setOpenWaitingThread(guildId, userId, threadId) {
  updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    verification: {
      ...cfg.verification,
      openWaitingThreads: {
        ...(cfg.verification?.openWaitingThreads || {}),
        [userId]: threadId,
      },
    },
  }));
}

function clearOpenWaitingThread(guildId, userId) {
  updateGuildConfig(guildId, (cfg) => {
    const openWaitingThreads = { ...(cfg.verification?.openWaitingThreads || {}) };
    delete openWaitingThreads[userId];
    return {
      ...cfg,
      verification: {
        ...cfg.verification,
        openWaitingThreads,
      },
    };
  });
}

async function sendUserVerificationLog(client, guild, member, result) {
  const cfg = getGuildConfig(guild.id);
  const channelId = cfg.verification?.channelId;
  if (!channelId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  let body;
  if (result.ok) {
    body = result.already
      ? successEmbed(
          'Verificação — já verificado',
          `Já tinhas o cargo **${result.roleName}** neste servidor.`,
        )
      : successEmbed(
          'Verificação concluída',
          `Recebeste o cargo **${result.roleName}** com sucesso.`,
        );
  } else if (result.isAlt) {
    body = errorEmbed(result.error || 'Conta alternativa detetada.');
  } else {
    body = errorEmbed(result.error || 'Não foi possível verificar.');
  }

  const payload = {
    content: `<@${member.id}>`,
    embeds: [new EmbedBuilder(body)],
  };

  try {
    if (channel.threads?.create) {
      const thread = await channel.threads.create({
        name: `verify-${member.user.username}`.slice(0, 100),
        type: ChannelType.PrivateThread,
        autoArchiveDuration: 60,
        reason: 'Log de verificação Failuerc',
      });
      await thread.members.add(member.id);
      await thread.send(payload);
      return;
    }
  } catch {
    /* thread privada indisponível — tenta DM */
  }

  try {
    await member.send(payload);
  } catch {
    /* DMs fechadas */
  }
}

async function logVerifiedMember(guild, member, role, options = {}) {
  const cfg = getGuildConfig(guild.id);
  const logChannelId = cfg.verification?.logChannelId;
  if (logChannelId) {
    const logCh = await guild.channels.fetch(logChannelId).catch(() => null);
    if (logCh?.isTextBased()) {
      try {
        await logCh.send({
          embeds: [new EmbedBuilder(verifiedLogEmbed(member, role, options))],
        });
      } catch {
        /* log opcional */
      }
    }
  }

  await notifyVerifiedChannel(guild, member, role, options);
}

async function notifyVerifiedChannel(guild, member, role, options = {}) {
  const cfg = getGuildConfig(guild.id);
  const channelId = cfg.verification?.verifiedNotifyChannelId;
  if (!channelId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  try {
    await channel.send({
      embeds: [new EmbedBuilder(verifiedNotifyEmbed(member, role, options))],
    });
  } catch {
    /* opcional */
  }
}

async function notifyWaitingChannel(guild, member, thread, reason) {
  const cfg = getGuildConfig(guild.id);
  const channelId = cfg.verification?.waitingNotifyChannelId;
  if (!channelId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  try {
    await channel.send({
      embeds: [new EmbedBuilder(waitingNotifyEmbed(member, thread, reason))],
    });
  } catch {
    /* opcional */
  }
}

async function notifyStaffNewWaiting(guild, member, thread, reason) {
  const cfg = getGuildConfig(guild.id);
  const staffChannelId = cfg.verification?.staffChatChannelId;
  if (!staffChannelId) return;

  const staffCh = await guild.channels.fetch(staffChannelId).catch(() => null);
  if (!staffCh?.isTextBased()) return;

  const mentions = supportMentions(cfg);
  const lines = [
    mentions,
    `📋 Nova verificação aguardando: ${member} — <#${thread.id}>`,
    reason ? `Motivo: ${reason}` : null,
  ].filter(Boolean);

  try {
    await staffCh.send(lines.join('\n'));
  } catch {
    /* opcional */
  }
}

async function openWaitingThread(client, guild, member, { reason = null, source = 'manual' } = {}) {
  const cfg = getGuildConfig(guild.id);
  const waitingChannelId = cfg.verification?.waitingChannelId;
  if (!waitingChannelId) {
    return { ok: false, error: 'Canal de waiting-verificação não configurado no painel.' };
  }

  const existingThreadId = cfg.verification?.openWaitingThreads?.[member.id];
  if (existingThreadId) {
    const existing = await guild.channels.fetch(existingThreadId).catch(() => null);
    if (existing && !existing.archived) {
      return { ok: true, already: true, thread: existing, url: existing.url };
    }
    clearOpenWaitingThread(guild.id, member.id);
  }

  const parent = await guild.channels.fetch(waitingChannelId).catch(() => null);
  if (!parent?.isTextBased?.()) {
    return { ok: false, error: 'Canal waiting-verificação inválido ou inacessível.' };
  }

  if (!parent.threads?.create) {
    return { ok: false, error: 'O canal waiting-verificação precisa de ter threads ativas.' };
  }

  const threadName = `verif-${member.user.username}`.slice(0, 100).replace(/[^a-zA-Z0-9-_]/g, '-');

  try {
    const thread = await parent.threads.create({
      name: threadName,
      type: ChannelType.PrivateThread,
      autoArchiveDuration: 10080,
      reason: `Verificação Failuerc (${source})`,
    });

    await thread.members.add(member.id);
    setOpenWaitingThread(guild.id, member.id, thread.id);

    const embed = verificationWaitingEmbed(member, reason);
    await thread.send({
      content: [supportMentions(cfg), `<@${member.id}>`].filter(Boolean).join(' '),
      embeds: [new EmbedBuilder(embed)],
    });

    await notifyStaffNewWaiting(guild, member, thread, reason);
    await notifyWaitingChannel(guild, member, thread, reason);

    return { ok: true, already: false, thread, url: thread.url };
  } catch (err) {
    return { ok: false, error: err.message || 'Não foi possível criar a thread de verificação.' };
  }
}

async function closeWaitingThread(client, guildId, userId, { approved = false, roleName = null } = {}) {
  const cfg = getGuildConfig(guildId);
  const threadId = cfg.verification?.openWaitingThreads?.[userId];
  if (!threadId) return;

  clearOpenWaitingThread(guildId, userId);

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const thread = await guild.channels.fetch(threadId).catch(() => null);
  if (!thread?.isThread?.()) return;

  try {
    if (approved) {
      await thread.send({
        embeds: [new EmbedBuilder(successEmbed(
          'Verificação aprovada',
          roleName
            ? `Cargo **${roleName}** atribuído. Esta thread será arquivada.`
            : 'Verificação concluída. Esta thread será arquivada.',
        ))],
      });
    }
    await thread.setArchived(true, 'Verificação concluída');
  } catch {
    /* opcional */
  }
}

function recordVerifiedUser(guildId, userId, ipHash) {
  if (!ipHash) return;
  updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    verification: {
      ...cfg.verification,
      registry: {
        ...(cfg.verification?.registry || {}),
        [userId]: { ipHash, verifiedAt: Date.now() },
      },
    },
  }));
}

async function verifyMember(client, guildId, userId, options = {}) {
  const {
    ipHash = null,
    skipAltCheck = false,
    source = 'oauth',
    moderator = null,
    claimer = null,
  } = options;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, error: 'Servidor não encontrado.' };

  const cfg = getGuildConfig(guildId);
  const roleId = options.roleIdOverride || cfg.verifiedRoleId;

  if (cfg.verification?.enabled === false) {
    return { ok: false, error: 'A verificação está desativada neste servidor.' };
  }

  if (!roleId) {
    return { ok: false, error: 'Verificação não configurada neste servidor.' };
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return { ok: false, error: 'Não estás neste servidor Discord. Entra primeiro e tenta de novo.' };
  }

  const role = guild.roles.cache.get(roleId);
  if (!role) return { ok: false, error: 'Cargo de verificado não existe.' };

  if (role.managed || role.position >= guild.members.me.roles.highest.position) {
    return { ok: false, error: 'O bot não consegue atribuir esse cargo — ajusta a hierarquia.' };
  }

  if (member.roles.cache.has(role.id)) {
    const result = { ok: true, already: true, guildName: guild.name, roleName: role.name };
    await sendUserVerificationLog(client, guild, member, result);
    return result;
  }

  if (!skipAltCheck) {
    const alt = checkAltAccount(member, cfg, ipHash);
    if (alt.isAlt) {
      const result = { ok: false, isAlt: true, error: alt.reason };
      await sendUserVerificationLog(client, guild, member, result);
      await openWaitingThread(client, guild, member, {
        reason: alt.reason,
        source: 'oauth-recusado',
      });
      return result;
    }
  }

  await member.roles.add(role, source === 'manual' ? 'Verificação manual Failuerc' : 'Verificação OAuth Failuerc');
  recordVerifiedUser(guildId, userId, ipHash);

  await logVerifiedMember(guild, member, role, { source, moderator, claimer });
  await closeWaitingThread(client, guildId, userId, { approved: true, roleName: role.name });

  const result = { ok: true, already: false, guildName: guild.name, roleName: role.name };
  await sendUserVerificationLog(client, guild, member, result);
  return result;
}

async function openVerificationTicket(interaction) {
  const cfg = getGuildConfig(interaction.guild.id);

  if (cfg.verification?.enabled === false) {
    return interaction.reply({
      embeds: [errorEmbed('A verificação está desativada neste servidor.')],
      ephemeral: true,
    });
  }

  if (!cfg.verifiedRoleId) {
    return interaction.reply({
      embeds: [errorEmbed('Verificação ainda não configurada.')],
      ephemeral: true,
    });
  }

  const role = interaction.guild.roles.cache.get(cfg.verifiedRoleId);
  if (role && interaction.member.roles.cache.has(role.id)) {
    return interaction.reply({
      embeds: [successEmbed('Já verificada', `Já tens o cargo **${role.name}**.`)],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const opened = await openWaitingThread(interaction.client, interaction.guild, interaction.member, {
    reason: 'Pedido manual pelo painel',
    source: 'manual',
  });

  if (!opened.ok) {
    return interaction.editReply({ embeds: [errorEmbed(opened.error)] });
  }

  if (opened.already) {
    return interaction.editReply({
      embeds: [successEmbed('Thread existente', `Já tens um pedido aberto: ${opened.url}`)],
    });
  }

  return interaction.editReply({
    embeds: [successEmbed('Pedido aberto', `A staff vai rever em breve: ${opened.url}`)],
  });
}

module.exports = {
  verifyMember,
  openVerificationTicket,
  openWaitingThread,
  logVerifiedMember,
};
