require('dotenv').config();

const { createClient } = require('./src/bot/client');
const { createWebServer } = require('./src/web/server');

const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[failuerc] Variável ${key} em falta no .env`);
    process.exit(1);
  }
}

const client = createClient();

client.once('clientReady', () => {
  const porta = Number(process.env.PORT) || 3003;
  createWebServer(client).listen(porta, () => {
    console.log(`[web] Servidor em http://localhost:${porta}`);
  });
});

client.login(process.env.DISCORD_TOKEN);
