const { Events } = require('discord.js');
const { registerGuild } = require('../shared/registerGuild');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    try {
      await registerGuild(guild);
    } catch (err) {
      console.error(`[parceiros] guildCreate ${guild.id}:`, err.message);
    }
  },
};
