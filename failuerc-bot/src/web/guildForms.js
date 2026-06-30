const { escapeHtml } = require('./layout');
const reactionPanelDefaults = require('../../config/reaction-panels.json');

function formFlash() {
  return '<div class="guild-form-flash" role="status" hidden></div>';
}

function formActions(saveLabel = 'Guardar') {
  return `<div class="guild-form-actions"><button type="submit" class="guild-form-btn guild-form-btn--primary">${escapeHtml(saveLabel)}</button></div>`;
}

function publishRow(prefix, label) {
  return `
  <div class="guild-form-publish">
    <label class="guild-form-field guild-form-field--inline">
      <span>${escapeHtml(label)}</span>
      <select id="${prefix}-publish-channel" class="guild-form-select"></select>
    </label>
    <button type="button" id="${prefix}-publish-btn" class="guild-form-btn">Publicar painel</button>
  </div>`;
}

function verificationForm() {
  return `
  ${formFlash()}
  <form id="form-verification" class="guild-form">
    <fieldset class="guild-form-group">
      <legend>Definições gerais</legend>
      <label class="guild-form-check"><input type="checkbox" id="vf-enabled" checked> Sistema de verificação ativo</label>
      <label class="guild-form-check"><input type="checkbox" id="vf-block-alts" checked> Bloquear contas alternativas (alt)</label>
      <label class="guild-form-check"><input type="checkbox" id="vf-require-avatar"> Exigir foto de perfil</label>
      <label class="guild-form-field">
        <span>Idade mínima da conta (dias)</span>
        <input type="number" id="vf-min-age" class="guild-form-input" min="0" max="365" value="30">
      </label>
    </fieldset>
    <fieldset class="guild-form-group">
      <legend>Cargos e canais</legend>
      <label class="guild-form-field">
        <span>Cargo verificado</span>
        <select id="vf-role" class="guild-form-select" required></select>
      </label>
      <label class="guild-form-field">
        <span>: verificadas . — log quando alguém recebe verified</span>
        <select id="vf-log" class="guild-form-select"></select>
      </label>
      <label class="guild-form-field">
        <span>: waiting-verificação . — threads em aberto (aguardam staff)</span>
        <select id="vf-waiting" class="guild-form-select"></select>
      </label>
      <label class="guild-form-field">
        <span>: chat-tickets . — chat staff (avisos de novos pedidos)</span>
        <select id="vf-staff-chat" class="guild-form-select"></select>
      </label>
      <p class="guild-panel__hint">No <strong>chat-tickets</strong> podes fixar instruções para a equipa (como rever, o que pedir, etc.). O bot avisa aí quando abrir uma thread nova no waiting.</p>
    </fieldset>
    ${formActions()}
  </form>
  <fieldset class="guild-form-group guild-form-group--sep">
    <legend>Publicar painel no Discord</legend>
    ${publishRow('vf', 'Canal')}
  </fieldset>`;
}

function ticketsForm() {
  return `
  ${formFlash()}
  <form id="form-tickets" class="guild-form">
    <fieldset class="guild-form-group">
      <legend>Estrutura</legend>
      <label class="guild-form-field">
        <span>Categoria dos tickets</span>
        <select id="tk-category" class="guild-form-select" required></select>
      </label>
      <label class="guild-form-field">
        <span>Cargos de suporte (Ctrl+clique para vários)</span>
        <select id="tk-support" class="guild-form-select" multiple size="5"></select>
      </label>
    </fieldset>
    <fieldset class="guild-form-group">
      <legend>Mensagens do painel</legend>
      <label class="guild-form-field"><span>Título do painel</span><input type="text" id="tk-panelTitle" class="guild-form-input" placeholder="Central de Suporte"></label>
      <label class="guild-form-field"><span>Descrição do painel</span><textarea id="tk-panelDescription" class="guild-form-textarea" rows="3"></textarea></label>
      <label class="guild-form-field"><span>Título ao abrir ticket</span><input type="text" id="tk-welcomeTitle" class="guild-form-input"></label>
      <label class="guild-form-field"><span>Mensagem ao abrir ticket</span><textarea id="tk-welcomeDescription" class="guild-form-textarea" rows="3"></textarea></label>
    </fieldset>
    ${formActions()}
  </form>
  <fieldset class="guild-form-group guild-form-group--sep">
    <legend>Publicar painel no Discord</legend>
    ${publishRow('tk', 'Canal')}
  </fieldset>`;
}

function autoroleForm() {
  return `
  ${formFlash()}
  <form id="form-autorole" class="guild-form">
    <p class="guild-panel__intro">Seleciona os cargos dados automaticamente quando alguém entra no servidor.</p>
    <label class="guild-form-field">
      <span>Cargos de autorole (Ctrl+clique para vários)</span>
      <select id="ar-roles" class="guild-form-select" multiple size="8"></select>
    </label>
    ${formActions('Guardar autorole')}
  </form>`;
}

function reactionRolesForm() {
  const panelMeta = Object.entries(reactionPanelDefaults.panels).map(([id, p]) => ({
    id,
    name: p.title.replace(/:[\w]+:/g, '').trim() || id,
    hint: p.description.replace(/:[\w]+:/g, '').split('\n')[0].slice(0, 100),
  }));

  const panelsHtml = panelMeta.map((p) => `
  <section class="rr-panel" data-panel="${p.id}">
    <header class="rr-panel__head">
      <h3 class="rr-panel__title">${escapeHtml(p.name)}</h3>
      <p class="guild-panel__hint">${escapeHtml(p.hint)}</p>
    </header>
    <label class="guild-form-field"><span>Título</span><input type="text" class="guild-form-input rr-title" data-panel="${p.id}"></label>
    <label class="guild-form-field"><span>Descrição</span><textarea class="guild-form-textarea rr-desc" data-panel="${p.id}" rows="2"></textarea></label>
    <label class="guild-form-check rr-exclusive-wrap" data-panel="${p.id}"><input type="checkbox" class="rr-exclusive" data-panel="${p.id}"> Apenas um cargo deste painel por membro</label>
    <div class="rr-entries-wrap">
      <table class="rr-table">
        <thead><tr><th>Emoji</th><th>Nome</th><th>Cargo${p.id === 'cores' ? ' <span class="rr-table__hint">(com cor)</span>' : ''}</th></tr></thead>
        <tbody class="rr-entries" data-panel="${p.id}"></tbody>
      </table>
    </div>
    <p class="guild-panel__hint">Emojis custom: escreve <code>:nome:</code> (ex. <code>:pinkstar:</code>, <code>:WC2:</code>)</p>
    <div class="guild-form-publish">
      <label class="guild-form-field guild-form-field--inline">
        <span>Canal</span>
        <select class="guild-form-select rr-channel" data-panel="${p.id}"></select>
      </label>
      <button type="button" class="guild-form-btn guild-form-btn--primary rr-save" data-panel="${p.id}">Guardar</button>
      <button type="button" class="guild-form-btn rr-publish" data-panel="${p.id}">Publicar painel</button>
    </div>
    <p class="guild-panel__hint rr-status" data-panel="${p.id}" hidden></p>
  </section>`).join('');

  return `
  ${formFlash()}
  <p class="guild-panel__intro">Painéis com os emojis customizados do servidor (<code>:pinkstar:</code>, <code>:WC1:</code>, ranks, miau, etc.). Cria os cargos no Discord, associa aqui e publica — fica bonito e fofo automaticamente ♡</p>
  <div class="rr-panels">${panelsHtml}</div>
  <fieldset class="guild-form-group guild-form-group--sep">
    <legend>Entradas avulsas (manual)</legend>
    <ul id="rr-list" class="guild-rr-list"></ul>
    <form id="form-reaction-add" class="guild-form">
      <label class="guild-form-field"><span>Canal</span><select id="rr-channel-manual" class="guild-form-select"></select></label>
      <label class="guild-form-field"><span>ID da mensagem</span><input type="text" id="rr-message" class="guild-form-input" placeholder="ID numérico"></label>
      <label class="guild-form-field"><span>Emoji</span><input type="text" id="rr-emoji" class="guild-form-input" placeholder="Ex: ✅"></label>
      <label class="guild-form-field"><span>Cargo</span><select id="rr-role" class="guild-form-select"></select></label>
      ${formActions('Adicionar manualmente')}
    </form>
  </fieldset>`;
}

function panelsForm() {
  return `
  ${formFlash()}
  <p class="guild-panel__intro">Publica painéis diretamente nos canais do Discord. O bot precisa de permissão para enviar mensagens no canal escolhido.</p>
  <div class="guild-form-group">
    <h3 class="guild-form-subtitle">Verificação</h3>
    ${publishRow('pn-verify', 'Canal')}
  </div>
  <div class="guild-form-group">
    <h3 class="guild-form-subtitle">Tickets</h3>
    ${publishRow('pn-ticket', 'Canal')}
  </div>
  <div class="guild-form-group">
    <h3 class="guild-form-subtitle">Reaction roles</h3>
    <div class="guild-form-publish">
      <label class="guild-form-field guild-form-field--inline">
        <span>Canal</span>
        <select id="pn-rr-channel" class="guild-form-select"></select>
      </label>
      <button type="button" id="pn-rr-btn" class="guild-form-btn">Publicar painel</button>
    </div>
  </div>`;
}

function commandChannelsForm() {
  return `
  ${formFlash()}
  <form id="form-command-channels" class="guild-form">
    <p class="guild-panel__intro">Quando ativo, comandos por prefixo (<code>f!</code>) e slash commands só funcionam nos canais selecionados. Staff e administradores podem usar comandos em qualquer canal.</p>
    <fieldset class="guild-form-group">
      <legend>Restrição de canais</legend>
      <label class="guild-form-check"><input type="checkbox" id="cc-enabled"> Restringir comandos a canais específicos</label>
      <label class="guild-form-field">
        <span>Canais permitidos (Ctrl+clique para vários)</span>
        <select id="cc-channels" class="guild-form-select" multiple size="8"></select>
      </label>
    </fieldset>
    ${formActions('Guardar canais de comandos')}
  </form>`;
}

function inviteBlockerForm() {
  return `
  ${formFlash()}
  <form id="form-invite-blocker" class="guild-form">
    <p class="guild-panel__intro">Monitoriza todos os canais de texto onde o bot pode ler mensagens. Convites de outros servidores são removidos; opcionalmente o autor é silenciado ou expulso.</p>
    <fieldset class="guild-form-group">
      <legend>Definições</legend>
      <label class="guild-form-check"><input type="checkbox" id="ib-enabled"> Bloqueador de convites ativo</label>
      <label class="guild-form-field">
        <span>Ação ao detetar convite externo</span>
        <select id="ib-action" class="guild-form-select">
          <option value="delete">Só apagar mensagem</option>
          <option value="mute">Silenciar (timeout)</option>
          <option value="kick">Expulsar do servidor</option>
        </select>
      </label>
      <label class="guild-form-field">
        <span>Duração do silenciamento (minutos)</span>
        <input type="number" id="ib-mute-minutes" class="guild-form-input" min="1" max="40320" value="60">
      </label>
      <label class="guild-form-field">
        <span>Canal de logs (opcional)</span>
        <select id="ib-log" class="guild-form-select"></select>
      </label>
      <label class="guild-form-field">
        <span>Cargos isentos (Ctrl+clique para vários)</span>
        <select id="ib-exempt" class="guild-form-select" multiple size="5"></select>
      </label>
    </fieldset>
    ${formActions('Guardar bloqueador')}
  </form>`;
}

function welcomeForm() {
  return `
  ${formFlash()}
  <form id="form-welcome" class="guild-form">
    <p class="guild-panel__intro">Quando alguém entra no servidor, o Failuerc envia uma mensagem de boas-vindas no canal escolhido.</p>
    <fieldset class="guild-form-group">
      <legend>Boas-vindas</legend>
      <label class="guild-form-check"><input type="checkbox" id="wl-enabled"> Mensagem de entrada ativa</label>
      <label class="guild-form-field">
        <span>Canal de boas-vindas</span>
        <select id="wl-channel" class="guild-form-select"></select>
      </label>
      <label class="guild-form-field">
        <span>Mensagem</span>
        <textarea id="wl-message" class="guild-form-textarea" rows="3" placeholder="Oiii! {usuario}, bom proveito do servidor! espero que goste."></textarea>
      </label>
      <p class="guild-panel__hint">Usa <code>{usuario}</code> para mencionar quem entrou. Também podes usar <code>{nome}</code> e <code>{servidor}</code>.</p>
    </fieldset>
    ${formActions('Guardar boas-vindas')}
  </form>`;
}

function customMessageForm() {
  return `
  ${formFlash()}
  <form id="form-custom-message" class="guild-form">
    <p class="guild-panel__intro">Escreve qualquer texto e o <strong>Failuerc</strong> publica no canal escolhido — com formatação Markdown do Discord (<code>**negrito**</code>, <code>## título</code>, <code>&lt;#id-do-canal&gt;</code>, etc.).</p>
    <fieldset class="guild-form-group">
      <legend>Enviar mensagem</legend>
      <label class="guild-form-field">
        <span>Canal de destino</span>
        <select id="cm-channel" class="guild-form-select"></select>
      </label>
      <label class="guild-form-field">
        <span>Nome do modelo (opcional, para guardar)</span>
        <input type="text" id="cm-label" class="guild-form-input" placeholder="Ex: Regras de verificação" maxlength="80">
      </label>
      <label class="guild-form-field">
        <span>Conteúdo da mensagem</span>
        <textarea id="cm-content" class="guild-form-textarea guild-form-textarea--tall" rows="18" placeholder="Escreve aqui a mensagem que o bot vai enviar…"></textarea>
      </label>
      <p class="guild-panel__hint">Limite do Discord: 2000 caracteres por mensagem. Textos maiores são divididos automaticamente em várias mensagens seguidas.</p>
      <div class="guild-form-actions guild-form-actions--split">
        <button type="button" id="cm-send-btn" class="guild-form-btn guild-form-btn--primary">Enviar no canal</button>
        <button type="button" id="cm-save-btn" class="guild-form-btn">Guardar modelo</button>
      </div>
    </fieldset>
  </form>
  <fieldset class="guild-form-group guild-form-group--sep">
    <legend>Modelos guardados</legend>
    <ul id="cm-drafts-list" class="guild-rr-list"></ul>
  </fieldset>`;
}

module.exports = {
  verificationForm,
  ticketsForm,
  autoroleForm,
  reactionRolesForm,
  panelsForm,
  commandChannelsForm,
  inviteBlockerForm,
  welcomeForm,
  customMessageForm,
};
