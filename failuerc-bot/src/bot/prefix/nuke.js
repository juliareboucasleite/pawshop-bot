const { isModerator } = require('../../utils/permissions');
const { getGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const {
  nukeChannel,
  requireModPermission,
  PermissionFlagsBits,
} = require('../../services/moderationActions');

module.exports = {
  name: 'nuke',
  description: 'Recria o canal (apaga todo o histórico)',
  moderatorOnly: true,
  async execute(message, args) {
    const cfg = getGuildConfig(message.guild.id);
    if (!isModerator(message.member, cfg.supportRoleIds)) {
      return message.reply({ embeds: [errorEmbed('Sem permissão de moderação.')] });
    }

    const perm = requireModPermission(message.member, PermissionFlagsBits.ManageChannels);
    if (!perm.ok) return message.reply({ embeds: [errorEmbed(perm.error)] });

    const confirm = (args[0] || '').toLowerCase();
    if (!['confirmar', 'confirm', 'sim', 'yes'].includes(confirm)) {
      return message.reply({
        embeds: [errorEmbed(
          '⚠️ Isto **apaga o canal inteiro** e cria uma cópia vazia.\n'
          + 'Para confirmar: `f!nuke confirmar`',
        )],
      });
    }

    const status = await message.reply({ embeds: [successEmbed('A recriar canal…', 'Aguarda.')] });

    try {
      const newChannel = await nukeChannel(message.channel, message.author);
      await status.edit({
        embeds: [successEmbed('Canal recriado', `Nuke concluído → ${newChannel}`)],
      }).catch(() => {});
    } catch (err) {
      console.error('[nuke]', err);
      await status.edit({
        embeds: [errorEmbed('Não foi possível recriar o canal. Verifica as permissões do bot.')],
      }).catch(() => {});
    }
  },
};
