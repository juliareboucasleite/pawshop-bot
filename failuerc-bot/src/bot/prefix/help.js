const config = require('../../../config/default.json');
const { EmbedBuilder } = require('discord.js');

const COR = parseInt(config.bot.cor.replace('#', ''), 16);
const SITE = 'https://reboucas.me/failuerc';

module.exports = {
  name: 'help',
  description: 'Lista comandos do bot',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor(COR)
      .setAuthor({
        name: `Ajuda da ${config.bot.nome}`,
        iconURL: message.client.user.displayAvatarURL({ size: 128 }),
      })
      .setThumbnail(message.client.user.displayAvatarURL({ size: 256 }))
      .setDescription([
        `Olá ${message.author}, o meu nome é **${config.bot.nome}** e sou um bot para o Discord feito para deixar o teu servidor mais organizado, seguro e acolhedor.`,
        '',
        'Tenho sistemas de verificação, tickets, reaction roles, sugestões, confissões, fashion check e um cantinho da música para partilhar gostos musicais.',
        '',
        'Fui criada pela Julia Rebouças para ajudar comunidades que querem moderação e diversão no mesmo lugar ♡',
      ].join('\n'))
      .addFields(
        {
          name: '📚 Lista de Comandos',
          value: `[reboucas.me/failuerc/comandos](${SITE}/comandos)`,
          inline: true,
        },
        {
          name: '🙋‍♀️ Está com dúvidas? Pergunte no meu Servidor de Suporte!',
          value: `[${config.site.discordNome}](${config.site.discordInvite})`,
          inline: true,
        },
        {
          name: '🏰 Meu Painel: o lugar para me adicionar e configurar o teu servidor!',
          value: `[reboucas.me/failuerc/painel](${SITE}/painel)`,
          inline: true,
        },
        {
          name: '📖 Wiki',
          value: `[reboucas.me/failuerc/wiki](${SITE}/wiki)`,
          inline: true,
        },
        {
          name: '💬 Suporte',
          value: `[reboucas.me/failuerc/suporte](${SITE}/suporte)`,
          inline: true,
        },
        {
          name: '⚖️ Diretrizes da comunidade',
          value: `[reboucas.me/failuerc/diretrizes](${SITE}/diretrizes)`,
          inline: true,
        },
        {
          name: '💜 Apoiar o projeto',
          value: `Revolut ou PIX — usa \`${config.bot.prefix}apoia\``,
          inline: true,
        },
      )
      .setFooter({ text: config.bot.nome });

    await message.reply({ embeds: [embed] });
  },
};
