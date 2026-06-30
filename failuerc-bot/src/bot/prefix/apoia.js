const { EmbedBuilder } = require('discord.js');
const { apoiaEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'apoia',
  description: 'Formas de apoiar o Failuerc (Revolut ou PIX)',
  async execute(message) {
    await message.reply({ embeds: [new EmbedBuilder(apoiaEmbed())] });
  },
};
