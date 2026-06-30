const config = require('../../config/default.json');
const { socialIconSvg } = require('./socialIcons');
const { navIcon } = require('./navIcons');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMembers(n) {
  return new Intl.NumberFormat('pt-PT').format(n);
}

function inviteUrl(clientId) {
  return clientId
    ? `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=268823622&scope=bot%20applications.commands`
    : '#';
}

function href(basePath, path) {
  if (path.startsWith('http') || path.startsWith('#')) return path;
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}

function waveSvg(fill) {
  return `<svg class="wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path fill="${fill}" d="M0,40 C360,90 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z"/></svg>`;
}

function renderNav(basePath, invite, activePath = '', user = null) {
  const links = (config.nav || []).map((item) => {
    const url = item.external ? item.href : href(basePath, item.href);
    const slug = item.href.replace(/^\//, '').split('#')[0];
    const isActive = !item.external && activePath && slug === activePath.replace(/^\//, '');
    const icon = item.icon ? `<span class="topbar__nav-icon">${navIcon(item.icon)}</span>` : '';
    const ext = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(url)}"${isActive ? ' class="is-active"' : ''}${ext}>${icon}${escapeHtml(item.label)}</a>`;
  }).join('');

  const loginBlock = user
    ? `<a class="topbar__user" href="${href(basePath, '/painel')}" title="${escapeHtml(user.username)}">
        <img src="${escapeHtml(user.avatarUrl)}" alt="" width="28" height="28">
        <span class="topbar__user-name">${escapeHtml(user.username)}</span>
      </a>`
    : `<a class="topbar__login" href="${href(basePath, '/login?next=/painel')}">
        <span class="topbar__nav-icon">${navIcon('login')}</span>
        Login
      </a>`;

  return `
  <header class="topbar">
    <div class="topbar__inner">
      <a class="topbar__brand" href="${href(basePath, '/')}">${escapeHtml(config.bot.nome)}</a>
      <nav class="topbar__nav" aria-label="Principal">
        ${links}
      </nav>
      <div class="topbar__actions">
        <span class="topbar__locale" aria-label="Idioma">PT-BR</span>
        ${loginBlock}
        <a class="btn btn--primary btn--sm" href="${invite}" target="_blank" rel="noopener noreferrer">Convidar</a>
      </div>
    </div>
  </header>`;
}

function renderSocial() {
  return (config.social || []).map((s) => {
    const icon = socialIconSvg(s.icon || 'globe');
    return `<a class="site-footer__social-link" href="${escapeHtml(s.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(s.label)}">${icon}</a>`;
  }).join('');
}

function renderFooter(basePath) {
  const cols = (config.footer || []).map((col) => `
    <div class="site-footer__col">
      <h3>${escapeHtml(col.titulo)}</h3>
      ${col.links.map((link) => {
        const url = href(basePath, link.href);
        const ext = link.href.startsWith('http');
        if (ext) {
          return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;
        }
        return `<a href="${escapeHtml(url)}">${escapeHtml(link.label)}</a>`;
      }).join('')}
    </div>`).join('');

  const year = new Date().getFullYear();

  return `
  <footer class="site-footer">
    <div class="site-footer__social">${renderSocial()}</div>
    <div class="site-footer__inner">${cols}</div>
    <p class="site-footer__copy">&copy; ${escapeHtml(config.site.copyright)} ${year} — Todos os direitos reservados</p>
  </footer>`;
}

function renderCtaBlock(invite) {
  const s = config.site;
  return `
  <section class="cta-section">
    ${waveSvg('#141414')}
    <div class="cta-section__inner">
      <h2 class="cta-section__title">${escapeHtml(s.ctaTitulo)}</h2>
      <p class="cta-section__text">${escapeHtml(s.ctaTexto)}</p>
      <a class="btn btn--cta btn--lg" href="${invite}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.ctaBotao)}</a>
    </div>
  </section>`;
}

function renderStickyBar(stats, invite) {
  const s = config.site;
  const sub = stats.servidores > 0
    ? s.stickySubtituloCom.replace('{servidores}', formatMembers(stats.servidores))
    : s.stickySubtituloSem;

  return `
  <aside class="sticky-bar" aria-label="Convidar bot">
    <div class="sticky-bar__text">
      <strong>${escapeHtml(s.stickyTitulo)}</strong>
      <span>${escapeHtml(sub)}</span>
    </div>
    <a class="btn btn--cta" href="${invite}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.ctaBotao)}</a>
  </aside>`;
}

function pageShell({ title, description, basePath, body }) {
  const css = `${basePath}/public/style.css`;
  const desc = description || config.site.heroTexto1;
  return `<!DOCTYPE html>
<html lang="pt" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(desc)}">
  <title>${escapeHtml(title)} · ${escapeHtml(config.bot.nome)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${css}">
</head>
<body>
${body}
</body>
</html>`;
}

function wrapPage({ basePath, clientId, stats, activePath, mainContent, description, user = null, minimal = false }) {
  const invite = inviteUrl(clientId);
  const body = `
  ${renderNav(basePath, invite, activePath, user)}
  <main>${mainContent}</main>
  ${minimal ? '' : `${renderCtaBlock(invite)}${renderFooter(basePath)}${renderStickyBar(stats, invite)}`}`;

  const page = config.paginas?.[activePath];
  const title = page?.titulo || config.bot.nome;

  return pageShell({ title, description: description || page?.intro, basePath, body });
}

module.exports = {
  escapeHtml,
  formatMembers,
  inviteUrl,
  href,
  waveSvg,
  renderNav,
  renderFooter,
  renderCtaBlock,
  renderStickyBar,
  pageShell,
  wrapPage,
};
