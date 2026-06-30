const { startCommunityPost } = require('../../services/communityPosts');

module.exports = {
  name: 'desabafo',
  description: 'Publica um desabafo anónimo ou com o teu nick',
  async execute(message) {
    await startCommunityPost(message, 'desabafo');
  },
};
