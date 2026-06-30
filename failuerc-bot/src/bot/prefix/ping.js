const config = require('../../../config/default.json');
const { EmbedBuilder } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'ping',
  description: 'Latência do bot',
  async execute(message) {
    const sent = await message.reply({ embeds: [successEmbed('Pong', 'A medir…')] });
    const ms = sent.createdTimestamp - message.createdTimestamp;
    const api = Math.round(message.client.ws.ping);
    const embed = new EmbedBuilder(
      successEmbed('Pong', `**Mensagem:** ${ms}ms\n**API:** ${api}ms\n**${config.bot.nome}** online.`),
    );
    await sent.edit({ embeds: [embed] });
  },
};
