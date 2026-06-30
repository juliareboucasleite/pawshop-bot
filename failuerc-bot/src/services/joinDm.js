const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../../config/default.json');
const { getGuildConfig } = require('../utils/store');
const { joinDmEmbed } = require('../utils/embeds');

function getJoinDmSettings(guildCfg = {}) {
  const global = config.joinDm || {};
  const local = guildCfg.joinDm || {};

  return {
    enabled: local.enabled ?? global.enabled ?? true,
    banAppealInvite: local.banAppealInvite || global.banAppealInvite,
    buttonLabel: local.buttonLabel || global.buttonLabel || 'Ban Appeals',
    message: local.message || global.message,
  };
}

async function sendJoinDm(member) {
  if (member.user.bot) return false;

  const cfg = getGuildConfig(member.guild.id);
  const settings = getJoinDmSettings(cfg);
  if (!settings.enabled || !settings.banAppealInvite) return false;

  const embed = new EmbedBuilder(joinDmEmbed(member, settings));
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(settings.buttonLabel)
      .setStyle(ButtonStyle.Link)
      .setURL(settings.banAppealInvite),
  );

  try {
    await member.send({ embeds: [embed], components: [row] });
    return true;
  } catch (err) {
    if (err.code !== 50007) {
      console.error(`[join-dm] ${member.guild.id} → ${member.id}:`, err.message);
    }
    return false;
  }
}

module.exports = {
  getJoinDmSettings,
  sendJoinDm,
};
