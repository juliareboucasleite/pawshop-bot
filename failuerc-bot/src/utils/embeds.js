const config = require('../../config/default.json');

const COR = parseInt(config.bot.cor.replace('#', ''), 16);

function baseEmbed() {
  return {
    color: COR,
    timestamp: new Date().toISOString(),
    footer: { text: config.bot.nome },
  };
}

function verificationPanel(guildName, verifyUrl) {
  const v = config.verificacao;
  return {
    ...baseEmbed(),
    title: v.titulo,
    description: v.descricao.replace('{servidor}', guildName),
  };
}

function ticketPanel(title, description) {
  const t = config.tickets;
  return {
    ...baseEmbed(),
    title: title || t.titulo,
    description: description || t.descricao,
  };
}

function ticketOpened(userMention, guildCfg = {}) {
  const t = config.tickets;
  const title = guildCfg.tickets?.welcomeTitle || t.abertoTitulo;
  let desc = guildCfg.tickets?.welcomeDescription || t.abertoDescricao;
  desc = desc.replace('{utilizador}', userMention).replace('{ticket.creator.mention}', userMention);
  return {
    ...baseEmbed(),
    title,
    description: desc,
    footer: { text: `${config.bot.nome} | reboucas.me/failuerc` },
  };
}

function ticketClaimSuccess() {
  const t = config.tickets;
  return {
    ...baseEmbed(),
    color: 0x57f287,
    title: t.claimSucessoTitulo || 'Assumido',
    description: t.claimSucessoDescricao || 'Assumiste este ticket com sucesso.',
    footer: { text: `${config.bot.nome} | reboucas.me/failuerc` },
  };
}

function ticketClosedDm(guildName, details) {
  const t = config.tickets;
  const openInfo = [
    `• **Data de abertura:** ${details.openDate}`,
    `• **Painel:** ${details.panelName}`,
    `• **Nome do ticket:** ${details.ticketName}`,
  ].join('\n');

  const closeInfo = [
    `• **Fechado por:** ${details.closedBy}`,
    `• **Data de fecho:** ${details.closeDate}`,
    `• **Motivo:** ${details.closeReason}`,
  ].join('\n');

  return {
    ...baseEmbed(),
    color: 0x57f287,
    title: t.fechadoDmTitulo || 'Ticket fechado',
    description: (t.fechadoDmDescricao || 'O teu ticket foi fechado em **{servidor}**!').replace('{servidor}', guildName),
    fields: [
      { name: 'Informações do ticket', value: openInfo },
      { name: 'Informações de fecho', value: closeInfo },
    ],
    footer: { text: `${t.fechadoDmRodape || 'Se tiveres mais questões, podes abrir um novo ticket.'} | ${config.bot.nome}` },
  };
}

function formatTicketDate(date = new Date()) {
  return new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function reactionRolePanel(titulo, descricao) {
  const r = config.reacao;
  return {
    ...baseEmbed(),
    title: titulo || r.tituloPadrao,
    description: descricao || r.descricaoPadrao,
  };
}

function successEmbed(titulo, descricao) {
  return {
    ...baseEmbed(),
    color: 0x57f287,
    title: titulo,
    description: descricao,
  };
}

function errorEmbed(mensagem) {
  return {
    ...baseEmbed(),
    color: 0xed4245,
    title: 'Erro',
    description: mensagem,
  };
}

function infoEmbed(titulo, descricao) {
  return {
    ...baseEmbed(),
    title: titulo,
    description: descricao,
  };
}

function verifiedLogEmbed(member, role, { source = 'oauth', moderator = null } = {}) {
  const method = source === 'manual' && moderator
    ? `Manual — ${moderator}`
    : source === 'manual'
      ? 'Manual (staff)'
      : 'OAuth (site)';

  return {
    ...baseEmbed(),
    color: 0xff8a94,
    title: '✦ Verificada',
    description: `${member} recebeu **${role.name}**`,
    thumbnail: { url: member.user.displayAvatarURL({ size: 128 }) },
    fields: [
      { name: 'Utilizador', value: `${member.user.tag}\n\`${member.id}\``, inline: true },
      { name: 'Conta criada', value: formatTicketDate(member.user.createdAt), inline: true },
      { name: 'Método', value: method, inline: true },
    ],
  };
}

function verificationWaitingEmbed(member, reason) {
  return {
    ...baseEmbed(),
    title: 'Pedido de verificação',
    description: [
      `Olá ${member}, a equipa vai rever o teu pedido em breve.`,
      '',
      reason ? `**Motivo:** ${reason}` : null,
      '',
      'Enquanto aguardas, podes deixar informação extra aqui na thread (se aplicável).',
      'A staff usa `/moderacao verificar` quando aprovar.',
    ].filter(Boolean).join('\n'),
  };
}

function anonymousConfessionEmbed(number, content) {
  return {
    ...baseEmbed(),
    color: 0x000000,
    title: `Anonymous Confession (#${number})`,
    description: `"${content}"`,
    footer: { text: config.bot.nome },
  };
}

function communityPostEmbed(type, content, { anonymous = true, author = null } = {}) {
  const meta = {
    confissao: { title: '🤫 Confissão', color: 0x9b59b6 },
    desabafo: { title: '💭 Desabafo', color: 0x3498db },
  }[type] || { title: 'Mensagem', color: COR };

  return {
    ...baseEmbed(),
    color: meta.color,
    title: meta.title,
    description: content,
    footer: {
      text: anonymous
        ? `${config.bot.nome} • Anónimo`
        : `${config.bot.nome} • ${author?.displayName || author?.username || 'Membro'}`,
    },
  };
}

function suggestionPanelEmbed() {
  return {
    ...baseEmbed(),
    color: 0xffc9d4,
    title: '✿ ｡ﾟ  sugestõezinhas  ﾟ｡ ✿',
    description: [
      '꒰ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ꒱',
      '',
      '⋆｡˚ tens uma ideia fofa pra deixar o server ainda melhor? ˚｡⋆',
      '',
      'clica no botãozinho aqui em baixo e conta pra gente ♡',
      '',
      '✎ₓₒ  **o que podes sugerir:**',
      '> ⊹ novos cantinhos e funcionalidades',
      '> ⊹ melhorias no bot ⚙️',
      '> ⊹ ideias de eventos e atividades',
      '> ⊹ qualquer coisinha que imaginares ✦',
      '',
      '˚ ༘ a tua ideia aparece aqui pra comunidade votar ⊰ ♡',
      '⊹ usa o **Discuss** pra abrir um cantinho de conversa ✩',
      '',
      '꒰ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ⠀ ꒱',
    ].join('\n'),
    footer: { text: `${config.bot.nome} ⊹ ♡ ⊹ sugestões` },
  };
}

function suggestionPostEmbed({ author, platform, title, description, upvotes = 0, downvotes = 0, suggestionId }) {
  return {
    ...baseEmbed(),
    color: 0xffc9d4,
    author: { name: `✿ ｡ﾟ  nova sugestão  ﾟ｡ ✿` },
    description: [
      `✿ ｡ﾟ  nova sugestão de ${author}  ✦*ﾟ`,
      '',
      `> ⋆ ⊰ **${title}**`,
      `> ⠀ ⠀ ${description}`.slice(0, 900),
      '',
      `✎ₓₒ  plataforma : *${platform}*`,
      '',
      `♡ ⟶ \`${upvotes}\`⠀⠀✗ ⟶ \`${downvotes}\``,
    ].join('\n'),
    footer: { text: `${config.bot.nome} ⊹ ♡ ⊹ sugestão #${suggestionId}` },
  };
}

function verifiedNotifyEmbed(member, role, { moderator = null, claimer = null } = {}) {
  const verifier = claimer || moderator;
  const verifierText = verifier
    ? (typeof verifier === 'string' ? verifier : verifier.toString())
    : 'staff';

  return {
    ...baseEmbed(),
    color: 0x57f287,
    title: '✅ Novo membro verificado',
    description: `${member} foi verificado por ${verifierText}`,
    thumbnail: { url: member.user.displayAvatarURL({ size: 128 }) },
    fields: [
      { name: 'Utilizador', value: `${member.user.tag}\n\`${member.id}\``, inline: true },
      { name: 'Cargo', value: role.name, inline: true },
    ],
  };
}

function waitingNotifyEmbed(member, thread, reason) {
  return {
    ...baseEmbed(),
    color: 0xfee75c,
    title: '⏳ Aguardando verificação',
    description: [
      `${member} está à espera de verificação.`,
      '',
      `**Thread:** <#${thread.id}>`,
      reason ? `**Motivo:** ${reason}` : null,
    ].filter(Boolean).join('\n'),
    thumbnail: { url: member.user.displayAvatarURL({ size: 128 }) },
  };
}

function verifiedWelcomeEmbed(member) {
  return {
    color: 0xb8e6b0,
    author: { name: `✿ ｡ﾟ  recepção  ﾟ｡ ✿` },
    description: [
      `💐 ｡ﾟ  **bem-vinda/o, ${member.displayName}**  ✧ﾟ｡`,
      '',
      `› acabaste de entrar no servidor ♡`,
      `› diverte-te e sente-te em casa ⊰`,
      '',
      `𝘯𝘢𝘰 𝘵𝘦𝘯𝘩𝘢𝘴 𝘷𝘦𝘳𝘨𝘰𝘯𝘩𝘢 𝘥𝘦 𝘤𝘰𝘯𝘷𝘦𝘳𝘴𝘢𝘳 𝘤𝘰𝘮 𝘢 𝘨𝘦𝘯𝘵𝘦 !!`,
    ].join('\n'),
    thumbnail: { url: member.user.displayAvatarURL({ size: 128 }) },
    footer: { text: `${config.bot.nome} ⊹ ♡ ⊹ recepção` },
  };
}

function fashionPanelEmbed() {
  return {
    color: 0xffb7c5,
    author: { name: '✿  fashion check  ✿' },
    description: [
      '₊˚⊹ **como funciona** ⊹˚₊',
      '',
      '› envia uma foto do teu outfit ou peça',
      '› a comunidade vota com **✅ SIM** ou **❌ NÃO**',
      '› no fim do mês recebes um resumo por DM ♡',
    ].join('\n'),
    footer: { text: `${config.bot.nome} · fashion check` },
  };
}

function fashionMonthlyReportEmbed({ yes, no, monthLabel }) {
  const total = yes + no;
  return {
    color: 0xffb7c5,
    author: { name: '✿ fashion check · resumo mensal ✿' },
    description: [
      `₊˚⊹ **${monthLabel}** ⊹˚₊`,
      '',
      'Obrigada por participares no canal fashion ♡',
      '',
      `› **${yes}** reações **SIM** ✅`,
      `› **${no}** reações **NÃO** ❌`,
      total > 0 ? `› **${total}** votos no total ⊹` : null,
    ].filter(Boolean).join('\n'),
    footer: { text: `${config.bot.nome} · fashion check` },
  };
}

function musicHelpEmbed() {
  const p = config.bot.prefix;
  return {
    color: 0xc4b5fd,
    author: { name: '✿ como usar o cantinho da música ✿' },
    description: [
      '₊˚⊹ **partilhar é automático** ⊹˚₊',
      '',
      'É só colares o **link** da tua música, álbum, playlist ou artista aqui no canal.',
      'Eu leio o link sozinha e mostro o **nome**, **artista** e **capa** ♡',
      '',
      '**Plataformas que entendo** ♫',
      '› Spotify · YouTube · SoundCloud · Deezer · Apple Music',
      '',
      '**O teu histórico fica guardado** ✦',
      'Tudo o que partilhas vai para o teu perfil musical pessoal.',
      '',
      '**Comandos** ⊰',
      `› \`${p}musica perfil\` — o teu perfil (músicas, álbuns, playlists, artistas)`,
      `› \`${p}musica perfil @alguém\` — ver o perfil de outra pessoa`,
      `› \`${p}musica historico\` — as tuas últimas partilhas`,
      '',
      'Cola um link e experimenta ୨୧',
    ].join('\n'),
    footer: { text: `${config.bot.nome} · cantinho da música` },
  };
}

function musicPanelEmbed() {
  return {
    color: 0xc4b5fd,
    author: { name: '✿ cantinho da música ✿' },
    description: [
      '## Bem-vinda ao cantinho da música <a:b_star:1520081959886262332>',
      '',
      'Aqui podes partilhar as tuas músicas favoritas, artistas que adoras, playlists, álbuns e tudo o que faz parte do teu mundo musical.',
      'Desde pop a rock, k-pop, metal, indie ou lo-fi, todos os gostos são bem-vindos ୨୧',
      '',
      '**Partilha as tuas descobertas** <:9arrowright:1520081294833225849>',
      '',
      '▸ Recomenda músicas, artistas, álbuns ou playlists;',
      '▸ Mostra o que tens ouvido ultimamente;',
      '▸ Partilha lançamentos, concertos ou novidades musicais;',
      '▸ Troca opiniões e encontra pessoas com gostos parecidos.',
      '',
      '**Mantém o canal organizado e acolhedor para todas.** <a:124:1520080775028936784>',
      '',
      '▸ Respeita os gostos musicais de cada pessoa;',
      '▸ Evita discussões desnecessárias sobre artistas ou géneros;',
      '▸ Utiliza este espaço apenas para assuntos relacionados com música;',
      '▸ Partilha links e recomendações de forma organizada.',
      '',
      'Usem e abusem das recomendações, porque nunca se sabe quando a próxima música favorita está à espera de ser descoberta.',
    ].join('\n'),
    footer: { text: `${config.bot.nome} · cantinho da música` },
  };
}

const PLATFORM_LABELS = {
  spotify: 'Spotify',
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  deezer: 'Deezer',
  apple: 'Apple Music',
};

const TYPE_LABELS = {
  track: 'Música',
  album: 'Álbum',
  playlist: 'Playlist',
  artist: 'Artista',
  video: 'Vídeo',
  unknown: 'Link',
};

function musicShareEmbed(share, member) {
  const platform = PLATFORM_LABELS[share.platform] || share.platform;
  const type = TYPE_LABELS[share.type] || share.type;
  const lines = [
    `₊˚⊹ **${share.title || 'Sem título'}** ⊹˚₊`,
    '',
    share.artist ? `› **Artista:** ${share.artist}` : null,
    share.album ? `› **Álbum:** ${share.album}` : null,
    `› **Tipo:** ${type}`,
    `› **Plataforma:** ${platform}`,
    `› **Partilhado por:** ${member}`,
  ].filter(Boolean);

  return {
    color: 0xc4b5fd,
    description: lines.join('\n'),
    thumbnail: share.thumbnail ? { url: share.thumbnail } : undefined,
    footer: { text: `${config.bot.nome} · cantinho da música` },
  };
}

function musicProfileEmbed(user, profile) {
  const shares = profile?.shares || [];
  const byType = { track: [], album: [], playlist: [], artist: [], video: [], unknown: [] };

  for (const share of shares) {
    const key = byType[share.type] ? share.type : 'unknown';
    byType[key].push(share);
  }

  const formatList = (items, limit = 5) => {
    if (!items.length) return '— nenhum —';
    return items.slice(-limit).reverse().map((s) => `• ${s.title}${s.artist ? ` — *${s.artist}*` : ''}`).join('\n');
  };

  const total = shares.length;
  const fields = [
    { name: `🎵 Músicas (${byType.track.length})`, value: formatList(byType.track), inline: false },
    { name: `💿 Álbuns (${byType.album.length})`, value: formatList(byType.album), inline: false },
    { name: `📀 Playlists (${byType.playlist.length})`, value: formatList(byType.playlist), inline: false },
    { name: `🎤 Artistas (${byType.artist.length})`, value: formatList(byType.artist), inline: false },
  ];

  return {
    color: 0xc4b5fd,
    author: {
      name: `✿ perfil musical de ${user.displayName || user.username} ✿`,
      icon_url: user.displayAvatarURL({ size: 128 }),
    },
    description: total
      ? `**${total}** partilha${total === 1 ? '' : 's'} no cantinho da música ♡`
      : 'Ainda não partilhou nada no cantinho da música.',
    fields: total ? fields : undefined,
    footer: { text: `${config.bot.nome} · cantinho da música` },
  };
}

function joinDmEmbed(member, settings = {}) {
  const invite = settings.banAppealInvite || config.joinDm?.banAppealInvite;
  const message = settings.message || config.joinDm?.message
    || 'Caso sejas banida/o do servidor, aqui está o servidor de ban appeals:';

  return {
    color: 0x57f287,
    description: [
      `Bem-vinda/o ${member}!`,
      '',
      message,
      invite,
    ].join('\n'),
    footer: { text: config.bot.nome },
  };
}

function apoiaEmbed() {
  const apoio = config.apoio || {};
  const revolut = apoio.revolutUrl || 'https://checkout.revolut.com/pay/9b60e0bf-18bd-486a-9b88-74cb30b68c8a';
  const pix = apoio.pixKey || 'juliareboucasleite@gmail.com';
  const p = config.bot.prefix;

  return {
    color: 0xffb7c5,
    author: { name: '✿ apoia o Failuerc ✿' },
    description: [
      '₊˚⊹ **obrigada por considerares apoiar o projeto** ⊹˚₊',
      '',
      'O Failuerc é gratuito, mas qualquer ajuda mantém o bot e o servidor online ♡',
      '',
      'Podes pagar por **Revolut** ou **PIX** — escolhe o que for mais fácil para ti.',
    ].join('\n'),
    fields: [
      {
        name: '💳 Revolut',
        value: `[Pagar com Revolut](${revolut})`,
        inline: true,
      },
      {
        name: '📱 PIX',
        value: `**Chave:** \`${pix}\``,
        inline: true,
      },
    ],
    footer: { text: `${config.bot.nome} · ${p}apoia` },
  };
}

module.exports = {
  COR,
  verificationPanel,
  ticketPanel,
  ticketOpened,
  ticketClaimSuccess,
  ticketClosedDm,
  formatTicketDate,
  reactionRolePanel,
  successEmbed,
  errorEmbed,
  infoEmbed,
  verifiedLogEmbed,
  verificationWaitingEmbed,
  communityPostEmbed,
  anonymousConfessionEmbed,
  suggestionPanelEmbed,
  suggestionPostEmbed,
  verifiedNotifyEmbed,
  waitingNotifyEmbed,
  verifiedWelcomeEmbed,
  fashionPanelEmbed,
  fashionMonthlyReportEmbed,
  musicPanelEmbed,
  musicHelpEmbed,
  musicShareEmbed,
  musicProfileEmbed,
  joinDmEmbed,
  apoiaEmbed,
};
