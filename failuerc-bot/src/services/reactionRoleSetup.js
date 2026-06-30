const { addReactionRole } = require('../utils/store');
const { parseReactionInput } = require('../utils/components');

async function findMessage(guild, messageId, preferredChannel) {
  if (preferredChannel?.isTextBased()) {
    try {
      return await preferredChannel.messages.fetch(messageId);
    } catch {
      // tenta outros canais
    }
  }

  for (const ch of guild.channels.cache.values()) {
    if (!ch.isTextBased?.()) continue;
    try {
      const msg = await ch.messages.fetch(messageId);
      if (msg) return msg;
    } catch {
      // continua
    }
  }

  return null;
}

function validateManagedRole(role, botMember) {
  if (!role) return { ok: false, error: 'Cargo não encontrado.' };
  if (role.managed) return { ok: false, error: 'Não posso gerir cargos de bots ou integrações.' };
  if (role.position >= botMember.roles.highest.position) {
    return { ok: false, error: 'Coloca o Failuerc acima desse cargo na hierarquia.' };
  }
  return { ok: true };
}

async function setupReactionRole(guild, messageId, reactionInput, role, { preferredChannel } = {}) {
  const botMember = guild.members.me;
  const roleCheck = validateManagedRole(role, botMember);
  if (!roleCheck.ok) return roleCheck;

  const parsed = parseReactionInput(reactionInput);
  if (!parsed.name && !parsed.id) {
    return { ok: false, error: 'Emoji inválido.' };
  }

  const message = await findMessage(guild, messageId, preferredChannel);
  if (!message) {
    return { ok: false, error: 'Mensagem não encontrada. Verifica o ID ou indica o canal: `f!rr add #canal ID emoji @cargo`.' };
  }

  try {
    await message.react(parsed.id ?? parsed.name);
  } catch (err) {
    return { ok: false, error: `Não consegui adicionar a reação: ${err.message}` };
  }

  const reactionKey = parsed.id ?? parsed.name;
  addReactionRole(guild.id, {
    messageId: message.id,
    channelId: message.channel.id,
    emoji: reactionKey,
    roleId: role.id,
  });

  return { ok: true, message, reactionInput, role, reactionKey };
}

module.exports = {
  findMessage,
  setupReactionRole,
  validateManagedRole,
};
