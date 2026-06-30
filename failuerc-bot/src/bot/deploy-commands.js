require('dotenv').config();

const { registerSlashCommands } = require('./registerCommands');

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!process.env.DISCORD_TOKEN || !clientId) {
  console.error('[deploy] DISCORD_TOKEN e CLIENT_ID são obrigatórios.');
  process.exit(1);
}

registerSlashCommands({
  token: process.env.DISCORD_TOKEN,
  clientId,
  guildId,
}).catch((err) => {
  console.error('[deploy] Erro:', err);
  process.exit(1);
});
