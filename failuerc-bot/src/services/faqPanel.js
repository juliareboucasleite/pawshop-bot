const { EmbedBuilder } = require('discord.js');
const faqConfig = require('../../config/faq-panels.json');
const config = require('../../config/default.json');
const { updateGuildConfig } = require('../utils/store');
const { faqPanelEmbed, faqTopicEmbed } = require('../utils/embeds');
const { faqSelectRow, parseFaqSelectId } = require('../utils/components');

function getPanel(panelId = 'default') {
  return faqConfig[panelId] || faqConfig.default;
}

function listPanelIds() {
  return Object.keys(faqConfig);
}

async function publishFaqPanel(channel, panelId = 'default') {
  const panel = getPanel(panelId);
  if (!panel) return { ok: false, error: 'Painel FAQ não encontrado.' };

  const embed = new EmbedBuilder(faqPanelEmbed(panel));
  const row = faqSelectRow(channel.guild.id, panel);

  const sent = await channel.send({ embeds: [embed], components: [row] });

  updateGuildConfig(channel.guild.id, (c) => ({
    ...c,
    faq: {
      ...c.faq,
      channelId: channel.id,
      messageId: sent.id,
      panelId: panelId in faqConfig ? panelId : 'default',
    },
  }));

  return { ok: true, message: sent };
}

async function handleFaqSelect(interaction) {
  const guildId = parseFaqSelectId(interaction.customId);
  if (!guildId || guildId !== interaction.guild?.id) return false;

  const topicId = interaction.values[0];
  let found = null;

  for (const panel of Object.values(faqConfig)) {
    const topic = panel.topics.find((t) => t.id === topicId);
    if (topic) {
      found = { topic, panel };
      break;
    }
  }

  if (!found) {
    await interaction.reply({
      embeds: [new EmbedBuilder({ color: 0xed4245, description: 'Tópico não encontrado.' })],
      ephemeral: true,
    });
    return true;
  }

  await interaction.reply({
    embeds: [new EmbedBuilder(faqTopicEmbed(found.topic, found.panel))],
    ephemeral: true,
  });
  return true;
}

module.exports = {
  getPanel,
  listPanelIds,
  publishFaqPanel,
  handleFaqSelect,
};
