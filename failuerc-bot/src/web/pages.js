const config = require('../../config/default.json');
const {
  escapeHtml,
  formatMembers,
  inviteUrl,
  waveSvg,
  renderNav,
  renderFooter,
  renderCtaBlock,
  renderStickyBar,
  pageShell,
  wrapPage,
} = require('./layout');

function renderParceirosBand(parceiros, stats) {
  const p = config.parceiros;
  const titulo = stats.servidores > 0 ? `${p.titulo}!` : p.titulo;

  let avatarsHtml;
  if (!parceiros.length) {
    avatarsHtml = `<p class="parceiros-band__vazio">${escapeHtml(p.vazio)}</p>`;
  } else {
    avatarsHtml = `<div class="parceiros-band__scroll" tabindex="0">
      ${parceiros.map((g) => {
        const tip = `${g.name} · ${formatMembers(g.memberCount)} membros`;
        const img = `<img class="parceiro-avatar" src="${escapeHtml(g.iconUrl)}" alt="${escapeHtml(g.name)}" width="72" height="72" loading="lazy">`;
        if (g.inviteUrl) {
          return `<a class="parceiro-avatar-wrap" href="${escapeHtml(g.inviteUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(tip)}">${img}</a>`;
        }
        return `<span class="parceiro-avatar-wrap" title="${escapeHtml(tip)}">${img}</span>`;
      }).join('')}
    </div>`;
  }

  const statsLine = stats.servidores > 0
    ? `<p class="parceiros-band__stats">${formatMembers(stats.servidores)} servidores · ${formatMembers(stats.membros)} membros no total</p>`
    : '';

  return `
  <section id="parceiros" class="parceiros-band">
    ${waveSvg('#161616')}
    <div class="parceiros-band__inner">
      <h2 class="parceiros-band__title">${escapeHtml(titulo)}</h2>
      ${avatarsHtml}
      ${statsLine}
    </div>
    ${waveSvg('#0a0a0a')}
  </section>`;
}

function renderSplitSection({ title, text, mascot, reverse }) {
  const mod = reverse ? ' split--reverse' : '';
  return `
  <section class="split${mod}">
    <div class="split__text">
      <h2 class="split__title">${escapeHtml(title)}</h2>
      <p class="split__body">${escapeHtml(text)}</p>
    </div>
    <div class="split__visual">
      <img src="${mascot}" alt="" width="280" height="280" loading="lazy">
    </div>
  </section>`;
}

function renderSectionContent(sec) {
  let html = `<section class="content-block"><h2 class="content-block__title">${escapeHtml(sec.titulo)}</h2>`;
  if (sec.paragrafos) {
    html += sec.paragrafos.map((p) => `<p class="content-block__p">${escapeHtml(p)}</p>`).join('');
  }
  if (sec.itens) {
    html += `<ul class="content-block__list">${sec.itens.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
  }
  html += '</section>';
  return html;
}

function renderStaticPage(basePath, clientId, stats, pageKey, user = null) {
  const page = config.paginas[pageKey];
  if (!page) return null;

  const discordBlock = pageKey === 'suporte' && config.site.discordInvite
    ? `<div class="suporte-discord">
        <a class="btn btn--cta btn--lg" href="${escapeHtml(config.site.discordInvite)}" target="_blank" rel="noopener noreferrer">Entrar no ${escapeHtml(config.site.discordNome || 'servidor Discord')}</a>
      </div>`
    : '';

  const main = `
  <article class="content-page">
    <header class="content-page__header">
      <h1 class="content-page__title">${escapeHtml(page.titulo)}</h1>
      <p class="content-page__intro">${escapeHtml(page.intro)}</p>
      ${discordBlock}
    </header>
    <div class="content-page__body">
      ${page.secoes.map(renderSectionContent).join('')}
    </div>
  </article>`;

  return wrapPage({
    basePath,
    clientId,
    stats,
    user,
    activePath: pageKey,
    mainContent: main,
    description: page.intro,
  });
}

function renderHomePage(basePath, clientId, parceiros = [], stats = { servidores: 0, membros: 0 }, user = null) {
  const mascot = `${basePath}/public/mascot.png`;
  const invite = inviteUrl(clientId);
  const s = config.site;

  const main = `
    <section id="inicio" class="hero">
      <div class="hero__inner">
        <div class="hero__content">
          <h1 class="hero__title">${escapeHtml(s.heroTitulo)}</h1>
          <p class="hero__p">${escapeHtml(s.heroTexto1)}</p>
          <p class="hero__p">${escapeHtml(s.heroTexto2)}</p>
          <p class="hero__p hero__p--accent">${escapeHtml(s.heroTexto3)}</p>
        </div>
        <div class="hero__visual">
          <img class="hero__mascot" src="${mascot}" alt="${escapeHtml(config.bot.nome)}" width="360" height="360">
        </div>
      </div>
    </section>

    ${renderParceirosBand(parceiros, stats)}

    <div id="funcionalidades" class="splits">
      ${renderSplitSection({ title: s.secaoModTitulo, text: s.secaoModTexto, mascot, reverse: false })}
      ${renderSplitSection({ title: s.secaoVerTitulo, text: s.secaoVerTexto, mascot, reverse: true })}
      ${renderSplitSection({ title: s.secaoTicketTitulo, text: s.secaoTicketTexto, mascot, reverse: false })}
    </div>

    <section id="como-funciona" class="steps-section">
      <h2 class="steps-section__title">Como funciona a verificação</h2>
      <ol class="steps">
        <li>Convida o Failuerc para o teu servidor</li>
        <li>Configura com /verificacao configurar e /verificacao painel</li>
        <li>O membro clica em Verificar com Discord no painel</li>
        <li>Autoriza no site e recebe o cargo automaticamente</li>
      </ol>
      <p class="steps-section__note">A verificação começa no Discord, não nesta página inicial.</p>
    </section>`;

  const body = `
  ${renderNav(basePath, invite, '', user)}
  <main>${main}</main>
  ${renderCtaBlock(invite)}
  ${renderFooter(basePath)}
  ${renderStickyBar(stats, invite)}`;

  return pageShell({ title: config.bot.nome, basePath, body, description: s.heroTexto1 });
}

function renderStatusPage({ basePath, titulo, descricao, ok, extra, clientId, stats = { servidores: 0, membros: 0 }, user = null }) {
  const invite = inviteUrl(clientId);
  const mod = ok === true ? 'ok' : ok === false ? 'err' : '';
  const titleClass = ok === true ? 'status-card__title--ok' : ok === false ? 'status-card__title--err' : '';

  const main = `
  <div class="page page--center">
    <div class="status-card status-card--${mod}">
      <h1 class="brand-title brand-title--sm ${titleClass}">${escapeHtml(titulo)}</h1>
      <p class="status-card__text">${escapeHtml(descricao)}</p>
      ${extra ? `<p class="status-card__extra">${escapeHtml(extra)}</p>` : ''}
      <a class="btn btn--ghost status-card__back" href="${basePath}/">Voltar ao início</a>
    </div>
  </div>`;

  const body = `
  ${renderNav(basePath, invite, '', user)}
  <main>${main}</main>
  ${renderFooter(basePath)}
  ${renderStickyBar(stats, invite)}`;

  return pageShell({ title: titulo, basePath, body, description: descricao });
}

const STATIC_PAGES = ['suporte', 'sobre', 'diretrizes', 'termos', 'privacidade'];

module.exports = {
  renderHomePage,
  renderStaticPage,
  renderStatusPage,
  STATIC_PAGES,
  escapeHtml,
};
