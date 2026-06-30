const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { setGuildConfig, getGuildConfig, updateGuildConfig } = require('../../utils/store');
const { verificationPanel, errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { verifyButton } = require('../../utils/components');
const { buildVerifyUrl } = require('../../utils/urls');
const { parseChannelArg, parseRoleArg } = require('../../utils/prefixArgs');
const config = require('../../../config/default.json');

module.exports = {
  name: 'verificacao',
  description: 'Painel e configuração de verificação',
  adminOnly: true,
  async execute(message, args) {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')] });
    }

    const sub = (args[0] || 'info').toLowerCase();
    const p = config.bot.prefix;

    if (sub === 'info' || sub === 'ajuda') {
      const cfg = getGuildConfig(message.guild.id);
      const lines = [
        `**Cargo verificado:** ${cfg.verifiedRoleId ? `<@&${cfg.verifiedRoleId}>` : '— não definido —'}`,
        `**Painel:** ${cfg.verification?.messageId ? `<#${cfg.verification.channelId}>` : '— não publicado —'}`,
        `**Verificadas (log):** ${cfg.verification?.logChannelId ? `<#${cfg.verification.logChannelId}>` : '—'}`,
        `**Waiting-verificação:** ${cfg.verification?.waitingChannelId ? `<#${cfg.verification.waitingChannelId}>` : '—'}`,
        `**Notif. verificados:** ${cfg.verification?.verifiedNotifyChannelId ? `<#${cfg.verification.verifiedNotifyChannelId}>` : '—'}`,
        `**Notif. aguardando:** ${cfg.verification?.waitingNotifyChannelId ? `<#${cfg.verification.waitingNotifyChannelId}>` : '—'}`,
        `**Welcome verificados:** ${cfg.verification?.welcomeChannelId ? `<#${cfg.verification.welcomeChannelId}>` : '—'}`,
        '',
        `**Comandos:**`,
        `\`${p}verificacao cargo @cargo\` — define cargo verificado`,
        `\`${p}verificacao painel\` — publica painel neste canal`,
        `\`${p}verificacao notificacoes #verificados #aguardando\``,
        `\`${p}verificacao welcome #canal\` — boas-vindas ao verificar`,
      ];
      return message.reply({ embeds: [new EmbedBuilder(infoEmbed('Verificação', lines.join('\n')))] });
    }

    if (sub === 'cargo' || sub === 'configurar') {
      const role = parseRoleArg(args[1], message.guild);
      if (!role) {
        return message.reply({
          embeds: [errorEmbed(`Indica o cargo. Ex: \`${p}verificacao cargo @Verificado\``)],
        });
      }

      setGuildConfig(message.guild.id, { verifiedRoleId: role.id });
      return message.reply({
        embeds: [successEmbed('Verificação configurada', `Cargo de verificado: ${role}`)],
      });
    }

    if (sub === 'notificacoes' || sub === 'notificações') {
      const verificados = parseChannelArg(args[1], message.guild);
      const aguardando = parseChannelArg(args[2], message.guild);

      if (!verificados && !aguardando) {
        return message.reply({
          embeds: [errorEmbed(`Indica pelo menos um canal.\nEx: \`${p}verificacao notificacoes #verificados #aguardando\``)],
        });
      }

      updateGuildConfig(message.guild.id, (cfg) => ({
        ...cfg,
        verification: {
          ...cfg.verification,
          verifiedNotifyChannelId: verificados?.id || cfg.verification?.verifiedNotifyChannelId || null,
          waitingNotifyChannelId: aguardando?.id || cfg.verification?.waitingNotifyChannelId || null,
        },
      }));

      const parts = [];
      if (verificados) parts.push(`Verificados → ${verificados}`);
      if (aguardando) parts.push(`Aguardando → ${aguardando}`);

      return message.reply({
        embeds: [successEmbed('Notificações configuradas', parts.join('\n'))],
      });
    }

    if (sub === 'welcome' || sub === 'boasvindas') {
      const channel = parseChannelArg(args[1], message.guild) || message.channel;

      updateGuildConfig(message.guild.id, (cfg) => ({
        ...cfg,
        verification: {
          ...cfg.verification,
          welcomeChannelId: channel.id,
        },
      }));

      return message.reply({
        embeds: [successEmbed('Welcome configurado', `Boas-vindas de verificados → ${channel}`)],
      });
    }

    if (sub === 'painel') {
      const cfg = getGuildConfig(message.guild.id);
      if (!cfg.verifiedRoleId) {
        return message.reply({
          embeds: [errorEmbed(`Configura primeiro o cargo com \`${p}verificacao cargo @cargo\`.`)],
        });
      }

      const verifyUrl = buildVerifyUrl(message.guild.id);
      const embed = new EmbedBuilder(verificationPanel(message.guild.name, verifyUrl));
      const msg = await message.channel.send({
        embeds: [embed],
        components: [verifyButton(verifyUrl)],
      });

      setGuildConfig(message.guild.id, {
        verification: { ...cfg.verification, channelId: msg.channel.id, messageId: msg.id },
      });

      return message.reply({
        embeds: [successEmbed('Painel publicado', `Verificação ativa em ${msg.url}`)],
      });
    }

    return message.reply({
      embeds: [errorEmbed(`Subcomando desconhecido. Usa \`${p}verificacao info\`.`)],
    });
  },
};
