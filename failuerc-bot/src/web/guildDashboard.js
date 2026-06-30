const config = require('../../config/default.json');
const painelMenu = require('../../config/painel-menu.json');
const commandsCatalog = require('../../config/commands.json');
const { escapeHtml, wrapPage } = require('./layout');
const { dashboardIcon } = require('./dashboardIcons');
const {
  verificationForm,
  ticketsForm,
  autoroleForm,
  reactionRolesForm,
  panelsForm,
  commandChannelsForm,
  inviteBlockerForm,
  welcomeForm,
  customMessageForm,
} = require('./guildForms');

function guildSectionUrl(basePath, guildId, sectionId) {
  return `${basePath}/painel/guild/${guildId}/${sectionId}`;
}

function renderBadge(badge) {
  if (!badge) return '';
  return `<span class="guild-sidebar__badge">${escapeHtml(badge)}</span>`;
}

function renderGuildSidebar(basePath, guild, user, activeSection) {
  const sections = painelMenu.secoes.map((group) => {
    const heading = group.titulo
      ? `<p class="guild-sidebar__group">${escapeHtml(group.titulo)}</p>`
      : '';
    const links = group.itens.map((item) => {
      const isActive = item.id === activeSection;
      return `<a class="guild-sidebar__link${isActive ? ' is-active' : ''}" href="${escapeHtml(guildSectionUrl(basePath, guild.id, item.id))}">
        <span class="guild-sidebar__icon">${dashboardIcon(item.icon)}</span>
        <span class="guild-sidebar__label">${escapeHtml(item.label)}</span>
        ${renderBadge(item.badge)}
      </a>`;
    }).join('');
    return `${heading}<div class="guild-sidebar__group-links">${links}</div>`;
  }).join('');

  return `
  <aside class="guild-sidebar">
    <div class="guild-sidebar__head">
      <img class="guild-sidebar__guild-icon" src="${escapeHtml(guild.iconUrl)}" alt="" width="72" height="72">
      <h2 class="guild-sidebar__guild-name">${escapeHtml(guild.name)}</h2>
      <a class="guild-sidebar__back" href="${basePath}/painel">&lt; Voltar ao Painel de Utilizador</a>
    </div>
    <nav class="guild-sidebar__nav">${sections}</nav>
    <div class="guild-sidebar__foot">
      <div class="guild-sidebar__user">
        <img src="${escapeHtml(user.avatarUrl)}" alt="" width="32" height="32">
        <div>
          <strong>${escapeHtml(user.username)}</strong>
          <span>@${escapeHtml(config.bot.nome.toLowerCase())}</span>
        </div>
      </div>
      <a class="guild-sidebar__logout" href="${basePath}/logout">Sair</a>
    </div>
  </aside>`;
}

function panel(title, body) {
  return `
  <section class="guild-panel">
    <header class="guild-panel__header">
      <h1 class="guild-panel__title">${escapeHtml(title)}</h1>
    </header>
    <div class="guild-panel__body">${body}</div>
  </section>`;
}

function statCards(items) {
  return `<div class="guild-stats">${items.map((s) => `
    <article class="guild-stat">
      <span class="guild-stat__value">${escapeHtml(String(s.value))}</span>
      <span class="guild-stat__label">${escapeHtml(s.label)}</span>
    </article>`).join('')}</div>`;
}

function configRow(label, value) {
  return `<div class="guild-config-row"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
}

function cmdList(items) {
  return `<ul class="guild-cmd-list">${items.map((c) => `<li><code>${escapeHtml(c)}</code></li>`).join('')}</ul>`;
}

function renderComingSoon(title, desc, discordCmd) {
  const cmd = discordCmd
    ? `<p class="guild-panel__hint">Por agora, configura no Discord: <code>${escapeHtml(discordCmd)}</code></p>`
    : '<p class="guild-panel__hint">Esta funcionalidade ainda não está disponível no Failuerc.</p>';
  return panel(title, `
    <p class="guild-panel__intro">${escapeHtml(desc)}</p>
    <div class="guild-soon">Em breve</div>
    ${cmd}`);
}

function renderSectionContent(sectionId, data, basePath, clientId) {
  const { stats, labels, prefix, cfg } = data;

  switch (sectionId) {
    case 'visao-geral':
      return panel('Visão geral', `
        <p class="guild-panel__intro">Resumo da configuração do Failuerc em <strong>${escapeHtml(data.name)}</strong>.</p>
        ${statCards([
          { label: 'Membros', value: data.memberCount },
          { label: 'Autoroles', value: stats.autoroles },
          { label: 'Reaction roles', value: stats.reactionRoles },
          { label: 'Tickets abertos', value: stats.openTickets },
        ])}
        <div class="guild-config-block">
          <h2>Estado rápido</h2>
          ${configRow('Verificação OAuth', stats.verificationActive ? 'Painel ativo' : 'Não publicado')}
          ${configRow('Tickets', stats.ticketsActive ? 'Painel ativo' : 'Não publicado')}
          ${configRow('Cargo verificado', labels.verifiedRole)}
          ${configRow('Categoria de tickets', labels.ticketCategory)}
        </div>
        <p class="guild-panel__hint">Configura tudo aqui no site — cada secção à esquerda tem formulários completos.</p>`);

    case 'premium-servidor':
      return panel('Premium para Servidores', `
        <p class="guild-panel__intro">O Failuerc é gratuito — não existe premium por servidor. Todas as funcionalidades estão incluídas.</p>
        <ul class="guild-feature-list">
          <li>Verificação OAuth pelo site</li>
          <li>Sistema de tickets</li>
          <li>Autorole e reaction roles</li>
          <li>Painéis configuráveis no Discord</li>
        </ul>`);

    case 'auditoria':
      return renderComingSoon('Registro de Auditoria', 'Histórico de alterações feitas no painel e nos módulos do bot.');

    case 'parceiros':
      return panel('Failuerc Partners', `
        <p class="guild-panel__intro">Ao adicionares o Failuerc, o teu servidor aparece automaticamente na página de parceiros em reboucas.me/failuerc.</p>
        <div class="guild-soon guild-soon--ok">Ativo neste servidor</div>
        <p class="guild-panel__hint"><a class="wiki-link" href="${basePath}/#parceiros">Ver parceiros no site</a></p>`);

    case 'comandos-slash':
      return panel('Comandos do Failuerc', `
        <p class="guild-panel__intro">Slash commands disponíveis neste servidor.</p>
        ${cmdList(commandsCatalog.comandos.filter((c) => c.nome.startsWith('/')).map((c) => c.nome))}
        <p class="guild-panel__hint"><a class="wiki-link" href="${basePath}/comandos">Ver documentação completa</a></p>`);

    case 'comandos-prefixo':
      return panel('Comandos por Prefixo', `
        <p class="guild-panel__intro">Prefixo configurado: <code>${escapeHtml(prefix)}</code></p>
        ${cmdList([`${prefix}help`, `${prefix}ping`, `${prefix}painel`, `${prefix}configurator`])}
        <p class="guild-panel__hint">Usa estes comandos nos canais permitidos. Configura restrições em <a class="wiki-link" href="${basePath}/painel/guild/${data.id}/canais-comandos">Canais de Comandos</a>.</p>`);

    case 'canais-comandos':
      return panel('Canais de Comandos', commandChannelsForm());

    case 'comandos-custom':
      return panel('Mensagens Personalizadas', customMessageForm());

    case 'entrada-saida':
      return panel('Mensagens de Entrada', welcomeForm());

    case 'autorole':
      return panel('Autorole', `
        <p class="guild-panel__intro">Cargos dados automaticamente quando alguém entra no servidor.</p>
        ${autoroleForm()}`);

    case 'contador-membros':
      return renderComingSoon('Contador de Membros', 'Canal com contagem de membros atualizada automaticamente.');

    case 'permissoes':
      return panel('Permissões', `
        <p class="guild-panel__intro">O Failuerc usa permissões de administrador no Discord para ver canais, cargos e publicar painéis em qualquer sítio do servidor.</p>
        <ul class="guild-feature-list">
          <li>Gerir Cargos — verificação, autorole e reaction roles</li>
          <li>Gerir Canais — criar tickets</li>
          <li>Gerir Mensagens — painéis e moderação</li>
          <li>Criar threads privadas — logs de verificação</li>
        </ul>
        <p class="guild-panel__hint">Configura tudo no site em Verificação, Tickets, Autorole e Reaction Roles. O cargo do bot deve estar acima dos cargos que ele atribui.</p>`);

    case 'verificacao':
      return panel('Verificação OAuth', `
        <p class="guild-panel__intro">Configura a verificação pelo site e publica o painel no Discord.</p>
        <div class="guild-config-block guild-config-block--compact">
          ${configRow('Estado do painel', stats.verificationActive ? 'Publicado' : 'Não publicado')}
          ${configRow('Canal do painel', labels.verificationChannel)}
          ${configRow('Verificadas (log)', labels.verificationLog)}
          ${configRow('Waiting-verificação', labels.verificationWaiting)}
          ${configRow('Chat-tickets (staff)', labels.verificationStaffChat)}
        </div>
        ${verificationForm()}`);

    case 'tickets':
      return panel('Tickets de Suporte', `
        <p class="guild-panel__intro">Define categoria, equipa de suporte e mensagens. Publica o painel no canal desejado.</p>
        <div class="guild-config-block guild-config-block--compact">
          ${configRow('Tickets abertos', String(stats.openTickets))}
          ${configRow('Estado do painel', stats.ticketsActive ? 'Publicado' : 'Não publicado')}
        </div>
        ${ticketsForm()}`);

    case 'moderacao-manual':
      return panel('Moderação Manual', `
        <p class="guild-panel__intro">Ferramentas de moderação disponíveis no Failuerc.</p>
        ${cmdList(['/moderacao verificar', '/moderacao fechar-ticket', `${prefix}painel`])}`);

    case 'bloqueador-convites':
      return panel('Bloqueador de Convites', inviteBlockerForm());

    case 'canais-armadilha':
      return renderComingSoon('Canais de Armadilha', 'Canal isca para apanhar bots e spam.');

    case 'registro-punicoes':
      return renderComingSoon('Registro de Punições', 'Log de bans, kicks, mutes e avisos.');

    case 'punicoes-avisos':
      return renderComingSoon('Punições de Avisos', 'Sistema de avisos acumulados com punições automáticas.');

    case 'motivos-punicao':
      return renderComingSoon('Motivos de Punição', 'Motivos predefinidos para punições.');

    case 'registro-eventos':
      return renderComingSoon('Registro de Eventos', 'Log de eventos importantes no servidor.');

    case 'recompensas-xp':
    case 'bonus-xp':
    case 'bloqueios-xp':
    case 'level-up':
    case 'resetar-xp':
      return renderComingSoon(
        painelMenu.secoes.flatMap((g) => g.itens).find((i) => i.id === sectionId)?.label || 'Experiência',
        'Sistema de XP e níveis — não disponível no Failuerc.',
      );

    case 'youtube':
    case 'twitch':
    case 'bluesky':
      return renderComingSoon(
        painelMenu.secoes.flatMap((g) => g.itens).find((i) => i.id === sectionId)?.label || 'Alertas',
        'Notificações de redes sociais — não disponível no Failuerc.',
      );

    case 'reaction-roles':
      return panel('Reaction Roles', `
        <p class="guild-panel__intro">Membros reagem a uma mensagem para receber ou remover cargos.</p>
        <div class="guild-config-block guild-config-block--compact">
          ${configRow('Entradas', String(stats.reactionRoles))}
        </div>
        ${reactionRolesForm()}`);

    case 'starboard':
    case 'sorteios':
      return renderComingSoon(
        painelMenu.secoes.flatMap((g) => g.itens).find((i) => i.id === sectionId)?.label || 'Diversão',
        'Funcionalidade de diversão — não disponível no Failuerc.',
      );

    case 'painel-discord':
      return panel('Painéis no Discord', panelsForm());

    case 'parceiros-site':
      return panel('Listagem no Site', `
        <p class="guild-panel__intro">Este servidor aparece na secção de parceiros da página inicial.</p>
        <div class="guild-soon guild-soon--ok">Visível em reboucas.me/failuerc</div>`);

    case 'premium-keys':
    case 'insignia':
    case 'multiplicador-daily':
    case 'drops':
    case 'dias-sem-taxas':
      return renderComingSoon(
        painelMenu.secoes.flatMap((g) => g.itens).find((i) => i.id === sectionId)?.label || 'Premium',
        'O Failuerc não tem planos premium — tudo incluído gratuitamente.',
      );

    default:
      return panel('Secção', '<p class="guild-panel__intro">Secção não encontrada.</p>');
  }
}

function findSectionLabel(sectionId) {
  for (const group of painelMenu.secoes) {
    const item = group.itens.find((i) => i.id === sectionId);
    if (item) return item.label;
  }
  return 'Painel';
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function renderGuildDashboardPage(basePath, clientId, stats, user, guildData, sectionId = 'visao-geral', bootstrap = null) {
  const content = renderSectionContent(sectionId, guildData, basePath, clientId);
  const bootstrapScript = bootstrap
    ? `<script id="guild-bootstrap" type="application/json">${safeJson(bootstrap)}</script>`
    : '';
  const main = `
  <div class="guild-dashboard" data-guild-id="${escapeHtml(guildData.id)}" data-base-path="${escapeHtml(basePath)}" data-section="${escapeHtml(sectionId)}">
    ${renderGuildSidebar(basePath, guildData, user, sectionId)}
    <div class="guild-dashboard__main">${content}</div>
  </div>
  ${bootstrapScript}
  <script src="${escapeHtml(basePath)}/public/guild-panel.js?v=7" defer></script>`;

  return wrapPage({
    basePath,
    clientId,
    stats,
    user,
    activePath: 'painel',
    mainContent: main,
    description: `${findSectionLabel(sectionId)} — ${guildData.name}`,
    minimal: true,
  });
}

function renderGuildAccessDenied(basePath, clientId, stats, user) {
  const main = `
  <article class="content-page">
    <h1 class="content-page__title">Sem permissão</h1>
    <p class="content-page__intro">Não tens permissão para gerir este servidor ou o Failuerc não está instalado nele.</p>
    <a class="btn btn--cta" href="${basePath}/painel">Voltar ao painel</a>
  </article>`;
  return wrapPage({ basePath, clientId, stats, user, activePath: 'painel', mainContent: main });
}

module.exports = {
  renderGuildDashboardPage,
  renderGuildAccessDenied,
  findSectionLabel,
};
