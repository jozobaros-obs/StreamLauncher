'use strict';

// All streaming sites pulled from FMHY with URL pattern support
const SITES = [
  // ── Movies & TV ──────────────────────────────────────────────────────────
  {
    id: 'cineby',
    name: 'Cineby',
    url: 'https://www.cineby.sc',
    category: 'movies-tv',
    color: '#e50914',
    badge: '4K',
    description: 'Fast multi-source streaming',
    getMovieUrl: (id) => `https://www.cineby.sc/movie/${id}`,
    getTvUrl:    (id, s, e) => `https://www.cineby.sc/tv/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'bitcine',
    name: 'BitCine',
    url: 'https://www.bitcine.tv',
    category: 'movies-tv',
    color: '#0070f3',
    badge: 'HD',
    description: 'Movies and TV shows',
    getMovieUrl: (id) => `https://www.bitcine.tv/movie/${id}`,
    getTvUrl:    (id, s, e) => `https://www.bitcine.tv/tv/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'rive',
    name: 'Rive',
    url: 'https://rive.stream',
    category: 'movies-tv',
    color: '#7c3aed',
    badge: '4K',
    description: 'Ultra-quality streaming',
    getMovieUrl: (id) => `https://rive.stream/movie/${id}`,
    getTvUrl:    (id, s, e) => `https://rive.stream/tv/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'vidsrc',
    name: 'VidSrc',
    url: 'https://vidsrc.to',
    category: 'movies-tv',
    color: '#f59e0b',
    badge: 'HD',
    description: 'Large catalogue, multiple servers',
    getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl:    (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'vidsrc2',
    name: 'VidSrc.me',
    url: 'https://vidsrc.me',
    category: 'movies-tv',
    color: '#f59e0b',
    badge: 'HD',
    description: 'Alternative VidSrc server',
    getMovieUrl: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
    getTvUrl:    (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'embedsu',
    name: 'Embed.su',
    url: 'https://embed.su',
    category: 'movies-tv',
    color: '#06b6d4',
    badge: 'HD',
    description: 'Clean embed-based player',
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl:    (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: '2embed',
    name: '2Embed',
    url: 'https://www.2embed.cc',
    category: 'movies-tv',
    color: '#ec4899',
    badge: 'HD',
    description: 'Embed player with many sources',
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl:    (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'braflix',
    name: 'Braflix',
    url: 'https://www.braflix.space',
    category: 'movies-tv',
    color: '#10b981',
    badge: 'HD',
    description: 'Wide movie and series selection',
    getMovieUrl: (id) => `https://www.braflix.space/movie/${id}`,
    getTvUrl:    (id, s, e) => `https://www.braflix.space/tv/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'theflixtor',
    name: 'TheFliXtor',
    url: 'https://www.theflixtor.to',
    category: 'movies-tv',
    color: '#f97316',
    badge: 'HD',
    description: 'Large streaming library',
    getMovieUrl: (id) => `https://www.theflixtor.to/film/${id}`,
    getTvUrl:    (id, s, e) => `https://www.theflixtor.to/tv/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'bflix',
    name: 'BFlix',
    url: 'https://bflix.gg',
    category: 'movies-tv',
    color: '#6366f1',
    badge: 'HD',
    description: 'Movies and TV series',
    getMovieUrl: (id) => `https://bflix.gg/movie/${id}`,
    getTvUrl:    (id, s, e) => `https://bflix.gg/tv/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'freek',
    name: 'Freek',
    url: 'https://freek.to',
    category: 'movies-tv',
    color: '#14b8a6',
    badge: 'HD',
    description: 'Free streaming collection',
    getMovieUrl: (id) => `https://freek.to/film/${id}`,
    getTvUrl:    (id, s, e) => `https://freek.to/serie/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'cataz',
    name: 'Cataz',
    url: 'https://cataz.net',
    category: 'movies-tv',
    color: '#fb923c',
    badge: 'HD',
    description: 'Browse and stream free content',
    getMovieUrl: (id) => `https://cataz.net/watch-movie-${id}.html`,
    getTvUrl:    (id, s, e) => `https://cataz.net/watch-tvshow-${id}-season-${s}-episode-${e}.html`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'pressplay',
    name: 'PressPlay',
    url: 'https://pressplay.top',
    category: 'movies-tv',
    color: '#a855f7',
    badge: 'HD',
    description: 'Clean modern streaming UI',
    getMovieUrl: (id) => `https://pressplay.top/movie/${id}`,
    getTvUrl:    (id, s, e) => `https://pressplay.top/tv/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'nontongo',
    name: 'Nontongo',
    url: 'https://nontongo.win',
    category: 'movies-tv',
    color: '#22c55e',
    badge: 'HD',
    description: 'Free movies and shows',
    getMovieUrl: (id) => `https://nontongo.win/film/${id}`,
    getTvUrl:    (id, s, e) => `https://nontongo.win/tv/${id}/${s}/${e}`,
    hasTmdbDeepLink: true,
  },
  {
    id: 'movieorca',
    name: 'MovieOrca',
    url: 'https://movieorca.com',
    category: 'movies-tv',
    color: '#3b82f6',
    badge: 'HD',
    description: 'Movies and TV shows',
    getMovieUrl: () => 'https://movieorca.com',
    getTvUrl:    () => 'https://movieorca.com',
    hasTmdbDeepLink: false,
  },
  {
    id: 'hdtoday',
    name: 'HDToday',
    url: 'https://hdtoday.tv',
    category: 'movies-tv',
    color: '#ef4444',
    badge: 'HD',
    description: 'HD quality free streaming',
    getMovieUrl: () => 'https://hdtoday.tv',
    getTvUrl:    () => 'https://hdtoday.tv',
    hasTmdbDeepLink: false,
  },

  // ── Live TV ──────────────────────────────────────────────────────────────
  {
    id: 'plutotv',
    name: 'Pluto TV',
    url: 'https://pluto.tv',
    category: 'live-tv',
    color: '#00b0e6',
    badge: 'LIVE',
    description: '250+ free live TV channels',
    getUrl: () => 'https://pluto.tv',
    hasTmdbDeepLink: false,
  },
  {
    id: 'tubi',
    name: 'Tubi TV',
    url: 'https://tubitv.com',
    category: 'live-tv',
    color: '#fa4616',
    badge: 'FREE',
    description: 'Free movies, TV shows & live',
    getUrl: () => 'https://tubitv.com',
    hasTmdbDeepLink: false,
  },
  {
    id: 'plex',
    name: 'Plex',
    url: 'https://app.plex.tv',
    category: 'live-tv',
    color: '#e5a00d',
    badge: 'FREE',
    description: 'Free tier with live TV & VOD',
    getUrl: () => 'https://app.plex.tv/desktop/#!/stream',
    hasTmdbDeepLink: false,
  },
  {
    id: 'peacock',
    name: 'Peacock',
    url: 'https://peacocktv.com',
    category: 'live-tv',
    color: '#7b68ee',
    badge: 'FREE',
    description: 'NBC free tier - news & sports',
    getUrl: () => 'https://peacocktv.com',
    hasTmdbDeepLink: false,
  },
  {
    id: 'stirr',
    name: 'Stirr',
    url: 'https://stirr.com',
    category: 'live-tv',
    color: '#ff6b35',
    badge: 'LIVE',
    description: 'Free local & national TV',
    getUrl: () => 'https://stirr.com',
    hasTmdbDeepLink: false,
  },
  {
    id: 'newsmax',
    name: 'Newsmax',
    url: 'https://www.newsmax.com/live',
    category: 'live-tv',
    color: '#1565c0',
    badge: 'LIVE',
    description: 'Free live news streaming',
    getUrl: () => 'https://www.newsmax.com/live',
    hasTmdbDeepLink: false,
  },
];

/**
 * Get all unique hostnames for navigation whitelist
 */
function getAllDomains() {
  return SITES.map(s => {
    try { return new URL(s.url).hostname; } catch { return null; }
  }).filter(Boolean);
}

/**
 * Get streaming URL for a movie site
 */
function getMovieUrl(siteId, tmdbId) {
  const site = SITES.find(s => s.id === siteId);
  if (!site || !site.getMovieUrl) return site?.url || '#';
  return site.getMovieUrl(tmdbId);
}

/**
 * Get streaming URL for a TV episode
 */
function getTvUrl(siteId, tmdbId, season, episode) {
  const site = SITES.find(s => s.id === siteId);
  if (!site || !site.getTvUrl) return site?.url || '#';
  return site.getTvUrl(tmdbId, season, episode);
}

module.exports = { SITES, getAllDomains, getMovieUrl, getTvUrl };
