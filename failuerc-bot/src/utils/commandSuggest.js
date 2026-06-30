const config = require('../../config/default.json');

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function getUniqueCommandNames(prefixCommands) {
  const seen = new Set();
  const names = [];
  for (const [name, cmd] of prefixCommands) {
    if (cmd.name !== name) continue;
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

function findClosestCommand(input, commandNames) {
  if (!input || !commandNames.length) return null;

  const lower = input.toLowerCase();
  const exactStart = commandNames.find((n) => n.startsWith(lower));
  if (exactStart) return exactStart;

  let best = null;
  let bestDist = Infinity;
  for (const name of commandNames) {
    const dist = levenshtein(lower, name);
    const maxAllowed = name.length <= 4 ? 2 : 3;
    if (dist < bestDist && dist <= maxAllowed) {
      bestDist = dist;
      best = name;
    }
  }
  return best;
}

function parseAnyPrefixedCommand(content) {
  const trimmed = content.trim();
  const match = trimmed.match(/^([^\s]{1,4}!)\s*(\S+)?/);
  if (!match) return null;
  return {
    userPrefix: match[1],
    cmdName: (match[2] || '').toLowerCase(),
    hasCommand: Boolean(match[2]),
  };
}

function buildSuggestedCommand(cmdName, prefix = config.bot.prefix) {
  return `${prefix}${cmdName}`;
}

function isWrongPrefix(userPrefix) {
  return userPrefix.toLowerCase() !== config.bot.prefix.toLowerCase();
}

module.exports = {
  getUniqueCommandNames,
  findClosestCommand,
  parseAnyPrefixedCommand,
  buildSuggestedCommand,
  isWrongPrefix,
};
