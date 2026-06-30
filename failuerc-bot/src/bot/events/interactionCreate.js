const { Events } = require('discord.js');
const { CUSTOM_IDS } = require('../../utils/components');
const {
  isConfiguratorInteraction,
  handleConfigurator,
  handleConfiguratorModal,
} = require('../configurator/handlers');
const { getGuildConfig } = require('../../utils/store');
const { errorEmbed } = require('../../utils/embeds');
const { isModerator } = require('../../utils/permissions');
const { isCommandChannelAllowed } = require('../../services/commandChannels');
const {
  openTicket,
  claimTicket,
  verifyTicketMember,
  unclaimTicket,
  showCloseTicketModal,
  handleTicketCloseModal,
} = require('../../services/tickets');
const { openVerificationTicket } = require('../../services/verification');
const {
  handleCommunityButton,
  handleCommunityModal,
  handleConfessOpenButton,
  handleConfessModal,
} = require('../../services/communityPosts');
const {
  handleSuggestionModal,
  handleSuggestionButton,
} = require('../../services/suggestions');
const { handleFaqSelect } = require('../../services/faqPanel');
const { handleGiveawayJoin } = require('../../services/giveaways');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isModalSubmit()) {
      if (await handleTicketCloseModal(interaction)) return;
      if (await handleConfiguratorModal(interaction)) return;
      if (await handleConfessModal(interaction)) return;
      if (await handleCommunityModal(interaction)) return;
      if (await handleSuggestionModal(interaction)) return;
    }

    if (
      (interaction.isButton() || interaction.isStringSelectMenu()
        || interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu())
      && isConfiguratorInteraction(interaction)
    ) {
      return handleConfigurator(interaction);
    }

    if (interaction.isChatInputCommand()) {
      if (
        interaction.guild
        && !isCommandChannelAllowed(interaction.guild.id, interaction.channelId)
      ) {
        const cfg = getGuildConfig(interaction.guild.id);
        if (!isModerator(interaction.member, cfg.supportRoleIds)) {
          const payload = {
            embeds: [errorEmbed('Slash commands não são permitidos neste canal.')],
            ephemeral: true,
          };
          if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
          else await interaction.reply(payload);
          return;
        }
      }

      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`[cmd] /${interaction.commandName}:`, err);
        const payload = { embeds: [errorEmbed('Ocorreu um erro ao executar o comando.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
        else await interaction.reply(payload);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('failuerc:faq:')) {
        if (await handleFaqSelect(interaction)) return;
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('failuerc:confess-open:')) {
        if (await handleConfessOpenButton(interaction)) return;
      }
      if (interaction.customId.startsWith('failuerc:community:') && !interaction.customId.includes(':modal:')) {
        if (await handleCommunityButton(interaction)) return;
      }
      if (
        interaction.customId === CUSTOM_IDS.SUGGEST_OPEN
        || interaction.customId.startsWith('failuerc:suggest:')
      ) {
        if (await handleSuggestionButton(interaction)) return;
      }
      if (interaction.customId.startsWith('failuerc:giveaway:join:')) {
        if (await handleGiveawayJoin(interaction)) return;
      }
      if (interaction.customId === CUSTOM_IDS.TICKET_OPEN) await openTicket(interaction);
      if (interaction.customId === CUSTOM_IDS.VERIFY_TICKET_OPEN) await openVerificationTicket(interaction);
      if (interaction.customId === CUSTOM_IDS.TICKET_CLOSE) await showCloseTicketModal(interaction);
      if (interaction.customId === CUSTOM_IDS.TICKET_CLAIM) await claimTicket(interaction);
      if (interaction.customId === CUSTOM_IDS.TICKET_VERIFY) await verifyTicketMember(interaction);
      if (interaction.customId === CUSTOM_IDS.TICKET_UNCLAIM) await unclaimTicket(interaction);
    }
  },
};
