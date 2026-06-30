const { PermissionFlagsBits } = require('discord.js');
const config = require('../../config/default.json');
const { getGuildConfig } = require('../utils/store');

const DEFAULT_MESSAGE = config.welcome?.message
  || 'Oiii! {usuario}, bom proveito do servidor! espero que goste.';

function defaultWelcomeConfig() {
  return {
    enabled: false,
    channelId: null,
    message: DEFAULT_MESSAGE,
  };
}

function formatWelcomeMessage(template, member) {
  const text = template || DEFAULT_MESSAGE;
  return text
    .replace(/\{usuario\}/gi, member.toString())
    .replace(/\{user\}/gi, member.toString())
    .replace(/\{nome\}/gi, member.displayName || member.user.username)
    .replace(/\{username\}/gi, member.user.username)
    .replace(/\{servidor\}/gi, member.guild.name);
}

async function sendWelcomeMessage(member) {
  if (member.user.bot) return;

  const cfg = getGuildConfig(member.guild.id);
  const welcome = { ...defaultWelcomeConfig(), ...cfg.welcome };

  if (!welcome.enabled || !welcome.channelId) return;

  const channel = await member.guild.channels.fetch(welcome.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return;

  const botMember = member.guild.members.me
    ?? await member.guild.members.fetchMe().catch(() => null);
  const perms = channel.permissionsFor(botMember);
  if (!perms?.has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages)) {
    console.error(`[welcome] Sem permissão em ${welcome.channelId} (${member.guild.id})`);
    return;
  }

  const content = formatWelcomeMessage(welcome.message, member);
  await channel.send({ content, allowedMentions: { users: [member.id] } });
}

module.exports = {
  DEFAULT_MESSAGE,
  defaultWelcomeConfig,
  formatWelcomeMessage,
  sendWelcomeMessage,
};
