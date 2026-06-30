const { Events } = require('discord.js');
const { getGuildConfig } = require('../../utils/store');
const { sendVerifiedWelcome } = require('../../services/verifiedWelcome');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    if (newMember.user.bot) return;

    const cfg = getGuildConfig(newMember.guild.id);
    const verifiedRoleId = cfg.verifiedRoleId;
    if (!verifiedRoleId || !cfg.verification?.welcomeChannelId) return;

    const hadRole = oldMember.roles.cache.has(verifiedRoleId);
    const hasRole = newMember.roles.cache.has(verifiedRoleId);
    if (hadRole || !hasRole) return;

    try {
      await sendVerifiedWelcome(newMember);
    } catch (err) {
      console.error(`[verified-welcome] ${newMember.guild.id}:`, err.message);
    }
  },
};
