const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config/default.json');

const CUSTOM_IDS = {
  VERIFY_BUTTON: 'failuerc:verify',
  VERIFY_TICKET_OPEN: 'failuerc:verify-ticket-open',
  TICKET_OPEN: 'failuerc:ticket-open',
  TICKET_CLOSE: 'failuerc:ticket-close',
  TICKET_CLAIM: 'failuerc:ticket-claim',
  TICKET_UNCLAIM: 'failuerc:ticket-unclaim',
  TICKET_VERIFY: 'failuerc:ticket-verify',
  TICKET_CLOSE_MODAL: 'failuerc:ticket-close-modal',
  SUGGEST_OPEN: 'failuerc:suggest-open',
  SUGGEST_MODAL: 'failuerc:suggest-modal',
  CONFESS_OPEN: 'failuerc:confess-open',
  CONFESS_MODAL: 'failuerc:confess-modal',
  FAQ_SELECT: 'failuerc:faq',
  GIVEAWAY_JOIN: 'failuerc:giveaway:join',
};

function confessOpenId(guildId) {
  return `${CUSTOM_IDS.CONFESS_OPEN}:${guildId}`;
}

function confessModalId(guildId) {
  return `${CUSTOM_IDS.CONFESS_MODAL}:${guildId}`;
}

function parseConfessOpenId(customId) {
  const match = customId.match(/^failuerc:confess-open:(\d+)$/);
  return match ? match[1] : null;
}

function parseConfessModalId(customId) {
  const match = customId.match(/^failuerc:confess-modal:(\d+)$/);
  return match ? match[1] : null;
}

function communityButtonId(type, mode) {
  return `failuerc:community:${type}:${mode}`;
}

function communityModalId(type, mode) {
  return `failuerc:community:modal:${type}:${mode}`;
}

function parseCommunityButtonId(customId) {
  const match = customId.match(/^failuerc:community:([^:]+):(anon|public)$/);
  if (!match) return null;
  return { type: match[1], mode: match[2] };
}

function parseCommunityModalId(customId) {
  const match = customId.match(/^failuerc:community:modal:([^:]+):(anon|public)$/);
  if (!match) return null;
  return { type: match[1], mode: match[2] };
}

function suggestVoteId(direction, messageId) {
  return `failuerc:suggest:${direction}:${messageId}`;
}

function suggestDiscussId(messageId) {
  return `failuerc:suggest:discuss:${messageId}`;
}

function parseSuggestActionId(customId) {
  const vote = customId.match(/^failuerc:suggest:(up|down):(\d+)$/);
  if (vote) return { action: vote[1], messageId: vote[2] };
  const discuss = customId.match(/^failuerc:suggest:discuss:(\d+)$/);
  if (discuss) return { action: 'discuss', messageId: discuss[1] };
  return null;
}

function faqSelectId(guildId) {
  return `${CUSTOM_IDS.FAQ_SELECT}:${guildId}`;
}

function parseFaqSelectId(customId) {
  const match = customId.match(/^failuerc:faq:(\d+)$/);
  return match ? match[1] : null;
}

function giveawayJoinId(guildId, giveawayId) {
  return `${CUSTOM_IDS.GIVEAWAY_JOIN}:${guildId}:${giveawayId}`;
}

function parseGiveawayJoinId(customId) {
  const match = customId.match(/^failuerc:giveaway:join:(\d+):(\d+)$/);
  if (!match) return null;
  return { guildId: match[1], giveawayId: match[2] };
}

function giveawayJoinButton(guildId, giveawayId, entrants = 0) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(giveawayJoinId(guildId, giveawayId))
      .setLabel(`Participar 🎉 (${entrants})`)
      .setStyle(ButtonStyle.Secondary),
  );
}

function faqSelectRow(guildId, panel) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(faqSelectId(guildId))
    .setPlaceholder(panel.selectPlaceholder || 'Seleciona um tópico…')
    .addOptions(
      panel.topics.map((topic) => ({
        label: topic.label.slice(0, 100),
        value: topic.id,
        emoji: topic.emoji || undefined,
        description: (topic.description || topic.label).slice(0, 100),
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function verifyPanelButtons(verifyUrl) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(config.verificacao.botao)
      .setStyle(ButtonStyle.Link)
      .setURL(verifyUrl),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.VERIFY_TICKET_OPEN)
      .setLabel(config.verificacao.ticketBotao || 'Verificação manual')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary),
  );
}

function verifyButton(verifyUrl) {
  return verifyPanelButtons(verifyUrl);
}

function ticketOpenButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.TICKET_OPEN)
      .setLabel(config.tickets.botao)
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Secondary),
  );
}

function ticketCloseButton() {
  return ticketControlButtons({ claimed: false });
}

function ticketControlButtons({ claimed = false } = {}) {
  const t = config.tickets;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.TICKET_CLOSE)
      .setLabel(t.fecharBotao || 'Fechar')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(claimed ? CUSTOM_IDS.TICKET_UNCLAIM : CUSTOM_IDS.TICKET_CLAIM)
      .setLabel(claimed ? (t.unclaimBotao || 'Libertar') : (t.claimBotao || 'Assumir'))
      .setEmoji('🙌')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.TICKET_VERIFY)
      .setLabel(t.verificarBotao || 'Verificar')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Secondary),
  );
}

function reactionKey(reaction) {
  if (reaction.emoji.id) return reaction.emoji.id;
  return reaction.emoji.name;
}

function parseReactionInput(input) {
  const trimmed = input.trim();
  const custom = trimmed.match(/^<a?:(\w+):(\d+)>$/);
  if (custom) return { id: custom[2], name: custom[1], animated: trimmed.startsWith('<a:') };
  const colon = trimmed.match(/^:([\w]+):$/);
  if (colon) return { name: colon[1] };
  return { name: trimmed };
}

function suggestPanelButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.SUGGEST_OPEN)
      .setLabel('✿ dar uma ideia fofa')
      .setStyle(ButtonStyle.Secondary),
  );
}

function suggestVoteButtons(messageId, { upvotes = 0, downvotes = 0 } = {}) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(suggestVoteId('up', messageId))
      .setLabel(`♡ ${upvotes}`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(suggestVoteId('down', messageId))
      .setLabel(`✗ ${downvotes}`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(suggestDiscussId(messageId))
      .setLabel('✩ conversar')
      .setStyle(ButtonStyle.Secondary),
  );
}

function confessOpenButton(guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confessOpenId(guildId))
      .setLabel('Confessa os teus segredos...')
      .setEmoji('🤫')
      .setStyle(ButtonStyle.Secondary),
  );
}

function communityModeButtons(type) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(communityButtonId(type, 'anon'))
      .setLabel('Anónimo')
      .setEmoji('🕶️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(communityButtonId(type, 'public'))
      .setLabel('Mostrar nick')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Secondary),
  );
}

module.exports = {
  CUSTOM_IDS,
  verifyButton,
  verifyPanelButtons,
  ticketOpenButton,
  ticketCloseButton,
  ticketControlButtons,
  suggestPanelButton,
  suggestVoteButtons,
  communityModeButtons,
  communityButtonId,
  communityModalId,
  parseCommunityButtonId,
  parseCommunityModalId,
  suggestVoteId,
  suggestDiscussId,
  parseSuggestActionId,
  confessOpenButton,
  confessOpenId,
  confessModalId,
  parseConfessOpenId,
  parseConfessModalId,
  faqSelectRow,
  faqSelectId,
  parseFaqSelectId,
  giveawayJoinButton,
  giveawayJoinId,
  parseGiveawayJoinId,
  reactionKey,
  parseReactionInput,
  emojiKey: reactionKey,
  parseEmojiInput: parseReactionInput,
};
