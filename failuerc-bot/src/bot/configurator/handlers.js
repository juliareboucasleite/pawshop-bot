const { isAdmin } = require('../../utils/permissions');
const { getGuildConfig, setGuildConfig, updateGuildConfig } = require('../../utils/store');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const {
  publishTicketPanel: publishTicketPanelToChannel,
  publishVerificationPanel: publishVerificationPanelToChannel,
} = require('../../services/panelPublish');
const { renderView } = require('./views');
const IDS = require('./ids');

function isConfiguratorInteraction(interaction) {
  const id = interaction.customId;
  return id === IDS.NAV
    || id === IDS.EXIT
    || id.startsWith(`${IDS.BACK}:`)
    || id.startsWith('failuerc:cfg:');
}

async function publishTicketPanel(interaction) {
  const result = await publishTicketPanelToChannel(
    interaction.client,
    interaction.guild.id,
    interaction.channel.id,
  );
  if (!result.ok) {
    return interaction.reply({ embeds: [errorEmbed(result.error)], ephemeral: true });
  }
  return interaction.reply({
    embeds: [successEmbed('Painel publicado', `Tickets ativos: ${result.url}`)],
    ephemeral: true,
  });
}

async function publishVerificationPanel(interaction) {
  const result = await publishVerificationPanelToChannel(
    interaction.client,
    interaction.guild.id,
    interaction.channel.id,
  );
  if (!result.ok) {
    return interaction.reply({ embeds: [errorEmbed(result.error)], ephemeral: true });
  }
  return interaction.reply({
    embeds: [successEmbed('Painel de verificação publicado', result.url)],
    ephemeral: true,
  });
}

async function handleConfigurator(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')], ephemeral: true });
  }

  const guildId = interaction.guild.id;

  if (interaction.isStringSelectMenu() && interaction.customId === IDS.NAV) {
    const map = { main: 'main', tickets: 'tickets', verification: 'verification' };
    return interaction.update(renderView(map[interaction.values[0]] || 'main', guildId));
  }

  if (interaction.isChannelSelectMenu()) {
    if (interaction.customId === IDS.SELECT_TICKET_CATEGORY) {
      setGuildConfig(guildId, { ticketCategoryId: interaction.values[0] });
      return interaction.update(renderView('tickets-settings', guildId));
    }
    if (interaction.customId === IDS.SELECT_VERIFY_LOG) {
      const logId = interaction.values[0] || null;
      updateGuildConfig(guildId, (cfg) => ({
        ...cfg,
        verification: { ...cfg.verification, logChannelId: logId },
      }));
      return interaction.update(renderView('verification-general', guildId));
    }
  }

  if (interaction.isRoleSelectMenu()) {
    if (interaction.customId === IDS.SELECT_SUPPORT_ROLES) {
      setGuildConfig(guildId, { supportRoleIds: interaction.values });
      return interaction.update(renderView('tickets-settings', guildId));
    }
    if (interaction.customId === IDS.SELECT_VERIFIED_ROLE) {
      setGuildConfig(guildId, { verifiedRoleId: interaction.values[0] });
      return interaction.update(renderView('verification-roles', guildId));
    }
  }

  if (!interaction.isButton()) return;

  const id = interaction.customId;

  if (id === IDS.EXIT) {
    return interaction.update({ content: 'Configurator fechado.', embeds: [], components: [] });
  }

  if (id.startsWith(`${IDS.BACK}:`)) {
    const target = id.split(':').pop();
    const map = { main: 'main', tickets: 'tickets', verification: 'verification' };
    return interaction.update(renderView(map[target] || 'main', guildId));
  }

  if (id === IDS.TICKETS_SETTINGS) return interaction.update(renderView('tickets-settings', guildId));
  if (id === IDS.TICKETS_PANELS) return interaction.update(renderView('tickets-panels', guildId));
  if (id === IDS.TICKETS_PUBLISH) return publishTicketPanel(interaction);
  if (id === IDS.TICKETS_CREATE) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    const modal = new ModalBuilder()
      .setCustomId(IDS.MODAL_TICKET_PANEL)
      .setTitle('Personalizar painel de tickets');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('panel_title')
          .setLabel('Título do painel')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(100),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('panel_description')
          .setLabel('Descrição do painel')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('welcome_title')
          .setLabel('Título ao abrir ticket')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(100),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('welcome_description')
          .setLabel('Mensagem ao abrir ticket')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500),
      ),
    );
    return interaction.showModal(modal);
  }

  if (id === IDS.VERIFY_GENERAL) return interaction.update(renderView('verification-general', guildId));
  if (id === IDS.VERIFY_ROLES) return interaction.update(renderView('verification-roles', guildId));
  if (id === IDS.VERIFY_PUBLISH) return publishVerificationPanel(interaction);

  if (id === IDS.VERIFY_TOGGLE) {
    const cfg = getGuildConfig(guildId);
    const next = cfg.verification?.enabled === false;
    updateGuildConfig(guildId, (c) => ({
      ...c,
      verification: { ...c.verification, enabled: next },
    }));
    return interaction.update(renderView('verification-general', guildId));
  }
}

async function handleConfiguratorModal(interaction) {
  if (interaction.customId !== IDS.MODAL_TICKET_PANEL) return false;
  if (!isAdmin(interaction.member)) {
    await interaction.reply({ embeds: [errorEmbed('Sem permissão.')], ephemeral: true });
    return true;
  }

  const cfg = getGuildConfig(interaction.guild.id);
  setGuildConfig(interaction.guild.id, {
    tickets: {
      ...cfg.tickets,
      panelTitle: interaction.fields.getTextInputValue('panel_title').trim() || null,
      panelDescription: interaction.fields.getTextInputValue('panel_description').trim() || null,
      welcomeTitle: interaction.fields.getTextInputValue('welcome_title').trim() || null,
      welcomeDescription: interaction.fields.getTextInputValue('welcome_description').trim() || null,
    },
  });

  await interaction.reply({
    embeds: [successEmbed('Mensagens guardadas', 'Publica o painel em Gerir Painéis.')],
    ephemeral: true,
  });
  return true;
}

module.exports = {
  isConfiguratorInteraction,
  handleConfigurator,
  handleConfiguratorModal,
  renderView,
};
