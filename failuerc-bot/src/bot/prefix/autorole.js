const config = require('../../../config/default.json');
const { isAdmin } = require('../../utils/permissions');
const { updateGuildConfig, getGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { parseRoleArg } = require('../../utils/prefixArgs');
const { EmbedBuilder } = require('discord.js');

function showHelp(message) {
  const p = config.bot.prefix;
  return message.reply({
    embeds: [infoEmbed('Autorole', [
      'Cargos dados **automaticamente** quando alguém entra no servidor.',
      '',
      `\`${p}autorole add @cargo\` — adiciona ao autorole`,
      `\`${p}autorole remove @cargo\` — remove do autorole`,
      `\`${p}autorole list\` — lista cargos configurados`,
      '',
      `Atalho: \`${p}ar\``,
    ].join('\n'))],
  });
}

module.exports = {
  name: 'autorole',
  description: 'Cargos automáticos ao entrar no servidor',
  aliases: ['ar'],
  adminOnly: true,
  async execute(message, args) {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')] });
    }

    const sub = (args[0] || 'list').toLowerCase();
    const roleArg = args[1];

    if (sub === 'help' || sub === 'ajuda') {
      return showHelp(message);
    }

    if (sub === 'list' || sub === 'listar') {
      const cfg = getGuildConfig(message.guild.id);
      const text = cfg.autoroleIds?.length
        ? cfg.autoroleIds.map((id) => `<@&${id}>`).join('\n')
        : 'Nenhum cargo configurado.';
      return message.reply({ embeds: [infoEmbed('Autorole', text)] });
    }

    const role = parseRoleArg(roleArg, message.guild) || message.mentions.roles.first();
    if (!role) {
      return message.reply({
        embeds: [errorEmbed(`Menciona um cargo: \`${config.bot.prefix}autorole add @cargo\`.`)],
      });
    }

    if (sub === 'add' || sub === 'adicionar' || sub === 'adiciona') {
      updateGuildConfig(message.guild.id, (cfg) => {
        const ids = new Set(cfg.autoroleIds || []);
        ids.add(role.id);
        return { ...cfg, autoroleIds: [...ids] };
      });
      return message.reply({
        embeds: [successEmbed('Autorole atualizado', `${role} será dado a **novos membros** que entrarem no servidor.`)],
      });
    }

    if (sub === 'remove' || sub === 'remover' || sub === 'rem') {
      updateGuildConfig(message.guild.id, (cfg) => ({
        ...cfg,
        autoroleIds: (cfg.autoroleIds || []).filter((id) => id !== role.id),
      }));
      return message.reply({
        embeds: [successEmbed('Autorole atualizado', `${role} removido do autorole.`)],
      });
    }

    return showHelp(message);
  },
};
