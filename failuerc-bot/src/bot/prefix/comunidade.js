const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { getGuildConfig, updateGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { parseChannelArg } = require('../../utils/prefixArgs');
const config = require('../../../config/default.json');

function showInfo(message) {
  const cfg = getGuildConfig(message.guild.id);
  const p = config.bot.prefix;
  const lines = [
    `**Confissões:** ${cfg.community?.confissaoChannelId ? `<#${cfg.community.confissaoChannelId}>` : '— não definido —'}`,
    `**Desabafos:** ${cfg.community?.desabafoChannelId ? `<#${cfg.community.desabafoChannelId}>` : '— não definido —'}`,
    '',
    `**Comandos:**`,
    `\`${p}confissao\` — publicar confissão`,
    `\`${p}desabafo\` — publicar desabafo`,
    `\`${p}comunidade confissao\` — define este canal para confissões`,
    `\`${p}comunidade desabafo\` — define este canal para desabafos`,
    `\`${p}comunidade configurar #confissao #desabafo\` — define canais`,
  ];
  return message.reply({ embeds: [new EmbedBuilder(infoEmbed('Comunidade', lines.join('\n')))] });
}

function setChannel(message, type, channel) {
  const key = type === 'confissao' ? 'confissaoChannelId' : 'desabafoChannelId';
  const label = type === 'confissao' ? 'Confissões' : 'Desabafos';

  updateGuildConfig(message.guild.id, (cfg) => ({
    ...cfg,
    community: {
      ...cfg.community,
      [key]: channel.id,
    },
  }));

  return message.reply({
    embeds: [successEmbed('Comunidade configurada', `${label} → ${channel}`)],
  });
}

module.exports = {
  name: 'comunidade',
  description: 'Configura canais de confissão e desabafo',
  adminOnly: true,
  async execute(message, args) {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')] });
    }

    const sub = (args[0] || 'info').toLowerCase();
    const p = config.bot.prefix;

    if (sub === 'info' || sub === 'ajuda') {
      return showInfo(message);
    }

    if (sub === 'confissao' || sub === 'confissão') {
      const channel = parseChannelArg(args[1], message.guild) || message.channel;
      return setChannel(message, 'confissao', channel);
    }

    if (sub === 'desabafo') {
      const channel = parseChannelArg(args[1], message.guild) || message.channel;
      return setChannel(message, 'desabafo', channel);
    }

    if (sub === 'configurar') {
      const confissao = parseChannelArg(args[1], message.guild);
      const desabafo = parseChannelArg(args[2], message.guild);

      if (!confissao && !desabafo) {
        return message.reply({
          embeds: [errorEmbed(`Indica pelo menos um canal.\nEx: \`${p}comunidade configurar #confissao #desabafo\``)],
        });
      }

      updateGuildConfig(message.guild.id, (cfg) => ({
        ...cfg,
        community: {
          ...cfg.community,
          confissaoChannelId: confissao?.id || cfg.community?.confissaoChannelId || null,
          desabafoChannelId: desabafo?.id || cfg.community?.desabafoChannelId || null,
        },
      }));

      const parts = [];
      if (confissao) parts.push(`Confissões → ${confissao}`);
      if (desabafo) parts.push(`Desabafos → ${desabafo}`);

      return message.reply({
        embeds: [successEmbed('Comunidade configurada', parts.join('\n'))],
      });
    }

    return message.reply({
      embeds: [errorEmbed(`Subcomando desconhecido. Usa \`${p}comunidade info\`.`)],
    });
  },
};
