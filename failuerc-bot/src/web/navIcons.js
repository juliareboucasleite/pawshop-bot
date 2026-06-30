const ICONS = {
  support: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-4 3v-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>',
  commands: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 17l6-6-6-6v4h12v4H4zm16 0V7H8V5h12v12z"/></svg>',
  premium: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.5 7.5H22l-6 4.5 2.5 7.5L12 17l-6.5 4.5L8 14 2 9.5h5.5L12 2z"/></svg>',
  wiki: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h12a2 2 0 0 1 2 2v13l-5-3-5 3-5-3-5 3V6a2 2 0 0 1 2-2z"/></svg>',
  panel: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h5v8H3v-8zm7 3h11v5H10v-5z"/></svg>',
  login: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 3h7v7h-2V6.4l-9.2 9.2-1.4-1.4L17.6 5H14V3zM5 5h6V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6v-2H5V5z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z"/></svg>',
};

function navIcon(name) {
  return ICONS[name] || ICONS.home;
}

module.exports = { navIcon };
