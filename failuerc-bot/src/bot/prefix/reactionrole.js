const { EmbedBuilder } = require('discord.js');
const config = require('../../../config/default.json');
const { isAdmin } = require('../../utils/permissions');
const {
  getGuildConfig,
  removeReactionRolesForMessage,
  removeReactionRole,
} = require('../../utils/store');
const { reactionRolePanel, errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { parseReactionInput } = require('../../utils/components');
const { parseChannelArg, parseRoleArg } = require('../../utils/prefixArgs');
const { setupReactionRole, findMessage } = require('../../services/reactionRoleSetup');

function showHelp(message) {
  const p = config.bot.prefix;
  return message.reply({
    embeds: [infoEmbed('Reaction roles', [
      'Estilo **Carl-bot** — reagir dá o cargo; remover a reação tira o cargo.',
      '',
      '**Adicionar**',
      `\`${p}rr add <message_id> <emoji> @cargo\``,
      `\`${p}rr add #canal <message_id> <emoji> @cargo\``,
      '',
      '**Gerir**',
      `\`${p}rr remove <message_id> <emoji>\` — remove uma entrada`,
      `\`${p}rr clear <message_id>\` — limpa todas da mensagem`,
      `\`${p}rr list\` — lista configurados`,
      `\`${p}rr panel [título] | [descrição]\` — cria painel`,
      '',
      `Atalhos: \`${p}reactionrole\` · \`${p}reacao\``,
    ].join('\n'))],
  });
}

function parseAddArgs(args, guild, message) {
  let offset = 0;
  let channel = message.channel;

  const ch = parseChannelArg(args[0], guild);
  if (ch?.isTextBased()) {
    channel = ch;
    offset = 1;
  }

  const messageId = args[offset];
  const emojiInput = args[offset + 1];
  const role = parseRoleArg(args[offset + 2], guild) || message.mentions.roles.first();

  return { channel, messageId, emojiInput, role };
}

function parseMessageEmojiArgs(args, guild, message) {
  let offset = 0;
  let channel = message.channel;

  const ch = parseChannelArg(args[0], guild);
  if (ch?.isTextBased()) {
    channel = ch;
    offset = 1;
  }

  return {
    channel,
    messageId: args[offset],
    emojiInput: args[offset + 1],
  };
}

module.exports = {
  name: 'reactionrole',
  description: 'Reaction roles — cargo ao clicar na reação',
  aliases: ['rr', 'reacao', 'reactionroles'],
  adminOnly: true,
  async execute(message, args) {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')] });
    }

    const sub = (args[0] || 'help').toLowerCase();
    const rest = args.slice(1);

    if (sub === 'help' || sub === 'ajuda') {
      return showHelp(message);
    }

    if (sub === 'list' || sub === 'listar') {
      const cfg = getGuildConfig(message.guild.id);
      if (!cfg.reactionRoles.length) {
        return message.reply({ embeds: [infoEmbed('Reaction roles', 'Nenhum configurado.')] });
      }
      const lines = cfg.reactionRoles.map(
        (r) => `• \`${r.emoji}\` → <@&${r.roleId}> · msg \`${r.messageId}\` · <#${r.channelId}>`,
      );
      return message.reply({ embeds: [infoEmbed('Reaction roles', lines.join('\n'))] });
    }

    if (sub === 'panel' || sub === 'painel') {
      const raw = rest.join(' ');
      const [titulo, descricao] = raw.includes('|')
        ? raw.split('|').map((s) => s.trim())
        : [raw.trim() || null, null];

      const embed = new EmbedBuilder(reactionRolePanel(titulo, descricao));
      const msg = await message.channel.send({ embeds: [embed] });
      const p = config.bot.prefix;

      return message.reply({
        embeds: [successEmbed(
          'Painel criado',
          `Agora usa \`${p}rr add ${msg.id} <emoji> @cargo\` para cada reação.\n${msg.url}`,
        )],
      });
    }

    if (sub === 'clear' || sub === 'limpar' || sub === 'reset') {
      const { messageId } = parseMessageEmojiArgs(rest, message.guild, message);
      if (!messageId) {
        return message.reply({
          embeds: [errorEmbed(`Usa: \`${config.bot.prefix}rr clear <message_id>\`.`)],
        });
      }

      removeReactionRolesForMessage(message.guild.id, messageId);
      return message.reply({
        embeds: [successEmbed('Limpo', `Todas as reaction roles da mensagem \`${messageId}\` foram removidas.`)],
      });
    }

    if (sub === 'remove' || sub === 'remover' || sub === 'rem' || sub === 'delete') {
      const { channel, messageId, emojiInput } = parseMessageEmojiArgs(rest, message.guild, message);
      if (!messageId || !emojiInput) {
        return message.reply({
          embeds: [errorEmbed(`Usa: \`${config.bot.prefix}rr remove <message_id> <emoji>\`.`)],
        });
      }

      const parsed = parseReactionInput(emojiInput);
      const reactionKey = parsed.id ?? parsed.name;
      removeReactionRole(message.guild.id, messageId, reactionKey);

      const msg = await findMessage(message.guild, messageId, channel);
      if (msg) {
        const reaction = msg.reactions.cache.find(
          (r) => (r.emoji.id || r.emoji.name) === reactionKey,
        );
        await reaction?.remove().catch(() => {});
      }

      return message.reply({
        embeds: [successEmbed('Removido', `Reaction role \`${emojiInput}\` removida da mensagem \`${messageId}\`.`)],
      });
    }

    if (sub === 'add' || sub === 'adicionar' || sub === 'adiciona') {
      const { channel, messageId, emojiInput, role } = parseAddArgs(rest, message.guild, message);

      if (!messageId || !emojiInput || !role) {
        const p = config.bot.prefix;
        return message.reply({
          embeds: [errorEmbed(
            `Usa: \`${p}rr add <message_id> <emoji> @cargo\`\n`
            + `Exemplo: \`${p}rr add 1234567890123456789 ✅ @Membro\``,
          )],
        });
      }

      const result = await setupReactionRole(
        message.guild,
        messageId,
        emojiInput,
        role,
        { preferredChannel: channel },
      );

      if (!result.ok) {
        return message.reply({ embeds: [errorEmbed(result.error)] });
      }

      return message.reply({
        embeds: [successEmbed(
          'Reaction role adicionada',
          `${result.reactionInput} → ${result.role}\n`
          + `Mensagem: ${result.message.url}\n`
          + 'Reagir **dá** o cargo; remover a reação **tira** o cargo.',
        )],
      });
    }

    return showHelp(message);
  },
};
