const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { getGuildConfig, updateGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed, infoEmbed, fashionPanelEmbed } = require('../../utils/embeds');
const { parseChannelArg } = require('../../utils/prefixArgs');
const config = require('../../../config/default.json');

function showInfo(message) {
  const cfg = getGuildConfig(message.guild.id);
  const p = config.bot.prefix;
  const channel = cfg.fashion?.channelId ? `<#${cfg.fashion.channelId}>` : '— não definido —';
  const monthKey = cfg.fashion?.monthKey || '—';
  const voterCount = Object.keys(cfg.fashion?.votes || {}).length;

  const lines = [
    `**Canal fashion:** ${channel}`,
    `**Mês atual:** ${monthKey}`,
    `**Participantes este mês:** ${voterCount}`,
    '',
    '**Comandos:**',
    `\`${p}fashion canal\` — define este canal`,
    `\`${p}fashion canal #canal\` — define outro canal`,
    `\`${p}fashion painel\` — publica painel explicativo`,
  ];

  return message.reply({ embeds: [new EmbedBuilder(infoEmbed('Fashion check', lines.join('\n')))] });
}

module.exports = {
  name: 'fashion',
  description: 'Configura o canal fashion com reações automáticas',
  adminOnly: true,
  async execute(message, args) {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')] });
    }

    const sub = (args[0] || 'info').toLowerCase();

    if (sub === 'info' || sub === 'ajuda') {
      return showInfo(message);
    }

    if (sub === 'canal' || sub === 'channel') {
      const channel = parseChannelArg(args[1], message.guild) || message.channel;

      updateGuildConfig(message.guild.id, (cfg) => ({
        ...cfg,
        fashion: {
          ...cfg.fashion,
          channelId: channel.id,
        },
      }));

      return message.reply({
        embeds: [successEmbed('Fashion configurado', `Canal fashion → ${channel}\n\nImagens recebem automaticamente ✅ e ❌.`)],
      });
    }

    if (sub === 'painel' || sub === 'panel') {
      const embed = new EmbedBuilder(fashionPanelEmbed());
      return message.channel.send({ embeds: [embed] });
    }

    return showInfo(message);
  },
};
