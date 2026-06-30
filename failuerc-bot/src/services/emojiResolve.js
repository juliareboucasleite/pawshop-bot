function parseEmojiInput(input) {
  const trimmed = String(input || '').trim();
  const tagged = trimmed.match(/^<a?:(\w+):(\d+)>$/);
  if (tagged) {
    return {
      name: tagged[1],
      id: tagged[2],
      animated: trimmed.startsWith('<a:'),
      tagged: trimmed,
    };
  }

  const colon = trimmed.match(/^:([\w]+):$/);
  return { name: colon ? colon[1] : trimmed, id: null, animated: false, tagged: null };
}

function wcNumberFromName(name) {
  const wcUnderscore = name.match(/^WC_(\d+)$/i);
  if (wcUnderscore) return wcUnderscore[1];
  const wcPlain = name.match(/^WC(\d+)$/i);
  if (wcPlain) return wcPlain[1];
  const dot = name.match(/^(\d+)\.$/);
  if (dot) return dot[1];
  return null;
}

function lookupVariants(name) {
  const ordered = [name];
  const num = wcNumberFromName(name);

  if (num !== null) {
    ordered.push(`${num}.`, `WC${num}`, `WC_${num}`);
  }

  ordered.push(name.replace(/_/g, ''));
  if (/^WC_\d+$/i.test(name)) ordered.push(name.replace(/^WC_/i, 'WC'));
  if (/^WC_o\d+$/i.test(name)) ordered.push(name.replace(/^WC_o/i, 'WC'));

  return [...new Set(ordered)];
}

function findGuildEmoji(guild, name) {
  const num = wcNumberFromName(name);
  if (num !== null) {
    const byDot = guild.emojis.cache.find((e) => e.name === `${num}.`);
    if (byDot) return byDot;
  }

  for (const variant of lookupVariants(name)) {
    const exact = guild.emojis.cache.find((e) => e.name === variant);
    if (exact) return exact;
  }

  const lowerVariants = lookupVariants(name).map((v) => v.toLowerCase());
  return guild.emojis.cache.find((e) => lowerVariants.includes(e.name.toLowerCase())) || null;
}

function packResolved(custom) {
  const display = custom.animated
    ? `<a:${custom.name}:${custom.id}>`
    : `<:${custom.name}:${custom.id}>`;
  return {
    id: String(custom.id),
    name: custom.name,
    animated: custom.animated,
    display,
    react: custom.id,
    storeKey: String(custom.id),
  };
}

async function resolveEmojiForGuild(guild, input) {
  if (!input) return null;

  const parsed = parseEmojiInput(input);

  if (parsed.id) {
    return {
      id: parsed.id,
      name: parsed.name,
      animated: parsed.animated,
      display: parsed.tagged,
      react: parsed.id,
      storeKey: parsed.id,
    };
  }

  await guild.emojis.fetch().catch(() => null);

  const custom = findGuildEmoji(guild, parsed.name);
  if (custom) return packResolved(custom);

  return {
    name: parsed.name,
    display: `:${parsed.name}:`,
    react: parsed.name,
    storeKey: parsed.name,
    missing: true,
  };
}

module.exports = { resolveEmojiForGuild, lookupVariants, findGuildEmoji, wcNumberFromName };
