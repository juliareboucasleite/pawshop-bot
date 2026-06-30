const { startConfess } = require('../../services/communityPosts');

module.exports = {
  name: 'confissao',
  description: 'Publica uma confissão anónima',
  async execute(message) {
    await startConfess(message);
  },
};
