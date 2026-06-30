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
    confissao: { title: 'Confissão', color: 0x9b59b6 },
    desabafo: { title: 'Desabafo', color: 0x3498db },
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
    title: 'Sugestões',
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
    author: { name: `Nova sugestão` },
    description: [
      `Nova sugestão de ${author}`,
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
    author: { name: `Recepção` },
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
    author: { name: 'Fashion check' },
    description: [
      '₊˚⊹ **como funciona** ⊹˚₊',
      '',
      '› envia uma foto do teu outfit ou peça',
      '› a comunidade vota com <:i_amei:> ou <:i_odiei:>',
      '› no fim do mês recebes um resumo por DM ♡',
    ].join('\n'),
    footer: { text: `${config.bot.nome} · fashion check` },
  };
}

function fashionMonthlyReportEmbed({ yes, no, monthLabel }) {
  const total = yes + no;
  return {
    color: 0xffb7c5,
    author: { name: 'Fashion check: Resumo mensal' },
    description: [
      `₊˚⊹ **${monthLabel}** ⊹˚₊`,
      '',
      'Obrigada por participares no canal fashion ♡',
      '',
      `› **${yes}** reações <:i_amei:>`,
      `› **${no}** reações <:i_odiei:>`,
      total > 0 ? `› **${total}** votos no total ⊹` : null,
    ].filter(Boolean).join('\n'),
    footer: { text: `${config.bot.nome} · fashion check` },
  };
}

function musicHelpEmbed() {
  const p = config.bot.prefix;
  return {
    color: 0xc4b5fd,
    author: { name: 'Como usar o cantinho da música' },
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
    author: { name: 'Cantinho da música' },
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
    { name: `Músicas (${byType.track.length})`, value: formatList(byType.track), inline: false },
    { name: `Álbuns (${byType.album.length})`, value: formatList(byType.album), inline: false },
    { name: `Playlists (${byType.playlist.length})`, value: formatList(byType.playlist), inline: false },
    { name: `Artistas (${byType.artist.length})`, value: formatList(byType.artist), inline: false },
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

function moderationLogEmbed(action, details = {}) {
  const labels = {
    limpar: 'Mensagens apagadas',
    nuke: 'Canal recriado (nuke)',
    expulsar: 'Membro expulso',
    banir: 'Membro banido',
    silenciar: 'Membro silenciado',
    dessilenciar: 'Silenciamento removido',
    convites: 'Bloqueador de convites',
    aviso: '⚠️ Advertência',
    antispam: '🚫 Anti-spam',
  };

  const lines = [];
  if (details.moderator) lines.push(`**Moderador:** ${details.moderator}`);
  if (details.target) lines.push(`**Membro:** ${details.target}`);
  if (details.channel) lines.push(`**Canal:** ${details.channel}`);
  if (details.amount != null) lines.push(`**Quantidade:** ${details.amount}`);
  if (details.minutes != null) lines.push(`**Duração:** ${details.minutes} min`);
  if (details.reason) lines.push(`**Motivo:** ${details.reason}`);
  if (details.extra) lines.push(details.extra);

  return {
    ...baseEmbed(),
    title: labels[action] || 'Moderação',
    description: lines.join('\n') || '—',
    footer: { text: `${config.bot.nome} · moderação` },
  };
}

function modHelpEmbed() {
  const p = config.bot.prefix;
  return {
    ...baseEmbed(),
    title: 'Ferramentas de moderação',
    description: [
      '**Limpeza**',
      `\`${p}limpar 50\` — apaga até 100 mensagens`,
      `\`${p}limpar 30 @membro\` — apaga mensagens de um membro`,
      `\`${p}nuke confirmar\` — recria o canal (apaga tudo)`,
      '',
      '**Ações em membros**',
      `\`${p}mod expulsar @membro [motivo]\``,
      `\`${p}mod banir @membro [motivo]\``,
      `\`${p}mod silenciar @membro 60 [motivo]\` — minutos`,
      `\`${p}mod dessilenciar @membro\``,
      '',
      '**Convites & scan**',
      `\`${p}mod convites on\` / \`off\``,
      `\`${p}mod convites scan [#canal] [limite]\` — procura convites antigos`,
      '',
      '**Avisos**',
      `\`${p}mod avisar @membro [motivo]\``,
      `\`${p}mod avisos @membro\` — ver avisos`,
      `\`${p}mod limpar-avisos @membro\``,
      '',
      '**Anti-spam**',
      `\`${p}mod antispam on\` / \`off\``,
      '',
      '**Painéis**',
      `\`${p}faq painel\` — painel de infos com menu`,
      '',
      'Também disponível via **/moderacao**.',
    ].join('\n'),
    footer: { text: `${config.bot.nome} · moderação` },
  };
}

function apoiaEmbed() {
  const apoio = config.apoio || {};
  const revolut = apoio.revolutUrl || 'https://checkout.revolut.com/pay/9b60e0bf-18bd-486a-9b88-74cb30b68c8a';
  const pix = apoio.pixKey || 'juliareboucasleite@gmail.com';
  const p = config.bot.prefix;

  return {
    color: 0xffb7c5,
    author: { name: 'Apoia a Failuerc' },
    description: [
      '₊˚⊹ **Obrigada por considerares apoiar o projeto** ⊹˚₊',
      '',
      'O Failuerc é gratuito, mas qualquer ajuda mantém o bot e o servidor online ♡',
      '',
      'Podes pagar por **Revolut** ou **PIX**, escolhe o que for mais fácil para ti.',
    ].join('\n'),
    fields: [
      {
        name: 'Revolut',
        value: `[Pagar com Revolut](${revolut})`,
        inline: true,
      },
      {
        name: 'PIX',
        value: `**Chave:** \`${pix}\``,
        inline: true,
      },
    ],
    footer: { text: `${config.bot.nome} · ${p}apoia` },
  };
}

const COR_LAVANDA = parseInt((config.bot.corLavanda || '#ff8a94').replace('#', ''), 16);

function faqPanelEmbed(panel) {
  return {
    color: COR_LAVANDA,
    title: panel.title || 'Informações',
    description: (panel.intro || []).join('\n'),
    footer: { text: panel.footer || `${config.bot.nome} ⊹ infos` },
  };
}

function faqTopicEmbed(topic, panel) {
  return {
    color: COR_LAVANDA,
    title: topic.title || topic.label,
    description: (topic.lines || []).join('\n'),
    footer: { text: panel.footer || `${config.bot.nome} ⊹ infos` },
  };
}

function commandSuggestEmbed(suggestedCommand, wrongAttempt) {
  const p = config.bot.prefix;
  return {
    color: COR_LAVANDA,
    description: [
      'ʚ⊹ **ops!** parece que te enganaste no comando ⊹ɞ',
      '',
      wrongAttempt ? `escreveste \`${wrongAttempt}\`` : null,
      `querias usar **\`${suggestedCommand}\`**? ♡`,
      '',
      '₊ ↷ tenta outra vez — estou aqui pra ajudar ໒꒱',
      '',
      `꒰ dica: o meu prefixo é \`${p}\` ꒱`,
    ].filter(Boolean).join('\n'),
    footer: { text: `${config.bot.nome} ⊹ ♡ ⊹ ajuda` },
  };
}

function warnListEmbed(user, warnings) {
  if (!warnings.length) {
    return infoEmbed('Avisos', `${user} não tem avisos registados.`);
  }

  const lines = warnings.map((w, i) => (
    `**${i + 1}.** ${w.reason}\n› por ${w.moderatorTag} · <t:${Math.floor(new Date(w.at).getTime() / 1000)}:R>`
  ));

  return {
    ...baseEmbed(),
    title: `⚠️ Avisos de ${user.username}`,
    description: lines.join('\n\n'),
    footer: { text: `${warnings.length} aviso(s) · ${config.bot.nome}` },
  };
}

function giveawayActiveEmbed(giveaway, hostUser) {
  const endsUnix = Math.floor(new Date(giveaway.endsAt).getTime() / 1000);
  const entrants = giveaway.entrants?.length || 0;

  const lines = [
    '₊˚⊹ **participa no sorteio** ⊹˚₊',
    '',
    `⊹ **prémio:** ${giveaway.prize}`,
    `⊹ **termina:** <t:${endsUnix}:R> (<t:${endsUnix}:f>)`,
    `⊹ **vencedores:** ${giveaway.winnersCount}`,
    `⊹ **participantes:** ${entrants}`,
    '',
    'clica em **Participar** para entrar ♡',
  ];

  if (giveaway.requiredRoleId) {
    lines.splice(5, 0, `⊹ **cargo necessário:** <@&${giveaway.requiredRoleId}>`);
  }

  return {
    color: COR_LAVANDA,
    title: `🎉 ${giveaway.title}`,
    description: lines.join('\n'),
    footer: {
      text: `${config.bot.nome} · sorteio #${giveaway.id} · por ${hostUser?.username || 'staff'}`,
    },
  };
}

function giveawayEndedEmbed(giveaway, winnerMentions) {
  const entrants = giveaway.entrants?.length || 0;
  const lines = [
    `⊹ **prémio:** ${giveaway.prize}`,
    `⊹ **participantes:** ${entrants}`,
    '',
    winnerMentions.length
      ? `🏆 **vencedor(es):** ${winnerMentions.join(', ')}`
      : '😔 **ninguém participou** — sorteio encerrado sem vencedor.',
  ];

  return {
    color: winnerMentions.length ? 0x57f287 : 0x95a5a6,
    title: `🎉 ${giveaway.title} — terminado`,
    description: lines.join('\n'),
    footer: { text: `${config.bot.nome} · sorteio #${giveaway.id}` },
  };
}

function giveawayHelpEmbed() {
  const p = config.bot.prefix;
  return {
    color: COR_LAVANDA,
    title: '🎁 Sorteios',
    description: [
      '**Criar sorteio**',
      `\`${p}sorteio criar Título | horas | prémio\``,
      `\`${p}sorteio criar Título | 24 | 1 mês Nitro | 2\` — 2 vencedores`,
      `\`${p}sorteio criar Título | 12 | VIP | 1 | @cargo\` — exige cargo`,
      '',
      '**Gerir**',
      `\`${p}sorteio list\` — sorteios ativos`,
      `\`${p}sorteio cancelar <id>\` — cancela`,
      `\`${p}sorteio reroll <id>\` — novo vencedor`,
      `\`${p}sorteio end <id>\` — terminar agora`,
      '',
      'Usa `|` para separar título, horas, prémio e opcionais.',
    ].join('\n'),
    footer: { text: `${config.bot.nome} · sorteios` },
  };
}

function rankProfileEmbed(user, profile, guildName) {
  const { messages, level, tier, next, position } = profile;
  const lines = [
    '₊˚⊹ **o teu progresso** ⊹˚₊',
    '',
    `⊹ **mensagens:** ${messages}`,
    `⊹ **nível:** ${level}`,
    tier
      ? `⊹ **rank atual:** ${tier.label} (nível ${tier.level})`
      : '⊹ **rank atual:** — ainda sem rank —',
    next
      ? `⊹ **próximo rank:** ${next.label} — faltam **${next.messages - messages}** mensagens`
      : '⊹ **próximo rank:** máximo alcançado ♡',
  ];

  if (position) {
    lines.push(`⊹ **posição no servidor:** #${position}`);
  }

  return {
    color: COR_LAVANDA,
    author: { name: user.username, iconURL: user.displayAvatarURL({ size: 64 }) },
    title: '🏆 Rank',
    description: lines.join('\n'),
    footer: { text: `${config.bot.nome} · ${guildName}` },
  };
}

function rankLeaderboardEmbed(entries, guildName) {
  if (!entries.length) {
    return infoEmbed('Ranking', 'Ainda não há dados. Interage no servidor para subir de rank!');
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = entries.map((e, i) => {
    const medal = medals[i] || `**${i + 1}.**`;
    const tierLabel = e.tier?.label ? ` · ${e.tier.label}` : '';
    return `${medal} <@${e.userId}> — **${e.messages}** msgs · nível **${e.level}**${tierLabel}`;
  });

  return {
    color: COR_LAVANDA,
    title: '🏆 Top ranking',
    description: lines.join('\n'),
    footer: { text: `${config.bot.nome} · ${guildName}` },
  };
}

function rankTiersEmbed(tiers) {
  if (!tiers.length) {
    return infoEmbed('Ranks', 'Nenhum rank configurado.');
  }

  const lines = tiers.map((t) => {
    const role = t.roleId ? ` → <@&${t.roleId}>` : ' → *sem cargo*';
    return `**${t.label}** — nível **${t.level}** · **${t.messages}** mensagens${role}`;
  });

  return {
    color: COR_LAVANDA,
    title: '🎖️ Ranks por mensagens',
    description: [
      'Quanto mais participas no servidor, mais mensagens acumulas e desbloqueias ranks.',
      '',
      ...lines,
    ].join('\n'),
    footer: { text: `${config.bot.nome} · ranking` },
  };
}

function levelUpEmbed(member, tier) {
  return {
    color: 0x57f287,
    title: '🎉 Subiste de rank!',
    description: [
      `${member} alcançou **${tier.label}**!`,
      '',
      `⊹ **nível:** ${tier.level}`,
      `⊹ **mensagens:** ${tier.messages}+`,
      '',
      'Obrigada por fazer parte da comunidade ♡',
    ].join('\n'),
    footer: { text: `${config.bot.nome} · ranking` },
  };
}

function rankHelpEmbed() {
  const p = config.bot.prefix;
  return {
    color: COR_LAVANDA,
    title: '🏆 Sistema de Rank',
    description: [
      'Ganhas **1 mensagem contada** a cada interação (cooldown de 45s).',
      '**Nível** = mensagens ÷ 10 (ex.: 300 msgs = nível 30).',
      '',
      '**Membros**',
      `\`${p}rank\` — o teu rank`,
      `\`${p}rank @membro\` — rank de alguém`,
      `\`${p}rank top\` — top 10`,
      `\`${p}rank ranks\` — lista de ranks e requisitos`,
      '',
      '**Staff**',
      `\`${p}rank on\` / \`off\` — ativar sistema`,
      `\`${p}rank tier 300 @cargo Nome do Rank\` — definir cargo num marco`,
      `\`${p}rank tier list\` — ver marcos`,
      `\`${p}rank reset @membro\` — resetar um membro`,
    ].join('\n'),
    footer: { text: `${config.bot.nome} · ranking` },
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
  moderationLogEmbed,
  modHelpEmbed,
  faqPanelEmbed,
  faqTopicEmbed,
  commandSuggestEmbed,
  warnListEmbed,
  giveawayActiveEmbed,
  giveawayEndedEmbed,
  giveawayHelpEmbed,
  rankProfileEmbed,
  rankLeaderboardEmbed,
  rankTiersEmbed,
  levelUpEmbed,
  rankHelpEmbed,
};
