const { Events } = require('discord.js');
const { handleReactionRole } = require('../../services/reactionRoleHandler');
const { handleFashionReaction } = require('../../services/fashionVotes');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    try {
      await handleFashionReaction(reaction, user, true);
    } catch (err) {
      console.error('[fashion] reaction add:', err);
    }
    await handleReactionRole(reaction, user, true);
  },
};
