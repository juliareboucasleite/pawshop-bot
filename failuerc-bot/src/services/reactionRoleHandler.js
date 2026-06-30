const { getGuildConfig } = require('../utils/store');
const { emojiKey } = require('../utils/components');

async function ensureReaction(reaction) {
  if (!reaction.partial) return reaction;
  try {
    return await reaction.fetch();
  } catch {
    return null;
  }
}

async function applyExclusivePanelRoles(message, member, entry, userId) {
  if (!entry.exclusive || !entry.panelId) return;

  const cfg = getGuildConfig(message.guild.id);
  const siblings = cfg.reactionRoles.filter(
    (r) => r.messageId === message.id
      && r.panelId === entry.panelId
      && r.roleId !== entry.roleId,
  );

  for (const sibling of siblings) {
    const otherRole = message.guild.roles.cache.get(sibling.roleId);
    if (otherRole && member.roles.cache.has(sibling.roleId)) {
      await member.roles.remove(otherRole, 'Reaction role exclusiva Failuerc').catch(() => {});
    }
    const otherReaction = message.reactions.cache.find(
      (r) => String(r.emoji.id) === String(sibling.emoji) || r.emoji.name === sibling.emojiName,
    );
    if (otherReaction) {
      await otherReaction.users.remove(userId).catch(() => {});
    }
  }
}

async function handleReactionRole(reaction, user, add) {
  if (user.bot) return;

  const fullReaction = await ensureReaction(reaction);
  if (!fullReaction) return;

  const message = fullReaction.message;
  if (!message.guild) return;

  const key = String(emojiKey(fullReaction));
  const emojiName = fullReaction.emoji.name || '';
  const cfg = getGuildConfig(message.guild.id);
  const entry = cfg.reactionRoles.find(
    (r) => r.messageId === message.id
      && (String(r.emoji) === key || (r.emojiName && r.emojiName === emojiName)),
  );
  if (!entry) return;

  const member = await message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const role = message.guild.roles.cache.get(entry.roleId);
  if (!role) return;
  if (role.managed || role.position >= message.guild.members.me.roles.highest.position) return;

  try {
    if (add) {
      if (entry.exclusive) {
        await applyExclusivePanelRoles(message, member, entry, user.id);
      }
      await member.roles.add(role, 'Reaction role Failuerc');
    } else {
      await member.roles.remove(role, 'Reaction role removida Failuerc');
    }
  } catch (err) {
    console.error(`[reaction-role] ${user.tag}:`, err.message);
  }
}

module.exports = { handleReactionRole };
