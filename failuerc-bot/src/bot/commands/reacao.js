const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const {
  addReactionRole,
  removeReactionRolesForMessage,
  getGuildConfig,
} = require('../../utils/store');
const { reactionRolePanel, errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { parseReactionInput } = require('../../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reacao')
    .setDescription('Reaction roles — cargo ao clicar na reação')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('painel')
        .setDescription('Cria uma mensagem de reaction roles')
        .addStringOption((opt) =>
          opt.setName('titulo').setDescription('Título do painel').setRequired(false),
        )
        .addStringOption((opt) =>
          opt.setName('descricao').setDescription('Descrição do painel').setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('adicionar')
        .setDescription('Adiciona reação + cargo a uma mensagem')
        .addStringOption((opt) =>
          opt.setName('mensagem_id').setDescription('ID da mensagem').setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName('reacao').setDescription('Reação (unicode ou <:nome:id>)').setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName('cargo').setDescription('Cargo a dar/remover').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('limpar')
        .setDescription('Remove todos os reaction roles de uma mensagem')
        .addStringOption((opt) =>
          opt.setName('mensagem_id').setDescription('ID da mensagem').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista reaction roles configurados'),
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Precisas de permissão de administrador.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'listar') {
      const cfg = getGuildConfig(interaction.guild.id);
      if (!cfg.reactionRoles.length) {
        return interaction.reply({ embeds: [infoEmbed('Reaction roles', 'Nenhum configurado.')], ephemeral: true });
      }
      const lines = cfg.reactionRoles.map(
        (r) => `• \`${r.emoji}\` → <@&${r.roleId}> · msg \`${r.messageId}\``,
      );
      return interaction.reply({ embeds: [infoEmbed('Reaction roles', lines.join('\n'))], ephemeral: true });
    }

    if (sub === 'painel') {
      const titulo = interaction.options.getString('titulo');
      const descricao = interaction.options.getString('descricao');
      const embed = new EmbedBuilder(reactionRolePanel(titulo, descricao));
      const msg = await interaction.channel.send({ embeds: [embed] });
      return interaction.reply({
        embeds: [successEmbed('Painel criado', `Usa \`/reacao adicionar mensagem_id:${msg.id}\` para cada reação.\n${msg.url}`)],
        ephemeral: true,
      });
    }

    if (sub === 'limpar') {
      const messageId = interaction.options.getString('mensagem_id');
      removeReactionRolesForMessage(interaction.guild.id, messageId);
      return interaction.reply({
        embeds: [successEmbed('Limpo', `Reaction roles da mensagem \`${messageId}\` removidos da config.`)],
        ephemeral: true,
      });
    }

    if (sub === 'adicionar') {
      const messageId = interaction.options.getString('mensagem_id');
      const reactionInput = interaction.options.getString('reacao');
      const role = interaction.options.getRole('cargo');
      const parsed = parseReactionInput(reactionInput);

      const channel = interaction.channel;
      let message;
      try {
        message = await channel.messages.fetch(messageId);
      } catch {
        return interaction.reply({
          embeds: [errorEmbed('Mensagem não encontrada neste canal. Usa o comando no canal certo ou fornece o ID correto.')],
          ephemeral: true,
        });
      }

      if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
          embeds: [errorEmbed('Não consigo gerir esse cargo — coloca o bot acima dele na hierarquia.')],
          ephemeral: true,
        });
      }

      try {
        await message.react(parsed.id ?? parsed.name);
      } catch (err) {
        return interaction.reply({
          embeds: [errorEmbed(`Não foi possível adicionar essa reação: ${err.message}`)],
          ephemeral: true,
        });
      }

      const reactionKey = parsed.id ?? parsed.name;
      addReactionRole(interaction.guild.id, {
        messageId: message.id,
        channelId: message.channel.id,
        emoji: reactionKey,
        roleId: role.id,
      });

      return interaction.reply({
        embeds: [successEmbed('Reaction role adicionada', `${reactionInput} → ${role}\nReagir dá o cargo; remover a reação tira o cargo.`)],
        ephemeral: true,
      });
    }
  },
};
