const config = require('../../config/default.json');
const userMenu = require('../../config/user-painel-menu.json');
const commandsCatalog = require('../../config/commands.json');
const { escapeHtml, wrapPage, href } = require('./layout');
const { dashboardIcon } = require('./dashboardIcons');

function renderUserSidebar(basePath, user, activeId) {
  const sections = userMenu.secoes.map((group) => {
    const heading = group.titulo
      ? `<p class="user-dash__group">${escapeHtml(group.titulo)}</p>`
      : '';
    const links = group.itens.map((item) => {
      const url = item.external ? item.href : href(basePath, item.href);
      const isActive = item.id === activeId;
      const ext = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
      const badge = item.badge
        ? `<span class="user-dash__badge">${escapeHtml(item.badge)}</span>`
        : '';
      return `<a class="user-dash__link${isActive ? ' is-active' : ''}" href="${escapeHtml(url)}"${ext}>
        <span class="user-dash__icon">${dashboardIcon(item.icon)}</span>
        <span class="user-dash__label">${escapeHtml(item.label)}</span>
        ${badge}
      </a>`;
    }).join('');
    return `${heading}<div class="user-dash__group-links">${links}</div>`;
  }).join('');

  return `
  <aside class="user-dash__sidebar">
    <div class="user-dash__brand">${escapeHtml(config.bot.nome)}</div>
    <nav class="user-dash__nav">${sections}</nav>
    <div class="user-dash__sidebar-foot">
      <a class="user-dash__link user-dash__link--logout" href="${basePath}/logout">
        <span class="user-dash__icon">${dashboardIcon('logout')}</span>
        Sair
      </a>
    </div>
  </aside>`;
}

function renderUserFoot(user, basePath) {
  return `
  <div class="user-dash__foot">
    <div class="user-dash__profile">
      <img src="${escapeHtml(user.avatarUrl)}" alt="" width="36" height="36">
      <div>
        <strong>${escapeHtml(user.username)}</strong>
        <span>@${escapeHtml(config.bot.nome.toLowerCase())}</span>
      </div>
    </div>
    <button type="button" class="user-dash__theme-btn" id="theme-open">Tema</button>
  </div>
  ${renderThemeModal(basePath)}`;
}

function renderThemeModal(basePath) {
  const mascot = `${basePath}/public/mascot.png`;
  return `
  <div class="theme-modal hidden" id="theme-modal" role="dialog" aria-labelledby="theme-modal-title" aria-hidden="true">
    <div class="theme-modal__backdrop" id="theme-backdrop"></div>
    <div class="theme-modal__box">
      <h2 class="theme-modal__title" id="theme-modal-title">Escolhe um Tema</h2>
      <img class="theme-modal__mascot" src="${mascot}" alt="" width="280" height="280">
      <div class="theme-modal__actions">
        <button type="button" class="theme-modal__btn" data-theme="light">Tema Claro</button>
        <button type="button" class="theme-modal__btn" data-theme="dark">Tema Escuro</button>
        <button type="button" class="theme-modal__btn theme-modal__btn--full" data-theme="system">Sincronizar com o Sistema</button>
      </div>
      <button type="button" class="theme-modal__close" id="theme-close">Fechar</button>
    </div>
  </div>
  <script src="${basePath}/public/theme.js" defer></script>`;
}

function renderServerGrid(basePath, guilds, stats, clientId) {
  const invite = clientId
    ? `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=268823622&scope=bot%20applications.commands`
    : '#';
  const cards = guilds.map((g) => `
    <article class="server-card">
      <img class="server-card__icon" src="${escapeHtml(g.iconUrl)}" alt="" width="72" height="72">
      <h3 class="server-card__name">${escapeHtml(g.name)}</h3>
      <p class="server-card__role">${g.owner ? 'Dono' : 'Administrador'}</p>
      <a class="server-card__btn" href="${basePath}/painel/guild/${escapeHtml(g.id)}/visao-geral">Configurar</a>
    </article>`).join('');

  return `
  <div class="user-dash__servers">
    <h1 class="user-dash__title">Escolhe um Servidor</h1>
    <p class="user-dash__subtitle">
      <strong>Seus Servidores</strong>
      <span>${stats.configuravel} ${stats.configuravel === 1 ? 'servidor configurável' : 'servidores configuráveis'}, ${stats.total} no total com o Failuerc</span>
    </p>
    ${guilds.length ? `<div class="server-grid">${cards}</div>` : `
      <p class="user-dash__empty">Nenhum servidor configurável. Convida o Failuerc e garante permissão de Gerir Servidor.</p>
      <a class="btn btn--cta" href="${invite}" target="_blank" rel="noopener noreferrer">Adicionar ao servidor</a>`}
    <div class="user-dash__mascot-wrap">
      <img class="user-dash__mascot" src="${basePath}/public/mascot.png" alt="" width="320" height="320">
    </div>
  </div>`;
}

function renderSectionSoon(title, desc) {
  return `
  <div class="user-dash__section">
    <h1 class="user-dash__title">${escapeHtml(title)}</h1>
    <p class="user-dash__intro">${escapeHtml(desc)}</p>
    <div class="guild-soon">Em breve</div>
    <p class="user-dash__hint">Vamos implementar esta secção em seguida. Por agora, usa o Discord com <code>/</code> ou <code>${escapeHtml(config.bot.prefix)}</code>.</p>
  </div>`;
}

function renderUserSectionContent(sectionId, basePath) {
  const prefix = config.bot.prefix;
  switch (sectionId) {
    case 'premium-pessoal':
      return `
      <div class="user-dash__section">
        <h1 class="user-dash__title">Premium Pessoal</h1>
        <p class="user-dash__intro">O Failuerc é gratuito — não existe premium pessoal pago. Todas as funcionalidades estão incluídas.</p>
        <ul class="guild-feature-list">
          <li>Verificação OAuth</li>
          <li>Tickets e moderação</li>
          <li>Autorole e reaction roles</li>
        </ul>
      </div>`;
    case 'failuerc-bolso':
      return `
      <div class="user-dash__section">
        <h1 class="user-dash__title">Failuerc de Bolso</h1>
        <p class="user-dash__intro">Comandos rápidos com o prefixo <code>${escapeHtml(prefix)}</code> em qualquer servidor.</p>
        <ul class="guild-cmd-list">
          <li><code>${escapeHtml(prefix)}help</code></li>
          <li><code>${escapeHtml(prefix)}ping</code></li>
          <li><code>${escapeHtml(prefix)}painel</code></li>
        </ul>
      </div>`;
    case 'wiki':
      return `
      <div class="user-dash__section">
        <h1 class="user-dash__title">Wiki</h1>
        <p class="user-dash__intro">Documentação completa do Failuerc.</p>
        <a class="btn btn--cta" href="${basePath}/wiki">Abrir wiki</a>
      </div>`;
    case 'comandos':
      return `
      <div class="user-dash__section">
        <h1 class="user-dash__title">Comandos</h1>
        <p class="user-dash__intro">${escapeHtml(commandsCatalog.intro)}</p>
        <a class="btn btn--cta" href="${basePath}/comandos">Ver todos os comandos</a>
      </div>`;
    case 'suporte':
      return `
      <div class="user-dash__section">
        <h1 class="user-dash__title">Suporte</h1>
        <p class="user-dash__intro">Entra no servidor Discord da comunidade para pedir ajuda.</p>
        <a class="btn btn--cta" href="${escapeHtml(config.site.discordInvite)}">Entrar no ${escapeHtml(config.site.discordNome)}</a>
      </div>`;
    case 'notificacoes':
      return renderSectionSoon('Notificações', 'Configura alertas e notificações do Failuerc no teu privado.');
    case 'perfil-layout':
      return renderSectionSoon('Layout do Perfil', 'Personaliza o layout do teu perfil social.');
    case 'perfil-bg':
      return renderSectionSoon('Background do Perfil', 'Escolhe um fundo para o teu perfil.');
    case 'insignias':
      return renderSectionSoon('Insígnias', 'Coleciona e mostra insígnias no teu perfil.');
    case 'reputacoes':
      return renderSectionSoon('Reputações', 'Sistema de reputação entre membros.');
    case 'api-keys':
      return renderSectionSoon('API Keys', 'Chaves de API para integrações.');
    default:
      return renderSectionSoon('Secção', 'Conteúdo em desenvolvimento.');
  }
}

function renderUserDashboardPage({
  basePath,
  clientId,
  stats,
  user,
  activeId = 'servidores',
  guilds = [],
  guildStats = { configuravel: 0, total: 0 },
  error = null,
}) {
  let mainContent;
  if (error) {
    mainContent = `<p class="painel-error">${escapeHtml(error)}</p>`;
  } else if (activeId === 'servidores') {
    mainContent = renderServerGrid(basePath, guilds, guildStats, clientId);
  } else {
    mainContent = renderUserSectionContent(activeId, basePath);
  }

  const body = `
  <div class="user-dashboard">
    ${renderUserSidebar(basePath, user, activeId)}
    <div class="user-dashboard__main">
      ${mainContent}
      ${renderUserFoot(user, basePath)}
    </div>
  </div>`;

  return wrapPage({
    basePath,
    clientId,
    stats,
    user,
    activePath: 'painel',
    mainContent: body,
    description: 'Painel de utilizador Failuerc',
    minimal: true,
  });
}

function renderUserLoginPage(basePath, clientId, stats, error = null) {
  const errorBlock = error
    ? `<p class="painel-error">${escapeHtml(error)}</p>`
    : '';
  const main = `
  <div class="user-dashboard user-dashboard--login">
    <div class="user-dashboard__main user-dashboard__main--center">
      <h1 class="user-dash__title">Painel de Utilizador</h1>
      ${errorBlock}
      <p class="user-dash__intro">Inicia sessão com Discord para gerir os teus servidores.</p>
      <a class="btn btn--cta btn--lg" href="${basePath}/login?next=${encodeURIComponent('/painel')}">Login com Discord</a>
    </div>
  </div>`;

  return wrapPage({
    basePath,
    clientId,
    stats,
    user: null,
    activePath: 'painel',
    mainContent: main,
    description: 'Login Failuerc',
    minimal: true,
  });
}

module.exports = {
  renderUserDashboardPage,
  renderUserLoginPage,
};
