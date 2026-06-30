const fs = require('node:fs');
const path = require('node:path');
const config = require('../../config/default.json');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PARCEIROS_FILE = path.join(DATA_DIR, 'parceiros.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PARCEIROS_FILE)) {
    fs.writeFileSync(PARCEIROS_FILE, JSON.stringify({ guilds: {} }, null, 2), 'utf8');
  }
}

function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(PARCEIROS_FILE, 'utf8'));
}

function writeAll(data) {
  ensureFile();
  fs.writeFileSync(PARCEIROS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function guildIconUrl(guild) {
  if (guild.icon) {
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
  }
  const index = Number(BigInt(guild.id) % 5n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function upsertFromGuild(guild, extra = {}) {
  const data = readAll();
  const prev = data.guilds[guild.id] || {};

  data.guilds[guild.id] = {
    id: guild.id,
    name: guild.name,
    icon: guild.icon ?? null,
    iconUrl: guildIconUrl(guild),
    memberCount: guild.memberCount ?? prev.memberCount ?? 0,
    addedAt: prev.addedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inviteUrl: extra.inviteUrl ?? prev.inviteUrl ?? null,
  };

  writeAll(data);
  return data.guilds[guild.id];
}

function removeGuild(guildId) {
  const data = readAll();
  if (!data.guilds[guildId]) return false;
  delete data.guilds[guildId];
  writeAll(data);
  return true;
}

function listParceiros() {
  const min = config.parceiros?.minMembros ?? 0;
  const max = config.parceiros?.maxExibir ?? 48;

  return Object.values(readAll().guilds)
    .filter((g) => g.memberCount >= min)
    .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name))
    .slice(0, max);
}

function getStats() {
  const list = listParceiros();
  const totalMembers = list.reduce((sum, g) => sum + (g.memberCount || 0), 0);
  return { servidores: list.length, membros: totalMembers };
}

module.exports = {
  upsertFromGuild,
  removeGuild,
  listParceiros,
  getStats,
  guildIconUrl,
};
