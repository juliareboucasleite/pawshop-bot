const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { updateGuildConfig, getGuildConfig } = require('../../utils/store');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Cargos automáticos ao entrar no servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('adicionar')
        .setDescription('Adiciona um cargo ao autorole')
        .addRoleOption((opt) => opt.setName('cargo').setDescription('Cargo a atribuir').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remover')
        .setDescription('Remove um cargo do autorole')
        .addRoleOption((opt) => opt.setName('cargo').setDescription('Cargo a remover').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista cargos de autorole'),
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const role = interaction.options.getRole('cargo');

    if (sub === 'listar') {
      const cfg = getGuildConfig(interaction.guild.id);
      const text = cfg.autoroleIds?.length
        ? cfg.autoroleIds.map((id) => `<@&${id}>`).join('\n')
        : 'Nenhum cargo configurado.';
      return interaction.reply({ embeds: [infoEmbed('Autorole', text)], ephemeral: true });
    }

    if (sub === 'adicionar') {
      updateGuildConfig(interaction.guild.id, (cfg) => {
        const ids = new Set(cfg.autoroleIds || []);
        ids.add(role.id);
        return { ...cfg, autoroleIds: [...ids] };
      });
      return interaction.reply({
        embeds: [successEmbed('Autorole atualizado', `${role} será dado a novos membros.`)],
        ephemeral: true,
      });
    }

    if (sub === 'remover') {
      updateGuildConfig(interaction.guild.id, (cfg) => ({
        ...cfg,
        autoroleIds: (cfg.autoroleIds || []).filter((id) => id !== role.id),
      }));
      return interaction.reply({
        embeds: [successEmbed('Autorole atualizado', `${role} removido do autorole.`)],
        ephemeral: true,
      });
    }
  },
};
