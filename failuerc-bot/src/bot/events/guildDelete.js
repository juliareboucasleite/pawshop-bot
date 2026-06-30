const { Events } = require('discord.js');
const { removeGuild, upsertFromGuild } = require('../../services/parceiros');

module.exports = {
  name: Events.GuildDelete,
  execute(guild) {
    if (removeGuild(guild.id)) {
      console.log(`[parceiros] - ${guild.name}`);
    }
  },
};
