const config = require('../../config/default.json');
const commandsCatalog = require('../../config/commands.json');
const { socialIconSvg } = require('./socialIcons');
const { navIcon } = require('./navIcons');
const { escapeHtml, wrapPage } = require('./layout');

function renderPainelSidebar(basePath, user, active = 'servidores') {
  const discord = config.site.discordInvite;
  const discordNome = config.site.discordNome || 'Servidor Discord';

  const items = [
    { id: 'servidores', label: 'Seus servidores', href: `${basePath}/painel`, icon: 'panel' },
    { id: 'discord', label: discordNome, href: discord, icon: 'support', external: true },
    { id: 'wiki', label: 'Wiki', href: `${basePath}/wiki`, icon: 'wiki' },
    { id: 'comandos', label: 'Comandos', href: `${basePath}/comandos`, icon: 'commands' },
    { id: 'diretrizes', label: 'Diretrizes da comunidade', href: `${basePath}/diretrizes`, icon: 'wiki' },
  ];

  const links = items.map((item) => {
    const isActive = item.id === active;
    const ext = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a class="dashboard-sidebar__link${isActive ? ' is-active' : ''}" href="${escapeHtml(item.href)}"${ext}>
      <span class="dashboard-sidebar__icon">${navIcon(item.icon)}</span>
      ${escapeHtml(item.label)}
    </a>`;
  }).join('');

  const logout = user
    ? `<a class="dashboard-sidebar__link dashboard-sidebar__link--logout" href="${basePath}/logout">
        <span class="dashboard-sidebar__icon">${navIcon('login')}</span>
        Sair
      </a>`
    : '';

  return `
  <aside class="dashboard-sidebar" aria-label="Menu do painel">
    <nav class="dashboard-sidebar__nav">${links}</nav>
    ${logout ? `<div class="dashboard-sidebar__footer">${logout}</div>` : ''}
  </aside>`;
}

function renderCommandCard(cmd) {
  const sinonimos = cmd.sinonimos?.length
    ? `<p class="cmd-card__syn"><span>Sinónimos:</span> ${cmd.sinonimos.map((s) => escapeHtml(s)).join(', ')}</p>`
    : '';

  return `
  <article class="cmd-card" data-search="${escapeHtml(`${cmd.nome} ${cmd.descricao} ${(cmd.sinonimos || []).join(' ')}`.toLowerCase())}">
    <h3 class="cmd-card__name">${escapeHtml(cmd.nome)}</h3>
    <p class="cmd-card__desc">${escapeHtml(cmd.descricao)}</p>
    ${sinonimos}
  </article>`;
}

function renderComandosPage(basePath, clientId, stats, user = null) {
  const catLinks = commandsCatalog.categorias.map((c) =>
    `<li><a href="#cat-${escapeHtml(c.id)}">${escapeHtml(c.nome)}</a></li>`,
  ).join('');

  const sections = commandsCatalog.categorias.map((cat) => {
    const cmds = commandsCatalog.comandos.filter((c) => c.categoria === cat.id);
    return `
    <section class="cmd-category" id="cat-${escapeHtml(cat.id)}" data-category="${escapeHtml(cat.id)}">
      <header class="cmd-category__header">
        <h2 class="cmd-category__title">${escapeHtml(cat.nome)}</h2>
        <p class="cmd-category__desc">${escapeHtml(cat.descricao)}</p>
      </header>
      <div class="cmd-category__grid">
        ${cmds.map(renderCommandCard).join('')}
      </div>
    </section>`;
  }).join('');

  const main = `
  <article class="commands-page">
    <header class="commands-page__header">
      <h1 class="commands-page__title">Comandos do Failuerc</h1>
      <p class="commands-page__intro">${escapeHtml(commandsCatalog.intro)}</p>
      <p class="commands-page__note">${escapeHtml(commandsCatalog.prefixoNota)}</p>
      <div class="commands-page__search-wrap">
        <label class="visually-hidden" for="cmd-search">Pesquisar comandos</label>
        <input class="commands-page__search" id="cmd-search" type="search" placeholder="Pesquisar comando..." autocomplete="off">
      </div>
      <nav class="commands-page__jump" aria-label="Categorias">
        <p class="commands-page__jump-label">Sem tempo? Pule diretamente para uma categoria!</p>
        <ul class="commands-page__jump-list">${catLinks}</ul>
      </nav>
    </header>
    <div class="commands-page__body" id="commands-body">
      ${sections}
    </div>
    <p class="commands-page__empty hidden" id="commands-empty">Nenhum comando encontrado.</p>
  </article>
  <script src="${basePath}/public/comandos.js" defer></script>`;

  return wrapPage({
    basePath,
    clientId,
    stats,
    user,
    activePath: 'comandos',
    mainContent: main,
    description: commandsCatalog.intro,
  });
}

function renderWikiPage(basePath, clientId, stats, user = null) {
  const main = `
  <article class="content-page wiki-page">
    <header class="content-page__header">
      <h1 class="content-page__title">Wiki do Failuerc</h1>
      <p class="content-page__intro">Documentação e guias para configurar o bot no teu servidor Discord.</p>
    </header>
    <div class="content-page__body">
      <section class="content-block">
        <h2 class="content-block__title">Primeiros passos</h2>
        <p class="content-block__p">1. Convida o Failuerc ao servidor com permissões de Gerir Cargos, Gerir Canais e Gerir Mensagens.</p>
        <p class="content-block__p">2. Usa /verificacao configurar para definir o cargo de verificado.</p>
        <p class="content-block__p">3. Publica o painel com /verificacao painel — os membros verificam em reboucas.me/failuerc.</p>
        <p class="content-block__p">4. Configura tickets com /tickets configurar e /tickets painel.</p>
      </section>
      <section class="content-block">
        <h2 class="content-block__title">Verificação OAuth</h2>
        <p class="content-block__p">O membro clica em Verificar com Discord no painel do servidor. É redirecionado para o site, autoriza com a conta Discord e recebe o cargo automaticamente.</p>
      </section>
      <section class="content-block">
        <h2 class="content-block__title">Tickets</h2>
        <p class="content-block__p">Cada ticket abre um canal privado entre o membro e a equipa de moderação. Fecha com /moderacao fechar-ticket no canal do ticket.</p>
      </section>
      <section class="content-block">
        <h2 class="content-block__title">Reaction roles e autorole</h2>
        <p class="content-block__p">Autorole: /autorole adicionar atribui cargos quando alguém entra no servidor.</p>
        <p class="content-block__p">Reaction roles: /reacao painel cria a mensagem; /reacao adicionar liga emoji a cargo.</p>
      </section>
      <section class="content-block">
        <h2 class="content-block__title">Prefixo f!</h2>
        <p class="content-block__p">Comandos rápidos: f!help, f!ping, f!painel. Slash commands são preferidos para configurar o servidor.</p>
        <p class="content-block__p"><a class="wiki-link" href="${basePath}/comandos">Ver lista completa de comandos</a></p>
      </section>
      <section class="content-block">
        <h2 class="content-block__title">Painel web</h2>
        <p class="content-block__p">Faz login com Discord para ver os servidores onde és administrador e o Failuerc está presente. A configuração principal continua a ser feita no Discord.</p>
        <p class="content-block__p"><a class="wiki-link" href="${basePath}/painel">Abrir painel</a></p>
      </section>
    </div>
  </article>`;

  return wrapPage({
    basePath,
    clientId,
    stats,
    user,
    activePath: 'wiki',
    mainContent: main,
    description: 'Wiki e documentação do Failuerc.',
  });
}

function renderPremiumPage(basePath, clientId, stats, user = null) {
  const revolut = config.apoio?.revolutUrl || '';
  const pix = config.apoio?.pixKey || '';

  const main = `
  <article class="content-page premium-page">
    <header class="content-page__header">
      <h1 class="content-page__title">Premium</h1>
      <p class="content-page__intro">O Failuerc é gratuito. Todas as funcionalidades estão incluídas para todos os servidores.</p>
    </header>
    <div class="content-page__body">
      <section class="content-block">
        <h2 class="content-block__title">O que está incluído</h2>
        <ul class="content-block__list">
          <li>Verificação OAuth pelo site reboucas.me/failuerc</li>
          <li>Sistema de tickets com painéis configuráveis</li>
          <li>Reaction roles e autorole</li>
          <li>Painéis de moderação e slash commands completos</li>
          <li>Prefixo f! para comandos rápidos</li>
          <li>Listagem automática na página de parceiros</li>
        </ul>
      </section>
      <section class="content-block">
        <h2 class="content-block__title">Sem planos pagos</h2>
        <p class="content-block__p">Não existe subscrição premium. O bot foi feito para comunidades que precisam de moderação e verificação sem custos extra.</p>
        <p class="content-block__p">Se quiseres apoiar o projeto, podes pagar por <strong>Revolut</strong> ou <strong>PIX</strong>:</p>
        <ul class="content-block__list">
          <li><a class="wiki-link" href="${revolut}" target="_blank" rel="noopener noreferrer">Pagar com Revolut</a></li>
          <li><strong>PIX:</strong> <code>${pix}</code></li>
        </ul>
        <p class="content-block__p">No Discord, usa também <code>f!apoia</code> para ver as opções de pagamento.</p>
      </section>
    </div>
  </article>`;

  return wrapPage({
    basePath,
    clientId,
    stats,
    user,
    activePath: 'premium',
    mainContent: main,
    description: 'Failuerc é gratuito — todas as funcionalidades incluídas.',
  });
}

function renderPainelPage(basePath, clientId, stats, user, guilds = [], error = null) {
  let bodyContent;

  if (!user) {
    bodyContent = `
    <div class="painel-login">
      <h2>Inicia sessão com Discord</h2>
      <p>O painel mostra os servidores onde és administrador e o Failuerc está instalado.</p>
      <a class="btn btn--cta btn--lg" href="${basePath}/login?next=${encodeURIComponent('/painel')}">Login com Discord</a>
    </div>`;
  } else if (error) {
    bodyContent = `<p class="painel-error">${escapeHtml(error)}</p>`;
  } else if (!guilds.length) {
    bodyContent = `
    <p class="painel-empty">Não encontrámos servidores em comum. Convida o Failuerc a um servidor onde tenhas permissão de Gerir Servidor.</p>
    <a class="btn btn--cta" href="https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=268823622&scope=bot%20applications.commands" target="_blank" rel="noopener noreferrer">Adicionar ao servidor</a>`;
  } else {
    bodyContent = `
    <div class="painel-guilds">
      ${guilds.map((g) => `
        <a class="painel-guild-card" href="${basePath}/painel/guild/${escapeHtml(g.id)}">
          <img class="painel-guild-card__icon" src="${escapeHtml(g.iconUrl)}" alt="" width="64" height="64">
          <div class="painel-guild-card__info">
            <h3>${escapeHtml(g.name)}</h3>
            <p>${g.owner ? 'Dono do servidor' : 'Administrador'}</p>
          </div>
          <div class="painel-guild-card__actions">
            <span class="painel-guild-card__hint">Abrir painel</span>
          </div>
        </a>
      `).join('')}
    </div>
    <section class="content-block painel-help">
      <h2 class="content-block__title">Configuração no Discord</h2>
      <p class="content-block__p">/verificacao configurar — cargo de verificado</p>
      <p class="content-block__p">/verificacao painel — publicar painel OAuth</p>
      <p class="content-block__p">/tickets configurar — categoria e suporte</p>
      <p class="content-block__p">/tickets painel — publicar painel de tickets</p>
      <p class="content-block__p"><a class="wiki-link" href="${basePath}/wiki">Ver wiki completa</a></p>
    </section>`;
  }

  const main = `
  <div class="dashboard">
    ${user ? renderPainelSidebar(basePath, user) : ''}
    <article class="content-page painel-page dashboard__main">
    <header class="content-page__header painel-page__header">
      <div>
        <h1 class="content-page__title">Painel de controlo</h1>
        <p class="content-page__intro">Gerir servidores onde o Failuerc está instalado.</p>
      </div>
      ${user ? `
      <div class="painel-user">
        <img src="${escapeHtml(user.avatarUrl)}" alt="" width="40" height="40" class="painel-user__avatar">
        <span>${escapeHtml(user.username)}</span>
        <a class="btn btn--ghost btn--sm" href="${basePath}/logout">Sair</a>
      </div>` : ''}
    </header>
    <div class="content-page__body">${bodyContent}</div>
  </article>
  </div>`;

  return wrapPage({
    basePath,
    clientId,
    stats,
    user,
    activePath: 'painel',
    mainContent: main,
    description: 'Painel de controlo Failuerc — login com Discord.',
  });
}

module.exports = {
  renderComandosPage,
  renderWikiPage,
  renderPremiumPage,
  renderPainelPage,
};
