(function () {
  const root = document.querySelector('.guild-dashboard');
  if (!root) return;

  const guildId = root.dataset.guildId;
  const basePath = root.dataset.basePath || '';
  const section = root.dataset.section || '';

  let resources = null;
  let config = null;

  function flash(message, ok) {
    const el = document.querySelector('.guild-form-flash');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.className = `guild-form-flash guild-form-flash--${ok ? 'ok' : 'err'}`;
    clearTimeout(flash._t);
    flash._t = setTimeout(() => { el.hidden = true; }, 5000);
  }

  async function api(path, options = {}) {
    const res = await fetch(`${basePath}${path}`, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Pedido falhou.');
    return data;
  }

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeRoleColor(hex) {
    if (!hex || hex === '#000000') return '#586275';
    return hex;
  }

  function textColorForBg(hex) {
    const c = String(hex || '').replace('#', '');
    if (c.length !== 6) return '#fff';
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#111111' : '#ffffff';
  }

  function styleRoleOption(opt, item) {
    if (!item?.color) return;
    const bg = normalizeRoleColor(item.color);
    opt.style.backgroundColor = bg;
    opt.style.color = textColorForBg(bg);
  }

  function fillSelect(select, items, { placeholder, selected, multiple } = {}) {
    if (!select) return;
    select.innerHTML = '';
    if (placeholder && !multiple) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = placeholder;
      select.appendChild(opt);
    }
    for (const item of items) {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.name;
      styleRoleOption(opt, item);
      if (multiple && Array.isArray(selected) && selected.includes(item.id)) opt.selected = true;
      if (!multiple && selected === item.id) opt.selected = true;
      select.appendChild(opt);
    }
    if (multiple && Array.isArray(selected)) {
      for (const opt of select.options) {
        opt.selected = selected.includes(opt.value);
      }
    }
  }

  function findRole(roleId) {
    return resources.roles?.find((r) => r.id === roleId) || null;
  }

  function rolePickerHtml(selectedId, { colored = false } = {}) {
    const role = selectedId ? findRole(selectedId) : null;
    const swatchColor = role ? normalizeRoleColor(role.color) : '#2a2a32';
    const label = role?.name || '— Escolhe um cargo —';
    const menuClass = colored ? 'rr-role-picker__menu rr-role-picker__menu--colors' : 'rr-role-picker__menu';

    const noneOption = `<button type="button" class="rr-role-picker__option rr-role-picker__option--none" data-role-id=""><span class="rr-role-picker__option-swatch rr-role-picker__option-swatch--empty"></span><span>— Sem cargo —</span></button>`;
    const roleOptions = (resources.roles || []).map((r) => {
      const bg = normalizeRoleColor(r.color);
      const fg = textColorForBg(bg);
      const active = r.id === selectedId ? ' rr-role-picker__option--active' : '';
      return `<button type="button" class="rr-role-picker__option${active}" data-role-id="${r.id}" style="--role-color:${bg};--role-fg:${fg}"><span class="rr-role-picker__option-swatch" style="background:${bg}"></span><span>${escapeHtml(r.name)}</span></button>`;
    }).join('');

    return `
      <div class="rr-role-picker${colored ? ' rr-role-picker--colors' : ''}" data-value="${selectedId || ''}">
        <button type="button" class="rr-role-picker__trigger" aria-expanded="false" aria-haspopup="listbox">
          <span class="rr-role-picker__swatch" style="background:${swatchColor}"></span>
          <span class="rr-role-picker__label">${escapeHtml(label)}</span>
          <span class="rr-role-picker__caret" aria-hidden="true">▾</span>
        </button>
        <div class="${menuClass}" role="listbox">
          ${noneOption}
          ${roleOptions}
        </div>
      </div>`;
  }

  function closeAllRolePickers() {
    document.querySelectorAll('.rr-role-picker__menu.is-open').forEach((m) => m.classList.remove('is-open'));
    document.querySelectorAll('.rr-role-picker__trigger[aria-expanded="true"]').forEach((t) => {
      t.setAttribute('aria-expanded', 'false');
    });
  }

  function bindRolePickers(root = document) {
    root.querySelectorAll('.rr-role-picker:not([data-bound])').forEach((picker) => {
      picker.dataset.bound = '1';
      const trigger = picker.querySelector('.rr-role-picker__trigger');
      const menu = picker.querySelector('.rr-role-picker__menu');
      if (!trigger || !menu) return;

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const willOpen = !menu.classList.contains('is-open');
        closeAllRolePickers();
        if (willOpen) {
          menu.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });

      menu.querySelectorAll('.rr-role-picker__option').forEach((opt) => {
        opt.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const roleId = opt.dataset.roleId || '';
          const role = roleId ? findRole(roleId) : null;
          picker.dataset.value = roleId;
          picker.querySelector('.rr-role-picker__label').textContent = role?.name || '— Escolhe um cargo —';
          picker.querySelector('.rr-role-picker__swatch').style.background = role
            ? normalizeRoleColor(role.color)
            : '#2a2a32';
          menu.querySelectorAll('.rr-role-picker__option').forEach((o) => {
            o.classList.toggle('rr-role-picker__option--active', o === opt);
          });
          menu.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
        });
      });
    });
  }

  if (!window.__failuercRolePickerClose) {
    window.__failuercRolePickerClose = true;
    document.addEventListener('click', closeAllRolePickers);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllRolePickers();
    });
  }

  async function loadBase() {
    const bootstrap = document.getElementById('guild-bootstrap');
    if (bootstrap?.textContent) {
      const data = JSON.parse(bootstrap.textContent);
      resources = data.resources;
      config = data.config;
      return;
    }
    [resources, config] = await Promise.all([
      api(`/api/guild/${guildId}/resources`),
      api(`/api/guild/${guildId}/config`),
    ]);
  }

  function warnEmptyResources() {
    if (!resources) return;
    const noChannels = !resources.textChannels?.length;
    const noRoles = !resources.roles?.length;
    if (noChannels || noRoles) {
      const parts = [];
      if (noChannels) parts.push('canais');
      if (noRoles) parts.push('cargos');
      flash(
        `O bot não conseguiu listar ${parts.join(' nem ')}. Verifica se o Failuerc tem permissão de Administrador (ou Ver Canais + Ver Cargos) no servidor.`,
        false,
      );
    }
  }

  function bindSave(formId, handler) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await handler(new FormData(form));
        flash('Configuração guardada.', true);
        config = await api(`/api/guild/${guildId}/config`);
      } catch (err) {
        flash(err.message, false);
      }
    });
  }

  function bindPublish(btnId, channelSelectId, endpoint) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const channelId = document.getElementById(channelSelectId)?.value;
      if (!channelId) return flash('Escolhe um canal.', false);
      btn.disabled = true;
      try {
        const result = await api(`/api/guild/${guildId}/publish/${endpoint}`, {
          method: 'POST',
          body: JSON.stringify({ channelId }),
        });
        flash('Painel publicado com sucesso.', true);
        if (result.url) window.open(result.url, '_blank');
        config = await api(`/api/guild/${guildId}/config`);
      } catch (err) {
        flash(err.message, false);
      } finally {
        btn.disabled = false;
      }
    });
  }

  function initVerification() {
    fillSelect(document.getElementById('vf-role'), resources.roles, {
      placeholder: 'Escolhe um cargo',
      selected: config.verifiedRoleId,
    });
    fillSelect(document.getElementById('vf-log'), resources.textChannels, {
      placeholder: 'Nenhum',
      selected: config.verification?.logChannelId || '',
    });
    fillSelect(document.getElementById('vf-waiting'), resources.textChannels, {
      placeholder: 'Nenhum',
      selected: config.verification?.waitingChannelId || '',
    });
    fillSelect(document.getElementById('vf-staff-chat'), resources.textChannels, {
      placeholder: 'Nenhum',
      selected: config.verification?.staffChatChannelId || '',
    });
    fillSelect(document.getElementById('vf-publish-channel'), resources.textChannels, {
      placeholder: 'Canal para publicar painel',
    });

    const enabled = document.getElementById('vf-enabled');
    const blockAlts = document.getElementById('vf-block-alts');
    const requireAvatar = document.getElementById('vf-require-avatar');
    const minAge = document.getElementById('vf-min-age');

    if (enabled) enabled.checked = config.verification?.enabled !== false;
    if (blockAlts) blockAlts.checked = config.verification?.blockAlts !== false;
    if (requireAvatar) requireAvatar.checked = Boolean(config.verification?.requireAvatar);
    if (minAge) minAge.value = config.verification?.minAccountAgeDays ?? 30;

    bindSave('form-verification', async () => {
      await api(`/api/guild/${guildId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: enabled?.checked ?? true,
          verifiedRoleId: document.getElementById('vf-role')?.value || null,
          logChannelId: document.getElementById('vf-log')?.value || null,
          waitingChannelId: document.getElementById('vf-waiting')?.value || null,
          staffChatChannelId: document.getElementById('vf-staff-chat')?.value || null,
          blockAlts: blockAlts?.checked ?? true,
          requireAvatar: requireAvatar?.checked ?? false,
          minAccountAgeDays: Number(minAge?.value) || 30,
        }),
      });
    });

    bindPublish('vf-publish-btn', 'vf-publish-channel', 'verification');
  }

  function initTickets() {
    fillSelect(document.getElementById('tk-category'), resources.categories, {
      placeholder: 'Escolhe uma categoria',
      selected: config.ticketCategoryId,
    });
    fillSelect(document.getElementById('tk-support'), resources.roles, {
      multiple: true,
      selected: config.supportRoleIds || [],
    });
    fillSelect(document.getElementById('tk-publish-channel'), resources.textChannels, {
      placeholder: 'Canal para publicar painel',
    });

    const fields = ['panelTitle', 'panelDescription', 'welcomeTitle', 'welcomeDescription'];
    for (const f of fields) {
      const el = document.getElementById(`tk-${f}`);
      if (el) el.value = config.tickets?.[f] || '';
    }

    bindSave('form-tickets', async () => {
      const support = document.getElementById('tk-support');
      const supportRoleIds = support
        ? [...support.selectedOptions].map((o) => o.value).filter(Boolean)
        : [];
      await api(`/api/guild/${guildId}/tickets`, {
        method: 'PATCH',
        body: JSON.stringify({
          ticketCategoryId: document.getElementById('tk-category')?.value || null,
          supportRoleIds,
          panelTitle: document.getElementById('tk-panelTitle')?.value || null,
          panelDescription: document.getElementById('tk-panelDescription')?.value || null,
          welcomeTitle: document.getElementById('tk-welcomeTitle')?.value || null,
          welcomeDescription: document.getElementById('tk-welcomeDescription')?.value || null,
        }),
      });
    });

    bindPublish('tk-publish-btn', 'tk-publish-channel', 'tickets');
  }

  function initAutorole() {
    fillSelect(document.getElementById('ar-roles'), resources.roles, {
      multiple: true,
      selected: config.autoroleIds || [],
    });

    bindSave('form-autorole', async () => {
      const select = document.getElementById('ar-roles');
      const autoroleIds = select
        ? [...select.selectedOptions].map((o) => o.value).filter(Boolean)
        : [];
      await api(`/api/guild/${guildId}/autorole`, {
        method: 'PATCH',
        body: JSON.stringify({ autoroleIds }),
      });
    });
  }

  function initReactionRoles() {
    const panels = config.reactionRolePanels || {};
    const panelKeys = Object.keys(panels).length
      ? Object.keys(panels)
      : ['cores', 'idade', 'plataformas', 'games', 'games-2', 'ranks-valorant', 'ranks-lol', 'pings', 'quests'];

    fillSelect(document.getElementById('rr-channel-manual'), resources.textChannels, {
      placeholder: 'Canal da mensagem',
    });
    fillSelect(document.getElementById('rr-role'), resources.roles, {
      placeholder: 'Cargo',
    });

    function roleOptions(selectedId) {
      const opts = ['<option value="">— Escolhe um cargo —</option>'];
      for (const role of resources.roles) {
        const sel = role.id === selectedId ? ' selected' : '';
        const bg = normalizeRoleColor(role.color);
        const fg = textColorForBg(bg);
        opts.push(`<option value="${role.id}"${sel} style="background-color:${bg};color:${fg}">${escapeHtml(role.name)}</option>`);
      }
      return opts.join('');
    }

    function roleCellHtml(panelKey, roleId) {
      const colored = panelKey === 'cores';
      if (colored) {
        return `<td class="rr-table__role">${rolePickerHtml(roleId, { colored: true })}</td>`;
      }
      return `<td class="rr-table__role"><select class="guild-form-select rr-role-select">${roleOptions(roleId)}</select></td>`;
    }

    function setPanelStatus(panelKey, text) {
      const el = document.querySelector(`.rr-status[data-panel="${panelKey}"]`);
      if (!el) return;
      if (text) {
        el.textContent = text;
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    }

    function collectPanel(panelKey) {
      const title = document.querySelector(`.rr-title[data-panel="${panelKey}"]`)?.value;
      const description = document.querySelector(`.rr-desc[data-panel="${panelKey}"]`)?.value;
      const exclusive = document.querySelector(`.rr-exclusive[data-panel="${panelKey}"]`)?.checked ?? false;
      const rows = document.querySelectorAll(`.rr-entries[data-panel="${panelKey}"] tr`);
      const entries = [...rows].map((row) => ({
        emoji: row.dataset.emoji,
        label: row.querySelector('.rr-label')?.value || row.dataset.emoji,
        roleId: row.querySelector('.rr-role-picker')?.dataset.value
          || row.querySelector('.rr-role-select')?.value
          || null,
      }));
      return { title, description, exclusive, entries };
    }

    function renderPanel(panelKey) {
      const panel = panels[panelKey];
      if (!panel) return;

      const titleEl = document.querySelector(`.rr-title[data-panel="${panelKey}"]`);
      const descEl = document.querySelector(`.rr-desc[data-panel="${panelKey}"]`);
      const exEl = document.querySelector(`.rr-exclusive[data-panel="${panelKey}"]`);
      const tbody = document.querySelector(`.rr-entries[data-panel="${panelKey}"]`);
      const channelEl = document.querySelector(`.rr-channel[data-panel="${panelKey}"]`);

      if (titleEl) titleEl.value = panel.title || '';
      if (descEl) descEl.value = panel.description || '';
      if (exEl) exEl.checked = Boolean(panel.exclusive);
      if (channelEl) {
        fillSelect(channelEl, resources.textChannels, {
          placeholder: 'Canal para publicar',
          selected: panel.channelId || '',
        });
      }

      if (tbody) {
        tbody.innerHTML = (panel.entries || []).map((e) => `
          <tr data-emoji="${e.emoji}">
            <td class="rr-table__emoji"><code>${String(e.emoji || '').replace(/</g, '&lt;')}</code></td>
            <td><input type="text" class="guild-form-input rr-label" value="${String(e.label || '').replace(/"/g, '&quot;')}"></td>
            ${roleCellHtml(panelKey, e.roleId)}
          </tr>`).join('');
        bindRolePickers(tbody);
      }

      if (panel.messageId && panel.channelId) {
        setPanelStatus(panelKey, `Painel publicado · msg ${panel.messageId}`);
      } else {
        setPanelStatus(panelKey, '');
      }
    }

    for (const key of panelKeys) renderPanel(key);

    document.querySelectorAll('.rr-save').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const panelKey = btn.dataset.panel;
        btn.disabled = true;
        try {
          const data = collectPanel(panelKey);
          await api(`/api/guild/${guildId}/reaction-panels/${panelKey}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
          });
          config = await api(`/api/guild/${guildId}/config`);
          Object.assign(panels, config.reactionRolePanels || {});
          flash(`Painel ${panelKey} guardado.`, true);
        } catch (err) {
          flash(err.message, false);
        } finally {
          btn.disabled = false;
        }
      });
    });

    document.querySelectorAll('.rr-publish').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const panelKey = btn.dataset.panel;
        const channelId = document.querySelector(`.rr-channel[data-panel="${panelKey}"]`)?.value;
        if (!channelId) return flash('Escolhe um canal para publicar.', false);
        btn.disabled = true;
        try {
          const data = collectPanel(panelKey);
          await api(`/api/guild/${guildId}/reaction-panels/${panelKey}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
          });
          const result = await api(`/api/guild/${guildId}/reaction-panels/${panelKey}/publish`, {
            method: 'POST',
            body: JSON.stringify({ channelId }),
          });
          config = result.config || await api(`/api/guild/${guildId}/config`);
          Object.assign(panels, config.reactionRolePanels || {});
          renderPanel(panelKey);
          flash(result.warning || 'Painel publicado com reações!', true);
          if (result.url) window.open(result.url, '_blank');
        } catch (err) {
          flash(err.message, false);
        } finally {
          btn.disabled = false;
        }
      });
    });

    const list = document.getElementById('rr-list');
    if (list && config.reactionRoles?.length) {
      list.innerHTML = config.reactionRoles.map((r) => {
        const role = resources.roles.find((x) => x.id === r.roleId);
        const panelTag = r.panelId ? ` · ${r.panelId}` : '';
        return `<li data-msg="${r.messageId}" data-emoji="${r.emoji}">
          <span>${r.emoji} → ${role?.name || r.roleId}${panelTag}</span>
          <button type="button" class="guild-form-btn guild-form-btn--sm rr-remove">Remover</button>
        </li>`;
      }).join('');

      list.querySelectorAll('.rr-remove').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const li = btn.closest('li');
          try {
            await api(`/api/guild/${guildId}/reaction-roles`, {
              method: 'POST',
              body: JSON.stringify({
                action: 'remove',
                messageId: li.dataset.msg,
                emoji: li.dataset.emoji,
              }),
            });
            flash('Entrada removida.', true);
            config = await api(`/api/guild/${guildId}/config`);
            initReactionRoles();
          } catch (err) {
            flash(err.message, false);
          }
        });
      });
    } else if (list) {
      list.innerHTML = '<li class="guild-form-empty">Nenhuma entrada manual.</li>';
    }

    bindSave('form-reaction-add', async () => {
      await api(`/api/guild/${guildId}/reaction-roles`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'add',
          channelId: document.getElementById('rr-channel-manual')?.value,
          messageId: document.getElementById('rr-message')?.value,
          emoji: document.getElementById('rr-emoji')?.value,
          roleId: document.getElementById('rr-role')?.value,
        }),
      });
      config = await api(`/api/guild/${guildId}/config`);
      initReactionRoles();
    });
  }

  function initPanels() {
    fillSelect(document.getElementById('pn-verify-channel'), resources.textChannels, {
      placeholder: 'Canal verificação',
    });
    fillSelect(document.getElementById('pn-ticket-channel'), resources.textChannels, {
      placeholder: 'Canal tickets',
    });
    fillSelect(document.getElementById('pn-rr-channel'), resources.textChannels, {
      placeholder: 'Canal reaction roles',
    });

    bindPublish('pn-verify-btn', 'pn-verify-channel', 'verification');
    bindPublish('pn-ticket-btn', 'pn-ticket-channel', 'tickets');

    const rrBtn = document.getElementById('pn-rr-btn');
    if (rrBtn) {
      rrBtn.addEventListener('click', async () => {
        const channelId = document.getElementById('pn-rr-channel')?.value;
        if (!channelId) return flash('Escolhe um canal.', false);
        try {
          const result = await api(`/api/guild/${guildId}/publish/reaction-panel`, {
            method: 'POST',
            body: JSON.stringify({ channelId }),
          });
          flash('Painel de reaction roles publicado.', true);
          if (result.url) window.open(result.url, '_blank');
        } catch (err) {
          flash(err.message, false);
        }
      });
    }
  }

  function initCommandChannels() {
    fillSelect(document.getElementById('cc-channels'), resources.textChannels, {
      multiple: true,
      selected: config.commandChannels?.channelIds || [],
    });

    const enabled = document.getElementById('cc-enabled');
    if (enabled) enabled.checked = Boolean(config.commandChannels?.enabled);

    bindSave('form-command-channels', async () => {
      const select = document.getElementById('cc-channels');
      const channelIds = select
        ? [...select.selectedOptions].map((o) => o.value).filter(Boolean)
        : [];
      await api(`/api/guild/${guildId}/command-channels`, {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: enabled?.checked ?? false,
          channelIds,
        }),
      });
    });
  }

  function initInviteBlocker() {
    fillSelect(document.getElementById('ib-log'), resources.textChannels, {
      placeholder: 'Nenhum',
      selected: config.inviteBlocker?.logChannelId || '',
    });
    fillSelect(document.getElementById('ib-exempt'), resources.roles, {
      multiple: true,
      selected: config.inviteBlocker?.exemptRoleIds || [],
    });

    const enabled = document.getElementById('ib-enabled');
    const action = document.getElementById('ib-action');
    const muteMinutes = document.getElementById('ib-mute-minutes');

    if (enabled) enabled.checked = Boolean(config.inviteBlocker?.enabled);
    if (action) {
      const a = config.inviteBlocker?.action;
      action.value = a === 'kick' ? 'kick' : a === 'mute' ? 'mute' : 'delete';
    }
    if (muteMinutes) muteMinutes.value = config.inviteBlocker?.muteMinutes ?? 60;

    const toggleMuteField = () => {
      if (muteMinutes?.closest('.guild-form-field')) {
        muteMinutes.closest('.guild-form-field').hidden = action?.value !== 'mute';
      }
    };
    action?.addEventListener('change', toggleMuteField);
    toggleMuteField();

    bindSave('form-invite-blocker', async () => {
      const exempt = document.getElementById('ib-exempt');
      const exemptRoleIds = exempt
        ? [...exempt.selectedOptions].map((o) => o.value).filter(Boolean)
        : [];
      await api(`/api/guild/${guildId}/invite-blocker`, {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: enabled?.checked ?? false,
          action: action?.value || 'mute',
          muteMinutes: Number(muteMinutes?.value) || 60,
          logChannelId: document.getElementById('ib-log')?.value || null,
          exemptRoleIds,
        }),
      });
    });
  }

  function initWelcome() {
    fillSelect(document.getElementById('wl-channel'), resources.textChannels, {
      placeholder: 'Escolhe um canal',
      selected: config.welcome?.channelId || '',
    });

    const enabled = document.getElementById('wl-enabled');
    const message = document.getElementById('wl-message');

    if (enabled) enabled.checked = Boolean(config.welcome?.enabled);
    if (message) {
      message.value = config.welcome?.message
        || 'Oiii! {usuario}, bom proveito do servidor! espero que goste.';
    }

    bindSave('form-welcome', async () => {
      await api(`/api/guild/${guildId}/welcome`, {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: enabled?.checked ?? false,
          channelId: document.getElementById('wl-channel')?.value || null,
          message: message?.value || '',
        }),
      });
    });
  }

  function renderCustomDrafts() {
    const list = document.getElementById('cm-drafts-list');
    if (!list) return;

    const drafts = config.customMessageDrafts || [];
    if (!drafts.length) {
      list.innerHTML = '<li class="guild-form-empty">Nenhum modelo guardado.</li>';
      return;
    }

    list.innerHTML = drafts.map((d) => `
      <li data-id="${d.id}">
        <span><strong>${escapeHtml(d.label)}</strong></span>
        <button type="button" class="guild-form-btn guild-form-btn--sm cm-load">Carregar</button>
        <button type="button" class="guild-form-btn guild-form-btn--sm cm-send-draft">Enviar</button>
        <button type="button" class="guild-form-btn guild-form-btn--sm cm-delete">Apagar</button>
      </li>
    `).join('');

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    const draftById = Object.fromEntries(drafts.map((d) => [d.id, d]));

    list.querySelectorAll('.cm-load').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.closest('li')?.dataset.id;
        const draft = draftById[id];
        if (!draft) return;
        const content = document.getElementById('cm-content');
        const label = document.getElementById('cm-label');
        if (content) content.value = draft.content;
        if (label) label.value = draft.label;
        flash('Modelo carregado.', true);
      });
    });

    list.querySelectorAll('.cm-send-draft').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('li')?.dataset.id;
        const draft = draftById[id];
        const channelId = document.getElementById('cm-channel')?.value;
        if (!draft) return;
        if (!channelId) return flash('Escolhe um canal.', false);
        btn.disabled = true;
        try {
          const result = await api(`/api/guild/${guildId}/custom-messages/send`, {
            method: 'POST',
            body: JSON.stringify({ channelId, content: draft.content }),
          });
          flash(result.parts > 1
            ? `Enviadas ${result.parts} mensagens no Discord.`
            : 'Mensagem enviada no Discord.', true);
          if (result.url) window.open(result.url, '_blank');
        } catch (err) {
          flash(err.message, false);
        } finally {
          btn.disabled = false;
        }
      });
    });

    list.querySelectorAll('.cm-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('li')?.dataset.id;
        if (!id) return;
        try {
          await api(`/api/guild/${guildId}/custom-messages`, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', id }),
          });
          config = await api(`/api/guild/${guildId}/config`);
          renderCustomDrafts();
          flash('Modelo apagado.', true);
        } catch (err) {
          flash(err.message, false);
        }
      });
    });
  }

  function initCustomMessages() {
    fillSelect(document.getElementById('cm-channel'), resources.textChannels, {
      placeholder: 'Escolhe o canal',
    });

    renderCustomDrafts();

    const sendBtn = document.getElementById('cm-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', async () => {
        const channelId = document.getElementById('cm-channel')?.value;
        const content = document.getElementById('cm-content')?.value;
        if (!channelId) return flash('Escolhe um canal.', false);
        if (!content?.trim()) return flash('Escreve uma mensagem.', false);
        sendBtn.disabled = true;
        try {
          const result = await api(`/api/guild/${guildId}/custom-messages/send`, {
            method: 'POST',
            body: JSON.stringify({ channelId, content }),
          });
          flash(result.parts > 1
            ? `Enviadas ${result.parts} mensagens no Discord.`
            : 'Mensagem enviada no Discord.', true);
          if (result.url) window.open(result.url, '_blank');
        } catch (err) {
          flash(err.message, false);
        } finally {
          sendBtn.disabled = false;
        }
      });
    }

    const saveBtn = document.getElementById('cm-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const content = document.getElementById('cm-content')?.value;
        const label = document.getElementById('cm-label')?.value;
        if (!content?.trim()) return flash('Escreve uma mensagem para guardar.', false);
        saveBtn.disabled = true;
        try {
          await api(`/api/guild/${guildId}/custom-messages`, {
            method: 'POST',
            body: JSON.stringify({ label, content }),
          });
          config = await api(`/api/guild/${guildId}/config`);
          renderCustomDrafts();
          flash('Modelo guardado.', true);
        } catch (err) {
          flash(err.message, false);
        } finally {
          saveBtn.disabled = false;
        }
      });
    }
  }

  const inits = {
    verificacao: initVerification,
    tickets: initTickets,
    autorole: initAutorole,
    'reaction-roles': initReactionRoles,
    'painel-discord': initPanels,
    'canais-comandos': initCommandChannels,
    'bloqueador-convites': initInviteBlocker,
    'entrada-saida': initWelcome,
    'comandos-custom': initCustomMessages,
  };

  loadBase()
    .then(() => {
      if (inits[section]) inits[section]();
      warnEmptyResources();
    })
    .catch((err) => flash(err.message, false));
})();
