const crypto = require('node:crypto');

function hashIp(ip) {
  if (!ip) return null;
  const salt = process.env.ALT_HASH_SALT || process.env.SESSION_SECRET || 'failuerc';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 24);
}

function checkAltAccount(member, cfg, ipHash) {
  const verification = cfg.verification || {};
  if (verification.blockAlts === false) {
    return { isAlt: false };
  }

  const minDays = Number(verification.minAccountAgeDays ?? 30);
  if (minDays > 0) {
    const ageMs = Date.now() - member.user.createdTimestamp;
    if (ageMs < minDays * 86_400_000) {
      const idadeMsg = minDays >= 30
        ? 'A tua conta Discord precisa de ter pelo menos 1 mês.'
        : `A tua conta Discord é demasiado recente. Idade mínima: ${minDays} dia(s).`;
      return {
        isAlt: true,
        reason: idadeMsg,
      };
    }
  }

  if (verification.requireAvatar && !member.user.avatar) {
    return {
      isAlt: true,
      reason: 'Precisas de ter foto de perfil no Discord para verificar.',
    };
  }

  if (!ipHash) return { isAlt: false };

  const registry = verification.registry || {};
  for (const [uid, entry] of Object.entries(registry)) {
    if (uid === member.id) continue;
    if (entry?.ipHash && entry.ipHash === ipHash) {
      return {
        isAlt: true,
        reason: 'Foi detetada uma conta alternativa (alt). Esta conta não pode verificar neste servidor.',
      };
    }
  }

  return { isAlt: false };
}

module.exports = { hashIp, checkAltAccount };
