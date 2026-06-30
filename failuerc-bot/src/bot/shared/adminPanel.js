const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/store');
const { infoEmbed } = require('../../utils/embeds');
const config = require('../../../config/default.json');

function buildAdminPanelEmbed(guildId) {
  const cfg = getGuildConfig(guildId);
  const prefix = config.bot.prefix;

  const sections = [
    '**Verificação**',
    `• Cargo: ${cfg.verifiedRoleId ? `<@&${cfg.verifiedRoleId}>` : '—'}`,
    `• Painel: ${cfg.verification?.messageId ? 'ativo' : '—'}`,
    '',
    '**Tickets**',
    `• Categoria: ${cfg.ticketCategoryId ? `<#${cfg.ticketCategoryId}>` : '—'}`,
    `• Suporte: ${cfg.supportRoleIds?.length ? cfg.supportRoleIds.map((id) => `<@&${id}>`).join(', ') : '—'}`,
    '',
    '**Autorole**',
    `• ${cfg.autoroleIds?.length ? cfg.autoroleIds.map((id) => `<@&${id}>`).join(', ') : '—'}`,
    '',
    '**Reaction roles**',
    `• ${cfg.reactionRoles?.length || 0} entrada(s)`,
    '',
    '**Slash commands**',
    '`/verificacao configurar` · `/verificacao painel`',
    '`/tickets configurar` · `/tickets painel`',
    '`/autorole adicionar` · `/reacao painel` · `/reacao adicionar`',
    '',
    `**Prefixo \`${prefix}\`**`,
    `\`${prefix}help\` · \`${prefix}ping\` · \`${prefix}painel\``,
  ];

  return new EmbedBuilder(
    infoEmbed(`${config.bot.nome} — painel admin`, sections.join('\n')),
  );
}

module.exports = { buildAdminPanelEmbed };
