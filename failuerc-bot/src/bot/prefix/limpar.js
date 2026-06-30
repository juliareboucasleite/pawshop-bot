const { isModerator } = require('../../utils/permissions');
const { getGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const {
  purgeMessages,
  clampAmount,
  requireModPermission,
  PermissionFlagsBits,
} = require('../../services/moderationActions');

function parseUserIdFromArgs(args) {
  const mention = args[0]?.match(/^<@!?(\d+)>$/);
  if (mention) return { userId: mention[1], offset: 1 };
  if (args[0] && /^\d{17,20}$/.test(args[0])) return { userId: args[0], offset: 1 };
  return { userId: null, offset: 0 };
}

async function runPurge(message, args) {
  const cfg = getGuildConfig(message.guild.id);
  if (!isModerator(message.member, cfg.supportRoleIds)) {
    return message.reply({ embeds: [errorEmbed('Sem permissão de moderação.')] });
  }

  const perm = requireModPermission(message.member, PermissionFlagsBits.ManageMessages);
  if (!perm.ok) return message.reply({ embeds: [errorEmbed(perm.error)] });

  const { userId, offset } = parseUserIdFromArgs(args);
  const amount = clampAmount(args[offset] || args[0] || 10);

  if (!amount || Number.isNaN(amount)) {
    return message.reply({ embeds: [errorEmbed('Indica a quantidade: `f!limpar 50` ou `f!limpar 30 @membro`.')] });
  }

  const status = await message.reply({ embeds: [successEmbed('A limpar…', 'Aguarda um momento.')] });
  const deleted = await purgeMessages(message.channel, amount, {
    userId,
    moderator: message.author,
  });

  await status.edit({
    embeds: [successEmbed(
      'Mensagens apagadas',
      `**${deleted}** mensagem(ns) removida(s)${userId ? ` do membro indicado` : ''}.`,
    )],
  }).catch(() => {});
}

module.exports = {
  name: 'limpar',
  description: 'Apaga mensagens do canal',
  moderatorOnly: true,
  aliases: ['purge', 'apagar', 'clean'],
  execute: runPurge,
};
