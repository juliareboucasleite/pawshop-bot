const {
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/store');
const {
  CUSTOM_IDS,
  suggestPanelButton,
  suggestVoteButtons,
  parseSuggestActionId,
} = require('../utils/components');
const {
  suggestionPanelEmbed,
  suggestionPostEmbed,
  successEmbed,
  errorEmbed,
} = require('../utils/embeds');

function nextSuggestionId(guildId) {
  let id = 0;
  updateGuildConfig(guildId, (cfg) => {
    id = (cfg.suggestions?.counter || 0) + 1;
    return {
      ...cfg,
      suggestions: {
        ...cfg.suggestions,
        counter: id,
      },
    };
  });
  return id;
}

function saveSuggestionPost(guildId, messageId, data) {
  updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    suggestions: {
      ...cfg.suggestions,
      posts: {
        ...(cfg.suggestions?.posts || {}),
        [messageId]: data,
      },
    },
  }));
}

function getSuggestionPost(guildId, messageId) {
  const cfg = getGuildConfig(guildId);
  return cfg.suggestions?.posts?.[messageId] || null;
}

function updateSuggestionPost(guildId, messageId, patch) {
  updateGuildConfig(guildId, (cfg) => {
    const current = cfg.suggestions?.posts?.[messageId];
    if (!current) return cfg;
    return {
      ...cfg,
      suggestions: {
        ...cfg.suggestions,
        posts: {
          ...cfg.suggestions.posts,
          [messageId]: { ...current, ...patch },
        },
      },
    };
  });
}

async function publishSuggestionPanel(channel) {
  const embed = new EmbedBuilder(suggestionPanelEmbed());
  const msg = await channel.send({
    embeds: [embed],
    components: [suggestPanelButton()],
  });

  updateGuildConfig(channel.guild.id, (cfg) => ({
    ...cfg,
    suggestions: {
      ...cfg.suggestions,
      channelId: channel.id,
      panelMessageId: msg.id,
    },
  }));

  return msg;
}

function showSuggestionModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.SUGGEST_MODAL)
    .setTitle('✿ a tua ideia fofa ✿')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('title')
          .setLabel('✎ um titulozinho')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
          .setPlaceholder('ex: um cantinho pra partilhar arte ♡'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('description')
          .setLabel('⊰ conta tudo direitinho')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1500)
          .setPlaceholder('descreve a tua ideia: o que seria, como funcionaria... ✦'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('platform')
          .setLabel('✩ é pro server, bot ou ambos?')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50)
          .setPlaceholder('servidor, bot ou ambos'),
      ),
    );

  return interaction.showModal(modal);
}

async function handleSuggestionModal(interaction) {
  if (interaction.customId !== CUSTOM_IDS.SUGGEST_MODAL) return false;

  const cfg = getGuildConfig(interaction.guild.id);
  const channelId = cfg.suggestions?.channelId || interaction.channelId;
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

  if (!channel?.isTextBased()) {
    await interaction.reply({
      embeds: [errorEmbed('Canal de sugestões inválido ou inacessível.')],
      ephemeral: true,
    });
    return true;
  }

  const title = interaction.fields.getTextInputValue('title').trim();
  const description = interaction.fields.getTextInputValue('description').trim();
  const platform = interaction.fields.getTextInputValue('platform').trim();
  const suggestionId = nextSuggestionId(interaction.guild.id);

  const embedData = suggestionPostEmbed({
    author: interaction.member.displayName,
    platform,
    title,
    description,
    upvotes: 0,
    downvotes: 0,
    suggestionId,
  });

  const msg = await channel.send({
    embeds: [new EmbedBuilder(embedData)],
  });

  saveSuggestionPost(interaction.guild.id, msg.id, {
    suggestionId,
    authorId: interaction.user.id,
    title,
    description,
    platform,
    upvotes: 0,
    downvotes: 0,
    voters: {},
    threadId: null,
  });

  const finalEmbed = suggestionPostEmbed({
    author: interaction.member.displayName,
    platform,
    title,
    description,
    upvotes: 0,
    downvotes: 0,
    suggestionId,
  });

  await msg.edit({
    embeds: [new EmbedBuilder(finalEmbed)],
    components: [suggestVoteButtons(msg.id, { upvotes: 0, downvotes: 0 })],
  });

  await interaction.reply({
    embeds: [successEmbed(
      '✿ ideia enviadinha ♡',
      [
        `⋆｡˚ obrigada por partilhar a tua ideia fofa! ˚｡⋆`,
        '',
        `✎ **${title}**`,
        `✩ plataforma : *${platform}*`,
        `♡ id : #${suggestionId}`,
        '',
        `já está publicada em ${channel} pra comunidade votar ⊰ ♡`,
      ].join('\n'),
    )],
    ephemeral: true,
  });

  return true;
}

async function refreshSuggestionMessage(interaction, messageId, post) {
  const embedData = suggestionPostEmbed({
    author: `<@${post.authorId}>`,
    platform: post.platform,
    title: post.title,
    description: post.description,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    suggestionId: post.suggestionId,
  });

  const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
  if (!msg) return;

  await msg.edit({
    embeds: [new EmbedBuilder(embedData)],
    components: [suggestVoteButtons(messageId, post)],
  });
}

async function handleSuggestionButton(interaction) {
  if (interaction.customId === CUSTOM_IDS.SUGGEST_OPEN) {
    await showSuggestionModal(interaction);
    return true;
  }

  const parsed = parseSuggestActionId(interaction.customId);
  if (!parsed) return false;

  const post = getSuggestionPost(interaction.guild.id, parsed.messageId);
  if (!post) {
    await interaction.reply({
      embeds: [errorEmbed('Esta sugestão já não está registada.')],
      ephemeral: true,
    });
    return true;
  }

  if (parsed.action === 'discuss') {
    if (post.threadId) {
      const existing = await interaction.guild.channels.fetch(post.threadId).catch(() => null);
      if (existing && !existing.archived) {
        await interaction.reply({
          embeds: [successEmbed('Discussão existente', `Continua em ${existing.url}`)],
          ephemeral: true,
        });
        return true;
      }
    }

    const parentMsg = await interaction.channel.messages.fetch(parsed.messageId).catch(() => null);
    if (!parentMsg) {
      await interaction.reply({
        embeds: [errorEmbed('Mensagem da sugestão não encontrada.')],
        ephemeral: true,
      });
      return true;
    }

    const threadName = `✿ ${post.title}`.slice(0, 100).replace(/[^a-zA-Z0-9-_ ✿♡]/g, ' ').trim() || `sugestao-${post.suggestionId}`;

    const thread = await parentMsg.startThread({
      name: threadName,
      type: ChannelType.PublicThread,
      autoArchiveDuration: 10080,
      reason: `Discussão da sugestão #${post.suggestionId}`,
    });

    updateSuggestionPost(interaction.guild.id, parsed.messageId, { threadId: thread.id });

    await thread.send({
      content: `✩ ｡ﾟ cantinho de conversa aberto por ${interaction.user} sobre a sugestão **#${post.suggestionId}** ♡ deixa aqui a tua opiniãozinha ⊰`,
    });

    await interaction.reply({
      embeds: [successEmbed('✩ cantinho aberto ♡', `vamos conversar em ${thread.url} ⊰ ♡`)],
      ephemeral: true,
    });
    return true;
  }

  const voters = { ...(post.voters || {}) };
  const previous = voters[interaction.user.id];
  let upvotes = post.upvotes || 0;
  let downvotes = post.downvotes || 0;

  if (parsed.action === 'up') {
    if (previous === 'up') {
      delete voters[interaction.user.id];
      upvotes = Math.max(0, upvotes - 1);
    } else {
      if (previous === 'down') downvotes = Math.max(0, downvotes - 1);
      voters[interaction.user.id] = 'up';
      upvotes += 1;
    }
  } else if (parsed.action === 'down') {
    if (previous === 'down') {
      delete voters[interaction.user.id];
      downvotes = Math.max(0, downvotes - 1);
    } else {
      if (previous === 'up') upvotes = Math.max(0, upvotes - 1);
      voters[interaction.user.id] = 'down';
      downvotes += 1;
    }
  }

  const updated = {
    ...post,
    upvotes,
    downvotes,
    voters,
  };

  updateSuggestionPost(interaction.guild.id, parsed.messageId, updated);
  await refreshSuggestionMessage(interaction, parsed.messageId, updated);

  await interaction.reply({
    embeds: [successEmbed('✿ votinho registado ♡', `♡ ${upvotes} ⠀⊹⠀ ✗ ${downvotes}`)],
    ephemeral: true,
  });

  return true;
}

module.exports = {
  publishSuggestionPanel,
  handleSuggestionModal,
  handleSuggestionButton,
};
