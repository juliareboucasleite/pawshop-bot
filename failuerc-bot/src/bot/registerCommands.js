const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

function loadCommandJson() {
  const commandsPath = path.join(__dirname, 'commands');
  return fs.readdirSync(commandsPath)
    .filter((f) => f.endsWith('.js'))
    .map((file) => require(path.join(commandsPath, file)).data.toJSON());
}

async function registerSlashCommands({ token, clientId, guildId }) {
  const commands = loadCommandJson();
  const rest = new REST({ version: '10' }).setToken(token);

  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log(`[deploy] ${commands.length} slash commands globais registados.`);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    console.log(`[deploy] Comandos de guild ${guildId} limpos (usa apenas globais).`);
  }

  return commands.length;
}

module.exports = { registerSlashCommands, loadCommandJson };
