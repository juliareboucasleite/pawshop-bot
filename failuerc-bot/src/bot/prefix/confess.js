const { startConfess } = require('../../services/communityPosts');

module.exports = {
  name: 'confess',
  description: 'Publica uma confissão anónima',
  async execute(message) {
    await startConfess(message);
  },
};
