(function () {
  const KEY = 'failuerc-theme';
  const root = document.documentElement;

  function applyTheme(mode) {
    if (mode === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', mode);
    }
    localStorage.setItem(KEY, mode);
  }

  const saved = localStorage.getItem(KEY) || 'dark';
  applyTheme(saved);

  const modal = document.getElementById('theme-modal');
  const openBtn = document.getElementById('theme-open');
  const closeBtn = document.getElementById('theme-close');
  const backdrop = document.getElementById('theme-backdrop');

  function openModal() {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  modal?.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyTheme(btn.getAttribute('data-theme'));
      closeModal();
    });
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem(KEY) === 'system') applyTheme('system');
  });
})();
