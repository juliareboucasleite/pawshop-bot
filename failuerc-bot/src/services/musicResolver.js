const PLATFORM_PATTERNS = [
  {
    platform: 'spotify',
    test: /(?:open\.)?spotify\.com\/(track|album|playlist|artist)\//i,
    typeFromPath: true,
  },
  {
    platform: 'spotify',
    test: /spotify\.link\/|spoti\.fi\//i,
    type: 'unknown',
  },
  {
    platform: 'youtube',
    test: /(?:youtube\.com\/watch|youtu\.be\/|music\.youtube\.com\/watch)/i,
    type: 'video',
  },
  {
    platform: 'soundcloud',
    test: /soundcloud\.com\//i,
    type: 'track',
  },
  {
    platform: 'deezer',
    test: /deezer\.com\/(?:\w+\/)?(track|album|playlist|artist)\//i,
    typeFromPath: true,
  },
  {
    platform: 'apple',
    test: /(?:music\.)?apple\.com\//i,
    type: 'unknown',
  },
];

const OEMBED_ENDPOINTS = {
  spotify: (url) => `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
  youtube: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  soundcloud: (url) => `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  deezer: (url) => `https://api.deezer.com/oembed?url=${encodeURIComponent(url)}`,
  apple: (url) => `https://embed.music.apple.com/oembed?url=${encodeURIComponent(url)}`,
};

function cleanUrl(raw) {
  return raw.replace(/[<>)\]}.,!?]+$/g, '');
}

function detectMusicLink(url) {
  for (const pattern of PLATFORM_PATTERNS) {
    if (!pattern.test.test(url)) continue;

    let type = pattern.type || 'unknown';
    if (pattern.typeFromPath) {
      const match = url.match(/\/(track|album|playlist|artist)\//i);
      if (match) type = match[1].toLowerCase();
    }

    return { platform: pattern.platform, type };
  }
  return null;
}

function extractMusicUrls(text) {
  const matches = text.match(/https?:\/\/[^\s<]+/gi) || [];
  const seen = new Set();
  const results = [];

  for (const raw of matches) {
    const url = cleanUrl(raw);
    if (seen.has(url)) continue;

    const info = detectMusicLink(url);
    if (!info) continue;

    seen.add(url);
    results.push({ url, ...info });
  }

  return results;
}

async function followRedirect(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.url || url;
  } catch {
    return url;
  }
}

function parseTitleParts(title, platform) {
  if (!title) return { title: null, artist: null, album: null };

  let parsedTitle = title.trim();
  let artist = null;
  let album = null;

  if (platform === 'spotify') {
    const byDot = parsedTitle.split('·').map((s) => s.trim());
    if (byDot.length >= 2) {
      parsedTitle = byDot[0];
      artist = byDot.slice(1).join(' · ');
    } else {
      const byDash = parsedTitle.split(' - ');
      if (byDash.length >= 2) {
        parsedTitle = byDash[0].trim();
        artist = byDash.slice(1).join(' - ').trim();
      }
    }
  } else if (platform === 'youtube') {
    artist = null;
  } else if (platform === 'deezer') {
    const byDash = parsedTitle.split(' - ');
    if (byDash.length >= 2) {
      artist = byDash[0].trim();
      parsedTitle = byDash.slice(1).join(' - ').trim();
    }
  }

  return { title: parsedTitle, artist, album };
}

async function fetchOEmbed(platform, url) {
  const build = OEMBED_ENDPOINTS[platform];
  if (!build) return null;

  try {
    const res = await fetch(build(url), {
      headers: { 'User-Agent': 'FailuercBot/1.0' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const SONGLINK_TYPE_MAP = {
  song: 'track',
  album: 'album',
  playlist: 'playlist',
  artist: 'artist',
};

async function fetchSonglink(url) {
  try {
    const res = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'FailuercBot/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const entities = Object.values(data.entitiesByUniqueId || {});
    if (!entities.length) return null;

    const preferred = entities.find((e) => e.apiProvider === 'spotify')
      || entities.find((e) => e.apiProvider === 'youtube')
      || entities.find((e) => e.apiProvider === 'deezer')
      || entities[0];

    return {
      title: preferred.title,
      artist: preferred.artistName || null,
      album: preferred.type === 'album' ? preferred.title : null,
      thumbnail: preferred.thumbnailUrl || null,
      type: SONGLINK_TYPE_MAP[preferred.type] || 'unknown',
    };
  } catch {
    return null;
  }
}

async function resolveMusicLink(link) {
  let url = link.url;
  let type = link.type;
  let platform = link.platform;

  if (platform === 'spotify' && /spotify\.link|spoti\.fi/i.test(url)) {
    url = await followRedirect(url);
    const redetected = detectMusicLink(url);
    if (redetected) {
      platform = redetected.platform;
      type = redetected.type;
    }
  }

  const oembed = await fetchOEmbed(platform, url);
  const songlink = await fetchSonglink(url);

  const rawTitle = songlink?.title || oembed?.title || null;
  const parsed = parseTitleParts(rawTitle, platform);

  if (songlink?.artist) parsed.artist = songlink.artist;
  if (songlink?.album) parsed.album = songlink.album;
  if (platform === 'youtube' && oembed?.author_name && !parsed.artist) {
    parsed.artist = oembed.author_name;
  }

  if (type === 'album' && parsed.title && !parsed.album) {
    parsed.album = parsed.title;
  }

  const resolvedType = songlink?.type && songlink.type !== 'unknown' ? songlink.type : type;

  return {
    url,
    platform,
    type: resolvedType,
    title: parsed.title || rawTitle || 'Sem título',
    artist: parsed.artist,
    album: parsed.album,
    thumbnail: songlink?.thumbnail || oembed?.thumbnail_url || null,
  };
}

module.exports = {
  extractMusicUrls,
  resolveMusicLink,
  detectMusicLink,
};
