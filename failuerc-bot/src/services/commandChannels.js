const { getGuildConfig } = require('../utils/store');

function isCommandChannelAllowed(guildId, channelId) {
  const cfg = getGuildConfig(guildId);
  const cc = cfg.commandChannels;
  if (!cc?.enabled) return true;

  const ids = cc.channelIds || [];
  if (!ids.length) return false;
  return ids.includes(channelId);
}

module.exports = { isCommandChannelAllowed };
