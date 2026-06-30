const { Events } = require('discord.js');
const { getGuildConfig } = require('../../utils/store');
const { sendWelcomeMessage } = require('../../services/welcomeMessage');
const { sendJoinDm } = require('../../services/joinDm');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const cfg = getGuildConfig(member.guild.id);
    if (cfg.autoroleIds?.length) {
      for (const roleId of cfg.autoroleIds) {
        const role = member.guild.roles.cache.get(roleId);
        if (!role) continue;
        if (role.managed || role.position >= member.guild.members.me.roles.highest.position) continue;
        try {
          await member.roles.add(role, 'Autorole Failuerc');
        } catch (err) {
          console.error(`[autorole] ${member.id} → ${roleId}:`, err.message);
        }
      }
    }

    try {
      await sendJoinDm(member);
    } catch (err) {
      console.error(`[join-dm] ${member.guild.id}:`, err.message);
    }

    try {
      await sendWelcomeMessage(member);
    } catch (err) {
      console.error(`[welcome] ${member.guild.id}:`, err.message);
    }
  },
};
