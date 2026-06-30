const limpar = require('./limpar');

module.exports = {
  name: 'clear',
  description: 'Apaga mensagens do canal',
  moderatorOnly: true,
  aliases: ['purge', 'limpar', 'apagar', 'clean'],
  execute: limpar.execute,
};
