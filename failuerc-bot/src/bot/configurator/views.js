const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const config = require('../../../config/default.json');
const { getGuildConfig } = require('../../utils/store');
const { COR } = require('../../utils/embeds');
const IDS = require('./ids');

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://reboucas.me';
const BASE = (process.env.BASE_PATH || '/failuerc').replace(/\/$/, '');

function baseEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COR)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: `${config.bot.nome} Configurator` })
    .setTimestamp();
}

function navSelect(active) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(IDS.NAV)
      .setPlaceholder('Seleciona uma secção')
      .addOptions([
        {
          label: 'Principal',
          description: 'Página inicial do configurador',
          value: 'main',
          default: active === 'main',
        },
        {
          label: 'Tickets',
          description: 'Configuração de tickets de suporte',
          value: 'tickets',
          default: active === 'tickets',
        },
        {
          label: 'Verificação',
          description: 'Verificação OAuth pelo site',
          value: 'verification',
          default: active === 'verification',
        },
      ]),
  );
}

function backExitRow(backTarget = 'main') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${IDS.BACK}:${backTarget}`)
      .setLabel('Voltar')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.EXIT)
      .setLabel('Sair')
      .setStyle(ButtonStyle.Danger),
  );
}

function mainView() {
  const embed = baseEmbed(
    `${config.bot.nome} Configurator`,
    [
      `Bem-vindo ao configurador do **${config.bot.nome}**.`,
      'Personaliza tickets e verificação diretamente aqui, sem precisares do site para estas opções.',
      '',
      `**Prefixo:** \`${config.bot.prefix}\` · **Slash:** \`/configurator\``,
    ].join('\n'),
  );

  const links = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Painel Web')
      .setStyle(ButtonStyle.Link)
      .setURL(`${PUBLIC_URL}${BASE}/painel`),
    new ButtonBuilder()
      .setLabel('Servidor Discord')
      .setStyle(ButtonStyle.Link)
      .setURL(config.site.discordInvite || 'https://discord.gg/5wCmFDptkD'),
    new ButtonBuilder()
      .setLabel('Wiki')
      .setStyle(ButtonStyle.Link)
      .setURL(`${PUBLIC_URL}${BASE}/wiki`),
  );

  return {
    embeds: [embed],
    components: [links, navSelect('main')],
  };
}

function ticketsHomeView(guildId) {
  const cfg = getGuildConfig(guildId);
  const embed = baseEmbed(
    'Ticket Settings',
    'Usa os botões abaixo para editar as definições de tickets do teu servidor.',
  ).addFields(
    {
      name: 'Estado',
      value: cfg.ticketCategoryId ? 'Configurado' : 'Por configurar',
      inline: true,
    },
    {
      name: 'Painel',
      value: cfg.tickets?.messageId ? `<#${cfg.tickets.channelId}>` : 'Não publicado',
      inline: true,
    },
  );

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.TICKETS_SETTINGS)
      .setLabel('Definições de Tickets')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.TICKETS_PANELS)
      .setLabel('Gerir Painéis')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds: [embed],
    components: [actions, navSelect('tickets'), backExitRow('main')],
  };
}

function ticketsSettingsView(guildId) {
  const cfg = getGuildConfig(guildId);
  const embed = baseEmbed(
    'Tickets | Definições',
    [
      'Define a categoria onde os tickets são criados e os cargos de suporte.',
      '',
      `**Categoria:** ${cfg.ticketCategoryId ? `<#${cfg.ticketCategoryId}>` : '—'}`,
      `**Suporte:** ${cfg.supportRoleIds?.length ? cfg.supportRoleIds.map((id) => `<@&${id}>`).join(', ') : '—'}`,
    ].join('\n'),
  );

  const categoryRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(IDS.SELECT_TICKET_CATEGORY)
      .setPlaceholder('Seleciona a categoria de tickets')
      .addChannelTypes(ChannelType.GuildCategory)
      .setMaxValues(1)
      .setMinValues(1),
  );

  const rolesRow = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(IDS.SELECT_SUPPORT_ROLES)
      .setPlaceholder('Cargos de suporte (opcional)')
      .setMinValues(0)
      .setMaxValues(5),
  );

  return {
    embeds: [embed],
    components: [categoryRow, rolesRow, navSelect('tickets'), backExitRow('tickets')],
  };
}

function ticketsPanelsView(guildId) {
  const cfg = getGuildConfig(guildId);
  const embed = baseEmbed(
    'Ticket Panels',
    'Cria e gere painéis para os membros abrirem tickets.',
  ).addFields(
    {
      name: 'Painel ativo',
      value: cfg.tickets?.messageId
        ? `[Abrir painel](https://discord.com/channels/${guildId}/${cfg.tickets.channelId}/${cfg.tickets.messageId})`
        : 'Nenhum painel publicado',
    },
    {
      name: 'Categoria',
      value: cfg.ticketCategoryId ? `<#${cfg.ticketCategoryId}>` : 'Configura em Definições de Tickets',
    },
  );

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.TICKETS_PUBLISH)
      .setLabel('Publicar painel aqui')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!cfg.ticketCategoryId),
    new ButtonBuilder()
      .setCustomId(IDS.TICKETS_CREATE)
      .setLabel('Personalizar mensagens')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds: [embed],
    components: [actions, navSelect('tickets'), backExitRow('tickets')],
  };
}

function verificationHomeView(guildId) {
  const cfg = getGuildConfig(guildId);
  const enabled = cfg.verification?.enabled !== false;
  const embed = baseEmbed(
    'Verification Settings',
    'Configura a verificação OAuth para proteger o teu servidor.',
  ).addFields(
    { name: 'Sistema', value: enabled ? 'Ativo' : 'Desativado', inline: true },
    { name: 'Método', value: 'Verificação Web', inline: true },
    {
      name: 'Cargo',
      value: cfg.verifiedRoleId ? `<@&${cfg.verifiedRoleId}>` : '—',
      inline: true,
    },
  );

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.VERIFY_GENERAL)
      .setLabel('Definições Gerais')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.VERIFY_ROLES)
      .setLabel('Cargos')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.VERIFY_PUBLISH)
      .setLabel('Publicar painel')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!cfg.verifiedRoleId),
  );

  return {
    embeds: [embed],
    components: [actions, navSelect('verification'), backExitRow('main')],
  };
}

function verificationGeneralView(guildId) {
  const cfg = getGuildConfig(guildId);
  const enabled = cfg.verification?.enabled !== false;
  const embed = baseEmbed(
    'Verificação | Definições Gerais',
    [
      'Configura o comportamento da verificação OAuth pelo site.',
      '',
      `**Sistema:** ${enabled ? 'Ativo' : 'Desativado'}`,
      '**Método:** Verificação Web',
      `**Canal de logs:** ${cfg.verification?.logChannelId ? `<#${cfg.verification.logChannelId}>` : '—'}`,
    ].join('\n'),
  );

  const toggle = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.VERIFY_TOGGLE)
      .setLabel(enabled ? 'Desativar verificação' : 'Ativar verificação')
      .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
  );

  const logRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(IDS.SELECT_VERIFY_LOG)
      .setPlaceholder('Canal de logs (opcional)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setMinValues(0)
      .setMaxValues(1),
  );

  return {
    embeds: [embed],
    components: [toggle, logRow, navSelect('verification'), backExitRow('verification')],
  };
}

function verificationRolesView(guildId) {
  const cfg = getGuildConfig(guildId);
  const embed = baseEmbed(
    'Verificação | Cargos',
    [
      'Define o cargo atribuído após o membro verificar no site.',
      '',
      `**Cargo verificado:** ${cfg.verifiedRoleId ? `<@&${cfg.verifiedRoleId}>` : '— não definido —'}`,
    ].join('\n'),
  );

  const roleRow = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(IDS.SELECT_VERIFIED_ROLE)
      .setPlaceholder('Seleciona o cargo de verificado')
      .setMinValues(1)
      .setMaxValues(1),
  );

  return {
    embeds: [embed],
    components: [roleRow, navSelect('verification'), backExitRow('verification')],
  };
}

const VIEWS = {
  main: mainView,
  tickets: ticketsHomeView,
  'tickets-settings': ticketsSettingsView,
  'tickets-panels': ticketsPanelsView,
  verification: verificationHomeView,
  'verification-general': verificationGeneralView,
  'verification-roles': verificationRolesView,
};

function renderView(viewId, guildId) {
  const fn = VIEWS[viewId] || mainView;
  return fn(guildId);
}

module.exports = { renderView, IDS };
