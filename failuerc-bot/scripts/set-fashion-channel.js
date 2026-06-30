const { updateGuildConfig } = require('../src/utils/store');

const GUILD_ID = '1519754892925731056';
const FASHION_CHANNEL_ID = '1519824987069091851';

updateGuildConfig(GUILD_ID, (cfg) => ({
  ...cfg,
  fashion: {
    ...cfg.fashion,
    channelId: FASHION_CHANNEL_ID,
    monthKey: cfg.fashion?.monthKey || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date()).slice(0, 7),
    votes: cfg.fashion?.votes || {},
  },
}));

console.log(`Fashion channel set to ${FASHION_CHANNEL_ID} for guild ${GUILD_ID}`);
