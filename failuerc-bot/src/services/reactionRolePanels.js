const { EmbedBuilder } = require('discord.js');
const panelDefaults = require('../../config/reaction-panels.json');
const { resolveEmojiForGuild, wcNumberFromName } = require('./emojiResolve');
const {
  getGuildConfig,
  updateGuildConfig,
  addReactionRole,
  removeReactionRolesForMessage,
} = require('../utils/store');
const { sendPanelMessage } = require('./panelPublish');

const PANEL_KEYS = Object.keys(panelDefaults.panels);

function defaultPanelState(key) {
  const base = panelDefaults.panels[key];
  if (!base) return null;
  return {
    title: base.title,
    description: base.description,
    exclusive: base.exclusive,
    channelId: null,
    messageId: null,
    entries: base.entries.map((e) => ({
      emoji: e.emoji,
      label: e.label,
      roleId: null,
    })),
  };
}

function emojiAliasKeys(emoji) {
  const name = String(emoji || '').replace(/^:|:$/g, '');
  const keys = new Set([emoji, name, `:${name}:`]);
  keys.add(name.replace(/_/g, ''));
  keys.add(`:${name.replace(/_/g, '')}:`);
  if (/^WC_\d+$/i.test(name)) keys.add(`:${name.replace(/^WC_/i, 'WC')}:`);
  if (/^WC\d+$/i.test(name)) keys.add(`:${name.replace(/^WC/i, 'WC_')}:`);
  return [...keys];
}

function mergePanelConfig(saved, key) {
  const def = defaultPanelState(key);
  if (!saved) return def;

  const savedByEmoji = {};
  for (const entry of saved.entries || []) {
    for (const alias of emojiAliasKeys(entry.emoji)) {
      if (!savedByEmoji[alias]) savedByEmoji[alias] = entry;
    }
  }

  const mergedEntries = def.entries.map((e) => {
    const prev = savedByEmoji[e.emoji]
      || emojiAliasKeys(e.emoji).map((k) => savedByEmoji[k]).find(Boolean);
    return {
      emoji: e.emoji,
      label: prev?.label || e.label,
      roleId: prev?.roleId || null,
    };
  });

  return {
    title: saved.title || def.title,
    description: saved.description || def.description,
    exclusive: saved.exclusive ?? def.exclusive,
    channelId: saved.channelId || null,
    messageId: saved.messageId || null,
    entries: mergedEntries,
  };
}

function getReactionPanelsConfig(guildId) {
  const cfg = getGuildConfig(guildId);
  const saved = cfg.reactionRolePanels || {};
  const panels = {};
  for (const key of PANEL_KEYS) {
    panels[key] = mergePanelConfig(saved[key], key);
  }
  return panels;
}

async function formatPanelText(guild, text) {
  if (!text) return text;
  let out = text;
  const matches = [...text.matchAll(/:([\w]+):/g)];
  for (const match of matches) {
    const resolved = await resolveEmojiForGuild(guild, match[0]);
    if (resolved?.id) {
      out = out.split(match[0]).join(resolved.display);
    }
  }
  return out;
}

function entrySortKey(entry) {
  const name = String(entry.emoji || '').replace(/^:|:$/g, '');
  const num = wcNumberFromName(name);
  if (num !== null) return Number(num);
  return 9999;
}

function sortPanelEntries(entries) {
  return [...entries].sort((a, b) => {
    const diff = entrySortKey(a) - entrySortKey(b);
    if (diff !== 0) return diff;
    return String(a.label || '').localeCompare(String(b.label || ''));
  });
}

async function resolvePanelEntries(guild, entries) {
  const sorted = sortPanelEntries(entries);
  const resolved = [];
  const seenEmojiIds = new Set();
  const errors = [];

  for (const entry of sorted) {
    const emoji = await resolveEmojiForGuild(guild, entry.emoji);
    if (!emoji?.id) {
      errors.push(`${entry.label} (${entry.emoji}): emoji não encontrado`);
      continue;
    }
    if (seenEmojiIds.has(emoji.id)) {
      errors.push(`${entry.label} (${entry.emoji}): emoji duplicado — usa um emoji diferente`);
      continue;
    }
    seenEmojiIds.add(emoji.id);
    resolved.push({ entry, emoji });
  }

  return { resolved, errors };
}

async function buildPanelDescription(guild, resolvedEntries) {
  const lines = [];
  for (const { entry, emoji } of resolvedEntries) {
    const roleMention = `<@&${entry.roleId}>`;
    lines.push(`${emoji.display} ${roleMention} — **${entry.label}**`);
  }
  return lines;
}

function validateRole(guild, roleId) {
  const role = guild.roles.cache.get(roleId);
  if (!role) return { ok: false, error: 'Cargo não encontrado.' };
  if (role.managed) return { ok: false, error: `O cargo ${role.name} é gerido por integração.` };
  if (role.position >= guild.members.me.roles.highest.position) {
    return { ok: false, error: `Coloca o Failuerc acima do cargo ${role.name}.` };
  }
  return { ok: true, role };
}

async function publishReactionRolePanel(client, guildId, channelId, panelKey) {
  if (!PANEL_KEYS.includes(panelKey)) {
    return { ok: false, error: 'Painel inválido.' };
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, error: 'Servidor não encontrado.' };

  await guild.roles.fetch().catch(() => null);
  await guild.emojis.fetch().catch(() => null);

  const panels = getReactionPanelsConfig(guildId);
  const panel = panels[panelKey];
  const activeEntries = sortPanelEntries(panel.entries.filter((e) => e.roleId && e.emoji));

  if (!activeEntries.length) {
    return { ok: false, error: 'Associa pelo menos um emoji a um cargo antes de publicar.' };
  }

  for (const entry of activeEntries) {
    const check = validateRole(guild, entry.roleId);
    if (!check.ok) return check;
  }

  const { resolved: resolvedEntries, errors: resolveErrors } = await resolvePanelEntries(guild, activeEntries);
  if (!resolvedEntries.length) {
    return { ok: false, error: resolveErrors.join('; ') || 'Nenhum emoji válido.' };
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    return { ok: false, error: 'Canal inválido ou inacessível pelo bot.' };
  }

  if (panel.messageId) {
    removeReactionRolesForMessage(guildId, panel.messageId);
  }

  const intro = await formatPanelText(guild, panel.description);
  const lines = await buildPanelDescription(guild, resolvedEntries);
  const description = lines.length ? `${intro}\n\n${lines.join('\n')}` : intro;

  const sent = await sendPanelMessage(channel, guild, {
    embeds: [new EmbedBuilder({
      color: parseInt(require('../../config/default.json').bot.cor.replace('#', ''), 16),
      title: await formatPanelText(guild, panel.title),
      description,
      footer: { text: '♡ Reage para receber · tira a reação para remover' },
    })],
  });
  if (!sent.ok) return sent;

  const message = sent.msg;
  const errors = [...resolveErrors];

  for (const { entry, emoji } of resolvedEntries) {
    try {
      await message.react(emoji.react);
      addReactionRole(guildId, {
        messageId: message.id,
        channelId: message.channel.id,
        emoji: emoji.storeKey,
        emojiName: emoji.name,
        roleId: entry.roleId,
        panelId: panelKey,
        exclusive: Boolean(panel.exclusive),
        sortOrder: entrySortKey(entry),
      });
    } catch (err) {
      errors.push(`${entry.label} (${entry.emoji}): ${err.message}`);
    }
  }

  updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    reactionRolePanels: {
      ...(cfg.reactionRolePanels || {}),
      [panelKey]: {
        ...panel,
        channelId: message.channel.id,
        messageId: message.id,
      },
    },
  }));

  if (errors.length) {
    return {
      ok: true,
      url: message.url,
      messageId: message.id,
      channelId: message.channel.id,
      warning: `Painel publicado, mas algumas reações falharam: ${errors.join('; ')}`,
    };
  }

  return {
    ok: true,
    url: message.url,
    messageId: message.id,
    channelId: message.channel.id,
  };
}

function saveReactionPanel(guildId, panelKey, data) {
  if (!PANEL_KEYS.includes(panelKey)) return null;
  const current = getReactionPanelsConfig(guildId)[panelKey];

  updateGuildConfig(guildId, (cfg) => ({
    ...cfg,
    reactionRolePanels: {
      ...(cfg.reactionRolePanels || {}),
      [panelKey]: {
        ...current,
        title: data.title ?? current.title,
        description: data.description ?? current.description,
        exclusive: data.exclusive ?? current.exclusive,
        entries: Array.isArray(data.entries)
          ? data.entries.map((e) => ({
            emoji: e.emoji,
            label: e.label || e.emoji,
            roleId: e.roleId || null,
          }))
          : current.entries,
      },
    },
  }));

  return getReactionPanelsConfig(guildId)[panelKey];
}

module.exports = {
  PANEL_KEYS,
  defaultPanelState,
  getReactionPanelsConfig,
  publishReactionRolePanel,
  saveReactionPanel,
};
