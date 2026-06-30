const { Events } = require('discord.js');
const { upsertFromGuild } = require('../../services/parceiros');

module.exports = {
  name: Events.GuildUpdate,
  execute(_oldGuild, newGuild) {
    upsertFromGuild(newGuild);
  },
};
