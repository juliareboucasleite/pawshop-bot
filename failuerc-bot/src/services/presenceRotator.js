const { ActivityType } = require('discord.js');
const config = require('../../config/default.json');

const ROTATION_MS = 45 * 1000;

function getRotatingActivities() {
  const p = config.bot.prefix;
  return [
    {
      type: ActivityType.Custom,
      name: 'Custom Status',
      state: 'Feito por @Failuerc',
    },
    {
      type: ActivityType.Watching,
      name: 'Estou aqui pra te ajudar',
    },
    {
      type: ActivityType.Playing,
      name: `Use ${p}help`,
    },
    {
      type: ActivityType.Custom,
      name: 'Custom Status',
      state: 'Cuidando da /Chill Community ♡',
    },
    {
      type: ActivityType.Listening,
      name: 'as vossas músicas favoritas',
    },
    {
      type: ActivityType.Watching,
      name: 'a comunidade crescer ✿',
    },
    {
      type: ActivityType.Custom,
      name: 'Custom Status',
      state: `Precisas de ajuda? ${p}help`,
    },
    {
      type: ActivityType.Playing,
      name: 'a deixar tudo organizadinho',
    },
    {
      type: ActivityType.Custom,
      name: 'Custom Status',
      state: 'Sê sempre gentil com todas ♡',
    },
    {
      type: ActivityType.Watching,
      name: 'quem partilha músicas novas',
    },
    {
      type: ActivityType.Watching,
      name: 'convites suspeitos 🚫',
    },
    {
      type: ActivityType.Playing,
      name: `${p}mod`,
    },
  ];
}

function applyRotatingPresence(client, index = 0) {
  const activities = getRotatingActivities();
  const activity = activities[index % activities.length];

  try {
    client.user.setPresence({
      activities: [activity],
      status: 'online',
    });
  } catch (err) {
    console.error('[presence]', err.message);
  }
}

function startPresenceRotator(client) {
  let index = 0;
  applyRotatingPresence(client, index);

  setInterval(() => {
    index = (index + 1) % getRotatingActivities().length;
    applyRotatingPresence(client, index);
  }, ROTATION_MS);
}

module.exports = {
  startPresenceRotator,
  getRotatingActivities,
};
