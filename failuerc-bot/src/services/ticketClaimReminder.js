const { EmbedBuilder } = require('discord.js');
const config = require('../../config/default.json');
const { readGuilds, updateTicketDetails } = require('../utils/store');

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

function getReminderMs(cfg) {
  const hours = cfg.tickets?.claimReminderHours ?? config.tickets.claimReminderHours ?? 32;
  return hours * 60 * 60 * 1000;
}

function getReminderChannelId(cfg) {
  return cfg.verification?.waitingNotifyChannelId
    || cfg.tickets?.claimReminderChannelId
    || config.tickets.claimReminderChannelId;
}

function supportMentions(cfg) {
  if (!cfg.supportRoleIds?.length) return '';
  return cfg.supportRoleIds.map((id) => `<@&${id}>`).join(' ');
}

function ticketNumberFromChannel(channelName, details) {
  if (details?.ticketNumber) return details.ticketNumber;
  const match = channelName?.match(/^ticket-(\d+)-/i);
  return match ? match[1] : '?';
}

async function sendClaimReminder(client, guildId, cfg, ticketChannelId, details) {
  const notifyChannelId = getReminderChannelId(cfg);
  if (!notifyChannelId) return;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const notifyChannel = await guild.channels.fetch(notifyChannelId).catch(() => null);
  if (!notifyChannel?.isTextBased()) return;

  const ticketChannel = await guild.channels.fetch(ticketChannelId).catch(() => null);
  if (!ticketChannel) {
    updateTicketDetails(guildId, ticketChannelId, { claimReminderSent: true });
    return;
  }

  const num = ticketNumberFromChannel(ticketChannel.name, details);
  const mentions = supportMentions(cfg);
  const text = `Oii? falta responder o ticket #${num}, vamos dar uma olhadinha?`;

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setDescription(`${text}\n\n**Ticket:** ${ticketChannel}`);

  try {
    await notifyChannel.send({
      content: mentions || undefined,
      embeds: [embed],
    });
    updateTicketDetails(guildId, ticketChannelId, { claimReminderSent: true });
  } catch (err) {
    console.error(`[ticket-reminder] ${guildId}/${ticketChannelId}:`, err.message);
  }
}

async function checkTicketClaimReminders(client) {
  let allGuilds;
  try {
    allGuilds = readGuilds();
  } catch {
    return;
  }

  const now = Date.now();

  for (const [guildId, cfg] of Object.entries(allGuilds)) {
    if (!getReminderChannelId(cfg)) continue;

    const openTickets = cfg.openTickets || {};
    const ticketDetails = cfg.ticketDetails || {};
    const reminderMs = getReminderMs(cfg);

    for (const channelId of Object.keys(openTickets)) {
      const details = ticketDetails[channelId];
      if (!details || details.claimedBy || details.claimReminderSent) continue;

      const openedAt = details.openedAt ? new Date(details.openedAt).getTime() : 0;
      if (!openedAt || now - openedAt < reminderMs) continue;

      await sendClaimReminder(client, guildId, cfg, channelId, details);
    }
  }
}

function startTicketClaimReminderScheduler(client) {
  const tick = () => {
    checkTicketClaimReminders(client).catch((err) => {
      console.error('[ticket-reminder]', err.message);
    });
  };

  tick();
  setInterval(tick, CHECK_INTERVAL_MS);
}

module.exports = {
  startTicketClaimReminderScheduler,
  checkTicketClaimReminders,
};
