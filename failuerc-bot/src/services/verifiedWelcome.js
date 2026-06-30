const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/store');
const { verifiedWelcomeEmbed } = require('../utils/embeds');

async function sendVerifiedWelcome(member) {
  if (member.user.bot) return;

  const cfg = getGuildConfig(member.guild.id);
  const channelId = cfg.verification?.welcomeChannelId;
  if (!channelId) return;

  const channel = await member.guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return;

  const botMember = member.guild.members.me
    ?? await member.guild.members.fetchMe().catch(() => null);
  const perms = channel.permissionsFor(botMember);
  if (!perms?.has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages)) {
    console.error(`[verified-welcome] Sem permissão em ${channelId} (${member.guild.id})`);
    return;
  }

  await channel.send({
    content: `${member}`,
    embeds: [new EmbedBuilder(verifiedWelcomeEmbed(member))],
    allowedMentions: { users: [member.id] },
  });
}

module.exports = { sendVerifiedWelcome };
