const {
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { getGuildConfig, nextConfessionNumber } = require('../utils/store');
const {
  communityModeButtons,
  communityModalId,
  confessOpenButton,
  confessModalId,
  parseCommunityButtonId,
  parseCommunityModalId,
  parseConfessOpenId,
  parseConfessModalId,
} = require('../utils/components');
const {
  communityPostEmbed,
  anonymousConfessionEmbed,
  successEmbed,
  errorEmbed,
} = require('../utils/embeds');

const TYPE_META = {
  desabafo: {
    label: 'desabafo',
    channelKey: 'desabafoChannelId',
    promptTitle: 'Como queres publicar o desabafo?',
    modalTitle: 'Desabafo',
    placeholder: 'Desabafa aqui o que estiveres a sentir…',
  },
};

const pendingAuthors = new Map();
const PENDING_TTL_MS = 15 * 60 * 1000;

function pendingKey(userId, type) {
  return `${userId}:${type}`;
}

function setPending(userId, type, guildId) {
  pendingAuthors.set(pendingKey(userId, type), { guildId, at: Date.now() });
}

function getPending(userId, type) {
  const entry = pendingAuthors.get(pendingKey(userId, type));
  if (!entry) return null;
  if (Date.now() - entry.at > PENDING_TTL_MS) {
    pendingAuthors.delete(pendingKey(userId, type));
    return null;
  }
  return entry;
}

function clearPending(userId, type) {
  pendingAuthors.delete(pendingKey(userId, type));
}

function getConfessionChannelId(cfg) {
  return cfg.community?.confissaoChannelId || null;
}

function getTargetChannelId(cfg, type) {
  return cfg.community?.[TYPE_META[type].channelKey] || null;
}

function buildConfessModal(guildId) {
  return new ModalBuilder()
    .setCustomId(confessModalId(guildId))
    .setTitle('Confessa os teus segredos...')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('content')
          .setLabel('Confissão')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(2000)
          .setPlaceholder('Escreve a tua confissão aqui...'),
      ),
    );
}

async function notifyUser(message, embedData) {
  try {
    await message.author.send({ embeds: [new EmbedBuilder(embedData)] });
  } catch {
    const notice = await message.channel.send({
      content: `${message.author}`,
      embeds: [new EmbedBuilder(embedData)],
    });
    setTimeout(() => notice.delete().catch(() => {}), 15000);
  }
}

async function openConfessPrompt(message) {
  const cfg = getGuildConfig(message.guild.id);
  if (!getConfessionChannelId(cfg)) {
    await message.delete().catch(() => {});
    return notifyUser(message, errorEmbed(
      'O canal de confissão ainda não foi configurado. Um admin pode usar `f!comunidade confissao` neste canal.',
    ));
  }

  await message.delete().catch(() => {});

  try {
    await message.author.send({ components: [confessOpenButton(message.guild.id)] });
  } catch {
    await openConfessThread(message);
  }
}

async function openConfessThread(message) {
  const cfg = getGuildConfig(message.guild.id);
  const parentId = getConfessionChannelId(cfg);
  const parent = await message.guild.channels.fetch(parentId).catch(() => null);

  if (!parent?.isTextBased?.() || !parent.threads?.create) {
    return notifyUser(message, errorEmbed('Não consegui abrir o formulário. Abre as DMs do servidor e tenta de novo.'));
  }

  const threadName = `conf-${message.author.username}`.slice(0, 100).replace(/[^a-zA-Z0-9-_]/g, '-');
  const thread = await parent.threads.create({
    name: threadName,
    type: ChannelType.PrivateThread,
    autoArchiveDuration: 60,
    reason: 'Confissão Failuerc',
  });

  await thread.members.add(message.author.id);
  await thread.send({
    content: `${message.author}`,
    components: [confessOpenButton(message.guild.id)],
  });
}

async function showConfessModal(interaction, guildId) {
  await interaction.showModal(buildConfessModal(guildId));
}

async function startConfess(message) {
  return openConfessPrompt(message);
}

async function startCommunityPost(message, type) {
  const meta = TYPE_META[type];
  if (!meta) {
    await message.delete().catch(() => {});
    return notifyUser(message, errorEmbed('Tipo de publicação inválido.'));
  }

  const cfg = getGuildConfig(message.guild.id);
  if (!getTargetChannelId(cfg, type)) {
    await message.delete().catch(() => {});
    return notifyUser(message, errorEmbed(
      `O canal de ${meta.label} ainda não foi configurado. Um admin pode usar \`f!comunidade ${type}\` neste canal.`,
    ));
  }

  await message.delete().catch(() => {});

  setPending(message.author.id, type, message.guild.id);

  const payload = {
    embeds: [new EmbedBuilder(successEmbed(
      meta.promptTitle,
      'Escolhe se queres publicar de forma anónima ou mostrando o teu nick.',
    ))],
    components: [communityModeButtons(type)],
  };

  try {
    await message.author.send(payload);
  } catch {
    clearPending(message.author.id, type);
    await notifyUser(message, errorEmbed('Não consegui enviar-te mensagem privada. Abre as DMs do servidor e tenta de novo.'));
  }
}

async function handleConfessOpenButton(interaction) {
  const guildId = parseConfessOpenId(interaction.customId);
  if (!guildId) return false;

  await showConfessModal(interaction, guildId);
  return true;
}

async function handleConfessModal(interaction) {
  const guildId = parseConfessModalId(interaction.customId);
  if (!guildId) return false;

  const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    await interaction.reply({
      embeds: [errorEmbed('Servidor não encontrado.')],
      ephemeral: true,
    });
    return true;
  }

  const cfg = getGuildConfig(guild.id);
  const channelId = getConfessionChannelId(cfg);
  if (!channelId) {
    await interaction.reply({
      embeds: [errorEmbed('O canal de confissão não está configurado.')],
      ephemeral: true,
    });
    return true;
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    await interaction.reply({
      embeds: [errorEmbed('Canal de confissão inválido ou inacessível.')],
      ephemeral: true,
    });
    return true;
  }

  const content = interaction.fields.getTextInputValue('content').trim();
  const number = nextConfessionNumber(guild.id);

  await channel.send({
    embeds: [new EmbedBuilder(anonymousConfessionEmbed(number, content))],
  });

  if (interaction.channel?.isThread?.()) {
    await interaction.channel.setArchived(true, 'Confissão enviada').catch(() => {});
  }

  await interaction.reply({
    embeds: [new EmbedBuilder(successEmbed(
      'Confissão enviada',
      `A tua confissão anónima (#${number}) foi publicada.`,
    ))],
    ephemeral: true,
  });

  return true;
}

async function handleCommunityButton(interaction) {
  const parsed = parseCommunityButtonId(interaction.customId);
  if (!parsed) return false;

  const meta = TYPE_META[parsed.type];
  if (!meta) return false;

  const pending = getPending(interaction.user.id, parsed.type);
  if (!pending) {
    await interaction.reply({
      embeds: [errorEmbed('Este menu expirou. Usa o comando de novo.')],
      ephemeral: true,
    });
    return true;
  }

  const modal = new ModalBuilder()
    .setCustomId(communityModalId(parsed.type, parsed.mode))
    .setTitle(meta.modalTitle)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('content')
          .setLabel('O que queres dizer?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMinLength(5)
          .setMaxLength(2000)
          .setPlaceholder(meta.placeholder),
      ),
    );

  await interaction.showModal(modal);
  return true;
}

async function resolveGuildMember(client, guildId, userId) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { guild: null, member: null };
  const member = await guild.members.fetch(userId).catch(() => null);
  return { guild, member };
}

async function handleCommunityModal(interaction) {
  const parsed = parseCommunityModalId(interaction.customId);
  if (!parsed) return false;

  const meta = TYPE_META[parsed.type];
  if (!meta) return false;

  const pending = getPending(interaction.user.id, parsed.type);
  if (!pending) {
    await interaction.reply({
      embeds: [errorEmbed('Este menu expirou. Usa o comando de novo.')],
      ephemeral: true,
    });
    return true;
  }

  clearPending(interaction.user.id, parsed.type);

  const { guild, member } = await resolveGuildMember(
    interaction.client,
    pending.guildId,
    interaction.user.id,
  );

  if (!guild) {
    await interaction.reply({
      embeds: [errorEmbed('Servidor não encontrado.')],
      ephemeral: true,
    });
    return true;
  }

  const cfg = getGuildConfig(guild.id);
  const channelId = getTargetChannelId(cfg, parsed.type);
  if (!channelId) {
    await interaction.reply({
      embeds: [errorEmbed(`O canal de ${meta.label} não está configurado.`)],
      ephemeral: true,
    });
    return true;
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    await interaction.reply({
      embeds: [errorEmbed('Canal de destino inválido ou inacessível.')],
      ephemeral: true,
    });
    return true;
  }

  const content = interaction.fields.getTextInputValue('content').trim();
  const anonymous = parsed.mode === 'anon';

  const embed = communityPostEmbed(parsed.type, content, {
    anonymous,
    author: member || interaction.user,
  });

  await channel.send({ embeds: [new EmbedBuilder(embed)] });

  await interaction.reply({
    embeds: [new EmbedBuilder(successEmbed(
      `${meta.modalTitle} enviado`,
      anonymous
        ? 'A tua mensagem foi publicada de forma anónima.'
        : 'A tua mensagem foi publicada com o teu nick.',
    ))],
    ephemeral: true,
  });

  return true;
}

module.exports = {
  startConfess,
  startCommunityPost,
  showConfessModal,
  handleConfessOpenButton,
  handleConfessModal,
  handleCommunityButton,
  handleCommunityModal,
};
