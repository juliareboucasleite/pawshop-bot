const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const GUILDS_FILE = path.join(DATA_DIR, 'guilds.json');
const DEFAULT_RANK_TIERS = require('../../config/rank-tiers.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(GUILDS_FILE)) fs.writeFileSync(GUILDS_FILE, '{}', 'utf8');
}

function readGuilds() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(GUILDS_FILE, 'utf8'));
}

function writeGuilds(data) {
  ensureDataDir();
  fs.writeFileSync(GUILDS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function defaultGuildConfig() {
  return {
    verifiedRoleId: null,
    autoroleIds: [],
    ticketCategoryId: null,
    supportRoleIds: [],
    ticketCounter: 0,
    reactionRoles: [],
    verification: {
      enabled: true,
      channelId: null,
      messageId: null,
      logChannelId: null,
      waitingChannelId: null,
      staffChatChannelId: null,
      verifiedNotifyChannelId: null,
      waitingNotifyChannelId: null,
      welcomeChannelId: null,
      blockAlts: true,
      minAccountAgeDays: 30,
      requireAvatar: false,
      registry: {},
      openWaitingThreads: {},
    },
    community: {
      confissaoChannelId: null,
      desabafoChannelId: null,
      confissaoCounter: 0,
    },
    suggestions: {
      channelId: null,
      panelMessageId: null,
      counter: 0,
      posts: {},
    },
    tickets: {
      channelId: null,
      messageId: null,
      panelTitle: null,
      panelDescription: null,
      welcomeTitle: null,
      welcomeDescription: null,
    },
    commandChannels: {
      enabled: false,
      channelIds: [],
    },
    moderation: {
      logChannelId: null,
      warns: {},
      warnThreshold: 3,
      warnAutoAction: 'mute',
      warnAutoMinutes: 60,
    },
    antiSpam: {
      enabled: false,
      maxMessages: 5,
      windowSeconds: 5,
      duplicateLimit: 3,
      action: 'mute',
      muteMinutes: 10,
      exemptRoleIds: [],
    },
    faq: {
      channelId: null,
      messageId: null,
      panelId: 'default',
    },
    inviteBlocker: {
      enabled: false,
      action: 'delete',
      muteMinutes: 60,
      logChannelId: null,
      exemptRoleIds: [],
    },
    welcome: {
      enabled: false,
      channelId: null,
      message: 'Oiii! {usuario}, bom proveito do servidor! espero que goste.',
    },
    joinDm: {
      enabled: null,
      banAppealInvite: null,
    },
    customMessageDrafts: [],
    reactionRolePanels: {},
    fashion: {
      channelId: null,
      monthKey: null,
      votes: {},
      lastReportAt: null,
    },
    music: {
      channelId: null,
      panelMessageId: null,
      shareCounter: 0,
      users: {},
    },
    giveaways: {
      counter: 0,
      items: {},
    },
    ranking: {
      enabled: false,
      cooldownSeconds: 45,
      announceLevelUp: true,
      levelUpChannelId: null,
      tiers: DEFAULT_RANK_TIERS.map((t) => ({ ...t, roleId: null })),
      users: {},
    },
  };
}

function getGuildConfig(guildId) {
  const all = readGuilds();
  if (!all[guildId]) {
    all[guildId] = defaultGuildConfig();
    writeGuilds(all);
  }
  return all[guildId];
}

function setGuildConfig(guildId, patch) {
  const all = readGuilds();
  all[guildId] = { ...defaultGuildConfig(), ...all[guildId], ...patch };
  writeGuilds(all);
  return all[guildId];
}

function updateGuildConfig(guildId, updater) {
  const all = readGuilds();
  const current = { ...defaultGuildConfig(), ...all[guildId] };
  all[guildId] = updater(current);
  writeGuilds(all);
  return all[guildId];
}

function addReactionRole(guildId, entry) {
  return updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    reactionRoles: [...cfg.reactionRoles.filter((r) => !(r.messageId === entry.messageId && r.emoji === entry.emoji)), entry],
  }));
}

function removeReactionRolesForMessage(guildId, messageId) {
  return updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    reactionRoles: cfg.reactionRoles.filter((r) => r.messageId !== messageId),
  }));
}

function removeReactionRole(guildId, messageId, emoji) {
  return updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    reactionRoles: cfg.reactionRoles.filter(
      (r) => !(r.messageId === messageId && r.emoji === emoji),
    ),
  }));
}

function findReactionRole(guildId, messageId, emojiKey) {
  const cfg = getGuildConfig(guildId);
  return cfg.reactionRoles.find((r) => r.messageId === messageId && r.emoji === emojiKey);
}

function nextTicketNumber(guildId) {
  let num = 0;
  updateGuildConfig(guildId, (cfg) => {
    num = (cfg.ticketCounter || 0) + 1;
    return { ...cfg, ticketCounter: num };
  });
  return num;
}

function getOpenTickets(guildId) {
  const cfg = getGuildConfig(guildId);
  return cfg.openTickets || {};
}

function setOpenTicket(guildId, channelId, userId) {
  return updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    openTickets: { ...(cfg.openTickets || {}), [channelId]: userId },
  }));
}

function removeOpenTicket(guildId, channelId) {
  return updateGuildConfig(guildId, (cfg) => {
    const openTickets = { ...(cfg.openTickets || {}) };
    delete openTickets[channelId];
    return { ...cfg, openTickets };
  });
}

function userHasOpenTicket(guildId, userId) {
  const open = getOpenTickets(guildId);
  return Object.values(open).includes(userId);
}

function findTicketChannelByUser(guildId, userId) {
  const open = getOpenTickets(guildId);
  return Object.entries(open).find(([, uid]) => uid === userId)?.[0] ?? null;
}

function getTicketDetails(guildId, channelId) {
  const cfg = getGuildConfig(guildId);
  return cfg.ticketDetails?.[channelId] || null;
}

function setTicketDetails(guildId, channelId, details) {
  return updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    ticketDetails: {
      ...(cfg.ticketDetails || {}),
      [channelId]: details,
    },
  }));
}

function updateTicketDetails(guildId, channelId, patch) {
  return updateGuildConfig(guildId, (cfg) => {
    const current = cfg.ticketDetails?.[channelId] || {};
    return {
      ...cfg,
      ticketDetails: {
        ...(cfg.ticketDetails || {}),
        [channelId]: { ...current, ...patch },
      },
    };
  });
}

function removeTicketDetails(guildId, channelId) {
  return updateGuildConfig(guildId, (cfg) => {
    const ticketDetails = { ...(cfg.ticketDetails || {}) };
    delete ticketDetails[channelId];
    return { ...cfg, ticketDetails };
  });
}

function nextConfessionNumber(guildId) {
  let num = 0;
  updateGuildConfig(guildId, (cfg) => {
    num = (cfg.community?.confissaoCounter || 0) + 1;
    return {
      ...cfg,
      community: {
        ...cfg.community,
        confissaoCounter: num,
      },
    };
  });
  return num;
}

function nextGiveawayId(guildId) {
  let id = '';
  updateGuildConfig(guildId, (cfg) => {
    const num = (cfg.giveaways?.counter || 0) + 1;
    id = String(num);
    return {
      ...cfg,
      giveaways: {
        ...cfg.giveaways,
        counter: num,
        items: cfg.giveaways?.items || {},
      },
    };
  });
  return id;
}

module.exports = {
  getGuildConfig,
  setGuildConfig,
  updateGuildConfig,
  readGuilds,
  addReactionRole,
  removeReactionRolesForMessage,
  removeReactionRole,
  findReactionRole,
  nextTicketNumber,
  nextConfessionNumber,
  setOpenTicket,
  removeOpenTicket,
  userHasOpenTicket,
  findTicketChannelByUser,
  getTicketDetails,
  setTicketDetails,
  updateTicketDetails,
  removeTicketDetails,
  nextGiveawayId,
};
