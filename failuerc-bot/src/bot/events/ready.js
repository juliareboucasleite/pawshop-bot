const { Events } = require('discord.js');
const config = require('../../../config/default.json');
const { registerGuild } = require('../shared/registerGuild');
const { getStats } = require('../../services/parceiros');
const { registerSlashCommands } = require('../registerCommands');
const { startFashionMonthlyScheduler } = require('../../services/fashionVotes');
const { startPresenceRotator } = require('../../services/presenceRotator');
const { startTicketClaimReminderScheduler } = require('../../services/ticketClaimReminder');
const { startGiveawayScheduler } = require('../../services/giveaways');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[bot] ${client.user.tag} online — ${client.guilds.cache.size} servidor(es)`);

    try {
      await registerSlashCommands({
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID,
      });
    } catch (err) {
      console.error('[deploy] Falha ao registar slash commands:', err.message);
    }

    for (const guild of client.guilds.cache.values()) {
      try {
        await registerGuild(guild);
      } catch (err) {
        console.error(`[parceiros] sync ${guild.id}:`, err.message);
      }
    }

    const stats = getStats();
    console.log(`[bot] ${stats.servidores} servidor(es) na lista de parceiros`);

    startPresenceRotator(client);
    startFashionMonthlyScheduler(client);
    startTicketClaimReminderScheduler(client);
    startGiveawayScheduler(client);
  },
};
