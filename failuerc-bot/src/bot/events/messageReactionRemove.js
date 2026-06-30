const { Events } = require('discord.js');
const { handleReactionRole } = require('../../services/reactionRoleHandler');
const { handleFashionReaction } = require('../../services/fashionVotes');

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    try {
      await handleFashionReaction(reaction, user, false);
    } catch (err) {
      console.error('[fashion] reaction remove:', err);
    }
    await handleReactionRole(reaction, user, false);
  },
};
