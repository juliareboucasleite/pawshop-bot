const { sendPanelMessage } = require('./panelPublish');

const DISCORD_MAX = 2000;

function splitDiscordContent(text, max = DISCORD_MAX) {
  if (text.length <= max) return [text];

  const chunks = [];
  let rest = text;
  while (rest.length > max) {
    let splitAt = rest.lastIndexOf('\n\n', max);
    if (splitAt < max * 0.4) splitAt = rest.lastIndexOf('\n', max);
    if (splitAt < max * 0.4) splitAt = max;
    chunks.push(rest.slice(0, splitAt).trimEnd());
    rest = rest.slice(splitAt).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function sendCustomMessage(client, guildId, channelId, content) {
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) return { ok: false, error: 'Escreve uma mensagem antes de enviar.' };

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, error: 'Servidor não encontrado.' };

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    return { ok: false, error: 'Canal inválido ou inacessível pelo bot.' };
  }

  const chunks = splitDiscordContent(text);
  const messages = [];

  for (const chunk of chunks) {
    const sent = await sendPanelMessage(channel, guild, { content: chunk });
    if (!sent.ok) return sent;
    messages.push(sent.msg);
  }

  return {
    ok: true,
    url: messages[0].url,
    channelId: channel.id,
    messageIds: messages.map((m) => m.id),
    parts: messages.length,
  };
}

module.exports = { sendCustomMessage, splitDiscordContent };
