const { PermissionFlagsBits } = require('discord.js');
const { upsertFromGuild } = require('../../services/parceiros');

async function resolveInviteUrl(guild) {
  if (guild.vanityURLCode) {
    return `https://discord.gg/${guild.vanityURLCode}`;
  }

  const me = guild.members.me;
  if (!me) return null;

  const channel = guild.channels.cache.find(
    (ch) => ch.isTextBased()
      && me.permissionsIn(ch).has(PermissionFlagsBits.CreateInstantInvite),
  );

  if (!channel) return null;

  const invite = await channel.createInvite({
    maxAge: 0,
    maxUses: 0,
    reason: 'Failuerc — link parceiro no site',
  }).catch(() => null);

  return invite?.url ?? null;
}

async function registerGuild(guild) {
  const inviteUrl = await resolveInviteUrl(guild);
  const entry = upsertFromGuild(guild, { inviteUrl });
  console.log(`[parceiros] + ${guild.name} (${guild.memberCount} membros)`);
  return entry;
}

module.exports = { registerGuild, resolveInviteUrl };
