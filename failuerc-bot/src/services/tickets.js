const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const config = require('../../config/default.json');
const { CUSTOM_IDS, ticketControlButtons } = require('../utils/components');
const {
  getGuildConfig,
  setOpenTicket,
  removeOpenTicket,
  userHasOpenTicket,
  findTicketChannelByUser,
  nextTicketNumber,
  setTicketDetails,
  getTicketDetails,
  updateTicketDetails,
  removeTicketDetails,
} = require('../utils/store');
const {
  ticketOpened,
  ticketClaimSuccess,
  ticketClosedDm,
  formatTicketDate,
  successEmbed,
  errorEmbed,
} = require('../utils/embeds');
const { isModerator, hasRole } = require('../utils/permissions');
const { verifyMember } = require('./verification');

function parseTicketOwnerId(topic = '') {
  return topic.match(/^failuerc-ticket:([^:]+)/)?.[1] || null;
}

function isTicketChannel(channel) {
  const topic = channel.topic || '';
  return topic.startsWith('failuerc-ticket:') || channel.name.startsWith('ticket-');
}

function canManageTicket(member, cfg, ownerId) {
  return isModerator(member, cfg.supportRoleIds) || member?.id === ownerId;
}

function supportMentions(cfg) {
  if (!cfg.supportRoleIds?.length) return '';
  return cfg.supportRoleIds.map((id) => `<@&${id}>`).join(' ');
}

async function refreshWelcomeMessage(channel, guildId, claimed) {
  const details = getTicketDetails(guildId, channel.id);
  if (!details?.welcomeMessageId) return;
  const msg = await channel.messages.fetch(details.welcomeMessageId).catch(() => null);
  if (!msg) return;
  await msg.edit({ components: [ticketControlButtons({ claimed })] }).catch(() => {});
}

async function openTicket(interaction) {
  const cfg = getGuildConfig(interaction.guild.id);

  if (!cfg.ticketCategoryId) {
    return interaction.reply({
      embeds: [errorEmbed('A categoria de tickets ainda não foi configurada.')],
      ephemeral: true,
    });
  }

  if (userHasOpenTicket(interaction.guild.id, interaction.user.id)) {
    const existingId = findTicketChannelByUser(interaction.guild.id, interaction.user.id);
    return interaction.reply({
      embeds: [errorEmbed(`Já tens um ticket aberto: <#${existingId}>`)],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const num = nextTicketNumber(interaction.guild.id);
  const channelName = `ticket-${num}-${interaction.user.username}`.slice(0, 100).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const panelName = cfg.tickets?.panelTitle || config.tickets.titulo;

  const overwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  for (const roleId of cfg.supportRoleIds || []) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: cfg.ticketCategoryId,
    permissionOverwrites: overwrites,
    topic: `failuerc-ticket:${interaction.user.id}`,
  });

  setOpenTicket(interaction.guild.id, channel.id, interaction.user.id);

  const mentions = [interaction.user.toString(), supportMentions(cfg)].filter(Boolean).join(' ');
  const welcome = await channel.send({
    content: mentions,
    embeds: [new EmbedBuilder(ticketOpened(interaction.user.toString(), cfg))],
    components: [ticketControlButtons({ claimed: false })],
  });

  await welcome.pin().catch(() => {});

  setTicketDetails(interaction.guild.id, channel.id, {
    ownerId: interaction.user.id,
    openedAt: new Date().toISOString(),
    panelName,
    welcomeMessageId: welcome.id,
    claimedBy: null,
    ticketNumber: num,
    claimReminderSent: false,
  });

  await interaction.editReply({
    embeds: [successEmbed('Ticket criado', `O teu ticket foi aberto: ${channel}`)],
  });
}

async function claimTicket(interaction) {
  const cfg = getGuildConfig(interaction.guild.id);
  if (!isTicketChannel(interaction.channel)) {
    return interaction.reply({ embeds: [errorEmbed('Este canal não é um ticket.')], ephemeral: true });
  }

  if (!isModerator(interaction.member, cfg.supportRoleIds)) {
    return interaction.reply({ embeds: [errorEmbed('Só a equipa de suporte pode assumir tickets.')], ephemeral: true });
  }

  const details = getTicketDetails(interaction.guild.id, interaction.channel.id);
  if (details?.claimedBy) {
    return interaction.reply({ embeds: [errorEmbed('Este ticket já foi assumido.')], ephemeral: true });
  }

  updateTicketDetails(interaction.guild.id, interaction.channel.id, { claimedBy: interaction.user.id });
  await refreshWelcomeMessage(interaction.channel, interaction.guild.id, true);

  await interaction.channel.send(`${interaction.user} assumiu este ticket.`);

  return interaction.reply({
    embeds: [new EmbedBuilder(ticketClaimSuccess())],
    ephemeral: true,
  });
}

function getTicketVerifyStaffRoleId(cfg) {
  return cfg.tickets?.verificarStaffRoleId || config.tickets.verificarStaffRoleId;
}

function canVerifyTicket(interaction, cfg, ownerId) {
  const staffRoleId = getTicketVerifyStaffRoleId(cfg);
  if (!staffRoleId) return false;
  if (interaction.user.id === ownerId) return false;
  return hasRole(interaction.member, staffRoleId);
}

async function verifyTicketMember(interaction) {
  if (!isTicketChannel(interaction.channel)) {
    return interaction.reply({ embeds: [errorEmbed('Este canal não é um ticket.')], ephemeral: true });
  }

  const cfg = getGuildConfig(interaction.guild.id);
  const ownerId = parseTicketOwnerId(interaction.channel.topic || '')
    || getTicketDetails(interaction.guild.id, interaction.channel.id)?.ownerId;

  if (!ownerId) {
    return interaction.reply({ embeds: [errorEmbed('Não foi possível identificar o dono do ticket.')], ephemeral: true });
  }

  if (interaction.user.id === ownerId) {
    return interaction.reply({
      embeds: [errorEmbed('Não podes verificar-te a ti própria/o. A staff tem de clicar em Verificar.')],
      ephemeral: true,
    });
  }

  if (!canVerifyTicket(interaction, cfg, ownerId)) {
    return interaction.reply({
      embeds: [errorEmbed('Só a staff pode verificar membros neste ticket.')],
      ephemeral: true,
    });
  }

  const verifyRoleId = cfg.verifiedRoleId || cfg.tickets?.verificarRoleId || config.tickets.verificarRoleId;
  const details = getTicketDetails(interaction.guild.id, interaction.channel.id);
  const claimerId = details?.claimedBy || interaction.user.id;
  const claimer = await interaction.guild.members.fetch(claimerId).catch(() => interaction.member);

  await interaction.deferReply({ ephemeral: true });

  const result = await verifyMember(interaction.client, interaction.guild.id, ownerId, {
    skipAltCheck: true,
    source: 'manual',
    moderator: interaction.user,
    claimer,
    roleIdOverride: verifyRoleId,
  });

  if (!result.ok) {
    return interaction.editReply({ embeds: [errorEmbed(result.error || 'Não foi possível verificar.')] });
  }

  const owner = await interaction.guild.members.fetch(ownerId).catch(() => null);
  const mention = owner?.toString() || `<@${ownerId}>`;

  if (result.already) {
    return interaction.editReply({
      embeds: [successEmbed('Já verificada/o', `${mention} já tinha o cargo de verificado.`)],
    });
  }

  await interaction.channel.send({
    embeds: [successEmbed('Verificado', `${mention} foi verificado(a) por ${interaction.user}.`)],
  });

  return interaction.editReply({
    embeds: [successEmbed('Verificado com sucesso', `Atribuíste o cargo de verificado a ${mention}.`)],
  });
}

async function unclaimTicket(interaction) {
  const cfg = getGuildConfig(interaction.guild.id);
  if (!isTicketChannel(interaction.channel)) {
    return interaction.reply({ embeds: [errorEmbed('Este canal não é um ticket.')], ephemeral: true });
  }

  const details = getTicketDetails(interaction.guild.id, interaction.channel.id);
  if (!details?.claimedBy) {
    return interaction.reply({ embeds: [errorEmbed('Ninguém assumiu este ticket.')], ephemeral: true });
  }

  const canUnclaim = details.claimedBy === interaction.user.id
    || isModerator(interaction.member, cfg.supportRoleIds);

  if (!canUnclaim) {
    return interaction.reply({ embeds: [errorEmbed('Não podes libertar este ticket.')], ephemeral: true });
  }

  updateTicketDetails(interaction.guild.id, interaction.channel.id, { claimedBy: null });
  await refreshWelcomeMessage(interaction.channel, interaction.guild.id, false);

  return interaction.reply({
    embeds: [successEmbed('Ticket libertado', 'O ticket está novamente disponível para a equipa.')],
    ephemeral: true,
  });
}

function showCloseTicketModal(interaction) {
  const cfg = getGuildConfig(interaction.guild.id);
  const ownerId = parseTicketOwnerId(interaction.channel.topic || '');

  if (!isTicketChannel(interaction.channel)) {
    return interaction.reply({ embeds: [errorEmbed('Este canal não é um ticket.')], ephemeral: true });
  }

  if (!canManageTicket(interaction.member, cfg, ownerId)) {
    return interaction.reply({ embeds: [errorEmbed('Não tens permissão para fechar este ticket.')], ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.TICKET_CLOSE_MODAL)
    .setTitle('Fechar ticket')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('close_reason')
          .setLabel('Motivo do fecho')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
          .setPlaceholder('Ex: Problema resolvido.'),
      ),
    );

  return interaction.showModal(modal);
}

async function sendTicketClosedDm(client, guild, ownerId, details, closedByUser, closeReason, channelName) {
  if (!ownerId) return;

  const user = await client.users.fetch(ownerId).catch(() => null);
  if (!user) return;

  const openedAt = details?.openedAt ? new Date(details.openedAt) : new Date();
  const embed = ticketClosedDm(guild.name, {
    openDate: formatTicketDate(openedAt),
    panelName: details?.panelName || config.tickets.titulo,
    ticketName: channelName || 'ticket',
    closedBy: closedByUser.toString(),
    closeDate: formatTicketDate(new Date()),
    closeReason: closeReason || config.tickets.fechadoMotivoPadrao,
  });

  await user.send({ embeds: [new EmbedBuilder(embed)] }).catch((err) => {
    console.error('[ticket-dm]', ownerId, err.message);
  });
}

async function closeTicketWithReason(interaction, closeReason) {
  const cfg = getGuildConfig(interaction.guild.id);
  const channel = interaction.channel;
  const ownerId = parseTicketOwnerId(channel.topic || '');
  const details = getTicketDetails(interaction.guild.id, channel.id) || {};

  if (!canManageTicket(interaction.member, cfg, ownerId)) {
    return interaction.reply({ embeds: [errorEmbed('Não tens permissão para fechar este ticket.')], ephemeral: true });
  }

  await interaction.reply({
    embeds: [successEmbed('Ticket fechado', 'A enviar resumo ao utilizador e a fechar o canal…')],
  });

  const reason = closeReason?.trim() || config.tickets.fechadoMotivoPadrao;

  await sendTicketClosedDm(
    interaction.client,
    interaction.guild,
    ownerId,
    details,
    interaction.user,
    reason,
    channel.name,
  );

  removeOpenTicket(interaction.guild.id, channel.id);
  removeTicketDetails(interaction.guild.id, channel.id);

  setTimeout(() => channel.delete('Ticket fechado Failuerc').catch(() => {}), 5000);
}

async function handleTicketCloseModal(interaction) {
  if (interaction.customId !== CUSTOM_IDS.TICKET_CLOSE_MODAL) return false;

  const reason = interaction.fields.getTextInputValue('close_reason');
  await closeTicketWithReason(interaction, reason);
  return true;
}

module.exports = {
  openTicket,
  claimTicket,
  verifyTicketMember,
  unclaimTicket,
  showCloseTicketModal,
  closeTicketWithReason,
  handleTicketCloseModal,
  isTicketChannel,
  parseTicketOwnerId,
};
