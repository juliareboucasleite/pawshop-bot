const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { getGuildConfig, updateGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed, infoEmbed, musicHelpEmbed } = require('../../utils/embeds');
const { parseChannelArg } = require('../../utils/prefixArgs');
const {
  publishMusicPanel,
  buildProfileEmbed,
  buildHistoryEmbed,
} = require('../../services/musicShares');
const config = require('../../../config/default.json');

function resolveUser(message, arg) {
  if (!arg) return message.author;
  const mention = message.mentions.users.first();
  if (mention) return mention;
  const id = arg.replace(/[<@!>]/g, '');
  return message.guild.members.cache.get(id)?.user || message.author;
}

function showInfo(message) {
  const cfg = getGuildConfig(message.guild.id);
  const p = config.bot.prefix;
  const channel = cfg.music?.channelId ? `<#${cfg.music.channelId}>` : '— não definido —';
  const userCount = Object.keys(cfg.music?.users || {}).length;
  const shareCount = cfg.music?.shareCounter || 0;

  const lines = [
    `**Canal música:** ${channel}`,
    `**Partilhas registadas:** ${shareCount}`,
    `**Utilizadores com histórico:** ${userCount}`,
    '',
    '**Comandos:**',
    `\`${p}musica perfil\` — o teu perfil musical`,
    `\`${p}musica perfil @utilizador\` — perfil de outra pessoa`,
    `\`${p}musica historico\` — últimas partilhas`,
    '',
    '**Admin:**',
    `\`${p}musica canal\` — define este canal`,
    `\`${p}musica painel\` — publica o painel de boas-vindas`,
  ];

  return message.reply({ embeds: [new EmbedBuilder(infoEmbed('Cantinho da música', lines.join('\n')))] });
}

module.exports = {
  name: 'musica',
  description: 'Cantinho da música — partilhas e perfis musicais',
  async execute(message, args) {
    const sub = (args[0] || 'perfil').toLowerCase();
    const p = config.bot.prefix;

    if (sub === 'perfil' || sub === 'profile') {
      const user = resolveUser(message, args[1]);
      return message.reply({ embeds: [buildProfileEmbed(user, message.guild.id)] });
    }

    if (sub === 'historico' || sub === 'histórico' || sub === 'history') {
      const user = resolveUser(message, args[1]);
      return message.reply({ embeds: [buildHistoryEmbed(user, message.guild.id)] });
    }

    if (sub === 'comousar' || sub === 'como' || sub === 'help') {
      if (isAdmin(message.member)) {
        return message.channel.send({ embeds: [new EmbedBuilder(musicHelpEmbed())] });
      }
      return message.reply({ embeds: [new EmbedBuilder(musicHelpEmbed())] });
    }

    if (sub === 'info' || sub === 'ajuda') {
      if (!isAdmin(message.member)) {
        return message.reply({
          embeds: [errorEmbed(`Usa \`${p}musica perfil\` ou \`${p}musica historico\`.`)],
        });
      }
      return showInfo(message);
    }

    if (!isAdmin(message.member)) {
      return message.reply({
        embeds: [errorEmbed(`Usa \`${p}musica perfil\` ou \`${p}musica historico\`.`)],
      });
    }

    if (sub === 'canal' || sub === 'channel') {
      const channel = parseChannelArg(args[1], message.guild) || message.channel;

      updateGuildConfig(message.guild.id, (cfg) => ({
        ...cfg,
        music: {
          ...cfg.music,
          channelId: channel.id,
        },
      }));

      return message.reply({
        embeds: [successEmbed('Música configurada', `Canal → ${channel}\n\nLinks de música são lidos automaticamente.`)],
      });
    }

    if (sub === 'painel' || sub === 'panel') {
      const msg = await publishMusicPanel(message.channel);
      return message.reply({
        embeds: [successEmbed('Painel publicado', `Cantinho da música ativo em ${msg.url}`)],
      });
    }

    return showInfo(message);
  },
};
