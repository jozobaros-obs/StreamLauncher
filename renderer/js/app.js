'use strict';

const TMDB_BASE    = 'https://api.themoviedb.org/3';
const IMG_BASE     = 'https://image.tmdb.org/t/p';
const FALLBACK     = '🎬';
const TMDB_API_KEY = '319b4e1c9e60f9ba84019c99bd648c96';

// ─── Sources ──────────────────────────────────────────────────────────────────
const SITES = [
  {
    id: 'cineby', name: 'Cineby', color: '#e50914', badge: '4K',
    getMovieUrl: id      => `https://www.cineby.sc/movie/${id}`,
    getTvUrl:   (id,s,e) => `https://www.cineby.sc/tv/${id}/${s}/${e}`,
  },
  {
    id: 'bitcine', name: 'BitCine', color: '#0070f3', badge: 'HD',
    getMovieUrl: id      => `https://www.bitcine.tv/movie/${id}`,
    getTvUrl:   (id,s,e) => `https://www.bitcine.tv/tv/${id}/${s}/${e}`,
  },
];

// ─── Sports Channels (Cineby) ─────────────────────────────────────────────────
const SPORTS = [
  { name:'ESPN',                   icon:'🏈', url:'https://www.cineby.sc/live/espn' },
  { name:'ESPN 2',                 icon:'🏈', url:'https://www.cineby.sc/live/espn-2' },
  { name:'Sky Sports Football',    icon:'⚽', url:'https://www.cineby.sc/live/sky-sports-football' },
  { name:'Sky Sports PL',          icon:'⚽', url:'https://www.cineby.sc/live/sky-sports-premier-league' },
  { name:'Sky Sports Main Event',  icon:'🏆', url:'https://www.cineby.sc/live/sky-sports-main-event' },
  { name:'beIN Sports',            icon:'⚽', url:'https://www.cineby.sc/live/bein-sports' },
  { name:'beIN Sports 2',          icon:'⚽', url:'https://www.cineby.sc/live/bein-sports-2' },
  { name:'TNT Sports 1',           icon:'🥊', url:'https://www.cineby.sc/live/tnt-sports-1' },
  { name:'TNT Sports 2',           icon:'🥊', url:'https://www.cineby.sc/live/tnt-sports-2' },
  { name:'Eurosport 1',            icon:'🚴', url:'https://www.cineby.sc/live/eurosport-1' },
  { name:'Eurosport 2',            icon:'🚴', url:'https://www.cineby.sc/live/eurosport-2' },
  { name:'Fox Sports',             icon:'🏀', url:'https://www.cineby.sc/live/fox-sports' },
  { name:'NBC Sports',             icon:'🏒', url:'https://www.cineby.sc/live/nbc-sports' },
  { name:'DAZN',                   icon:'🏆', url:'https://www.cineby.sc/live/dazn' },
  { name:'Golf Channel',           icon:'⛳', url:'https://www.cineby.sc/live/golf-channel' },
  { name:'Tennis Channel',         icon:'🎾', url:'https://www.cineby.sc/live/tennis-channel' },
  { name:'Eleven Sports',          icon:'⚽', url:'https://www.cineby.sc/live/eleven-sports' },
  { name:'Fight Network',          icon:'🥊', url:'https://www.cineby.sc/live/fight-network' },
];

// ─── State ────────────────────────────────────────────────────────────────────
let settings      = {};
let currentDetail = null;
let heroItems     = [], heroIdx = 0, heroTimer = null;
let searchTimer   = null;
let lastView      = 'view-home';

function getPref() { return localStorage.getItem('preferredSource') || 'cineby'; }
function setPref(id) { localStorage.setItem('preferredSource', id); }
function getSite(id) { return SITES.find(s => s.id === id) || SITES[0]; }

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  settings = await window.electronAPI.getSettings();
  settings.tmdbKey = TMDB_API_KEY;

  window.electronAPI.onPlayerClosed(() => { hidePlayerBar(); showView('view-home'); });

  buildSportsRow();
  buildSitesView();
  await loadTrending();
});

// ─── TMDB ─────────────────────────────────────────────────────────────────────
async function tmdb(ep) {
  try {
    const r = await fetch(`${TMDB_BASE}${ep}${ep.includes('?')?'&':'?'}api_key=${TMDB_API_KEY}`);
    if (!r.ok) throw new Error(r.status);
    return r.json();
  } catch { return null; }
}

// ─── Home ─────────────────────────────────────────────────────────────────────
async function loadTrending() {
  showSpinner(true);
  const [all, movies, topM, tv, topTV] = await Promise.all([
    tmdb('/trending/all/week'),
    tmdb('/trending/movie/week'),
    tmdb('/movie/top_rated'),
    tmdb('/trending/tv/week'),
    tmdb('/tv/top_rated'),
  ]);
  showSpinner(false);

  if (all?.results?.length) {
    heroItems = all.results.slice(0, 8);
    displayHero(heroItems[0]);
    clearInterval(heroTimer);
    heroTimer = setInterval(() => { heroIdx=(heroIdx+1)%heroItems.length; displayHero(heroItems[heroIdx]); }, 8000);
  }
  if (movies?.results) renderRow('row-movies',     movies.results);
  if (topM?.results)   renderRow('row-movies-top', topM.results);
  if (tv?.results)     renderRow('row-tv',         tv.results);
  if (topTV?.results)  renderRow('row-tv-top',     topTV.results);
}

function displayHero(item) {
  if (!item) return;
  const type = item.media_type || (item.title ? 'movie' : 'tv');
  document.getElementById('hero-backdrop').style.backgroundImage =
    item.backdrop_path ? `url("${IMG_BASE}/w1280${item.backdrop_path}")` : '';
  document.getElementById('hero-badge').textContent  = type === 'movie' ? 'FILM' : 'SERIÁL';
  document.getElementById('hero-title').textContent  = item.title || item.name || '';
  document.getElementById('hero-meta').textContent   =
    [(item.release_date||item.first_air_date||'').slice(0,4),
     item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : ''].filter(Boolean).join(' · ');
  document.getElementById('hero-desc').textContent   = item.overview || '';
  document.getElementById('hero-backdrop')._item = item;
}

window.heroPlay = async () => {
  const item = document.getElementById('hero-backdrop')._item;
  if (!item) return;
  const type = item.media_type || (item.title ? 'movie' : 'tv');
  if (type === 'movie') await quickPlay(item.id, 'movie', item.title || item.name);
  else await openDetail(item.id, 'tv', item);
};
window.heroInfo = async () => {
  const item = document.getElementById('hero-backdrop')._item;
  if (!item) return;
  await openDetail(item.id, item.media_type||(item.title?'movie':'tv'), item);
};

// ─── Render Row with Quick-Play ───────────────────────────────────────────────
function renderRow(rowId, items) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = '';
  items.forEach(item => {
    const type   = item.media_type || (item.title ? 'movie' : 'tv');
    const title  = item.title || item.name || '';
    const year   = (item.release_date || item.first_air_date || '').slice(0,4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : '';
    const poster = item.poster_path ? `${IMG_BASE}/w342${item.poster_path}` : null;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${poster ? `<img class="card-img" src="${poster}" alt="${escHtml(title)}" loading="lazy"/>` : `<div class="card-img-ph">${FALLBACK}</div>`}
      ${rating ? `<div class="card-rating">⭐ ${rating}</div>` : ''}
      <div class="card-quick-wrap">
        ${type==='movie'
          ? `<button class="card-quick-btn" title="Spustiť">▶</button>`
          : `<button class="card-quick-btn tv" title="Vybrať epizódu">📺</button>`}
      </div>
      <div class="card-info">
        <div class="card-title">${escHtml(title)}</div>
        <div class="card-year">${year} · ${type==='movie'?'Film':'Seriál'}</div>
      </div>
    `;

    // Quick play button (bypasses detail for movies)
    card.querySelector('.card-quick-btn').addEventListener('click', async e => {
      e.stopPropagation();
      if (type === 'movie') await quickPlay(item.id, 'movie', title);
      else await openDetail(item.id, 'tv', item);
    });

    // Full detail on card click
    card.addEventListener('click', () => openDetail(item.id, type, item));
    row.appendChild(card);
  });
}

// ─── Quick Play (movie: no detail page) ──────────────────────────────────────
async function quickPlay(tmdbId, type, title) {
  const site = getSite(getPref());
  const url  = type === 'movie' ? site.getMovieUrl(tmdbId) : site.getTvUrl(tmdbId, 1, 1);
  await window.electronAPI.openStream(url);
  showPlayerBar(title, site.name);
}

// ─── Search ───────────────────────────────────────────────────────────────────
window.onSearchInput = function(val) {
  clearTimeout(searchTimer);
  const dd = document.getElementById('search-dropdown');
  if (!val.trim()) { dd.classList.add('hidden'); return; }
  searchTimer = setTimeout(async () => {
    const data = await tmdb(`/search/multi?query=${encodeURIComponent(val)}&include_adult=false`);
    if (!data?.results?.length) { dd.classList.add('hidden'); return; }
    const items = data.results.filter(r => r.media_type !== 'person').slice(0,7);
    dd.innerHTML = items.map(item => {
      const type  = item.media_type||(item.title?'movie':'tv');
      const title = item.title||item.name||'';
      const year  = (item.release_date||item.first_air_date||'').slice(0,4);
      const poster = item.poster_path ? `${IMG_BASE}/w92${item.poster_path}` : null;
      return `<div class="dd-item" onclick="ddSelect(${item.id},'${type}',${JSON.stringify(title)})">
        ${poster?`<img class="dd-poster" src="${poster}" alt=""/>`:`<div class="dd-poster-ph">${FALLBACK}</div>`}
        <div class="dd-info"><div class="dd-title">${escHtml(title)}</div><div class="dd-meta">${year}</div></div>
        <span class="dd-type">${type==='movie'?'🎬':'📺'}</span>
      </div>`;
    }).join('');
    dd.classList.remove('hidden');
  }, 300);
};

window.onSearchKey = function(e) {
  if (e.key==='Enter') { const v=e.target.value.trim(); if(v) openSearchView(v); document.getElementById('search-dropdown').classList.add('hidden'); }
  if (e.key==='Escape') document.getElementById('search-dropdown').classList.add('hidden');
};

window.ddSelect = async function(id, type, title) {
  document.getElementById('search-dropdown').classList.add('hidden');
  if (type === 'movie') await quickPlay(id, 'movie', title);
  else await openDetail(id, type);
};

function openSearchView(query) {
  showView('view-search');
  const inp = document.getElementById('search-full');
  inp.value = query;
  doFullSearch(query);
}

window.doFullSearch = async function(val) {
  if (!val.trim()) return;
  document.getElementById('search-heading').textContent = `Výsledky: "${val}"`;
  const data = await tmdb(`/search/multi?query=${encodeURIComponent(val)}&include_adult=false`);
  const res  = document.getElementById('search-results');
  res.innerHTML = '';
  if (!data?.results?.length) { res.innerHTML = '<p style="color:var(--text2)">Nenašli sa žiadne výsledky.</p>'; return; }
  data.results.filter(r => r.media_type !== 'person').forEach(item => {
    const type   = item.media_type||(item.title?'movie':'tv');
    const title  = item.title||item.name||'';
    const year   = (item.release_date||item.first_air_date||'').slice(0,4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : '';
    const poster = item.poster_path ? `${IMG_BASE}/w342${item.poster_path}` : null;
    const card   = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${poster?`<img class="card-img" src="${poster}" alt="${escHtml(title)}" loading="lazy"/>`:`<div class="card-img-ph">${FALLBACK}</div>`}
      ${rating?`<div class="card-rating">⭐ ${rating}</div>`:''}
      <div class="card-quick-wrap">
        ${type==='movie'?`<button class="card-quick-btn">▶</button>`:`<button class="card-quick-btn tv">📺</button>`}
      </div>
      <div class="card-info"><div class="card-title">${escHtml(title)}</div><div class="card-year">${year}</div></div>
    `;
    card.querySelector('.card-quick-btn').addEventListener('click', async e => {
      e.stopPropagation();
      if (type==='movie') await quickPlay(item.id,'movie',title);
      else await openDetail(item.id,'tv',item);
    });
    card.addEventListener('click', () => openDetail(item.id, type, item));
    res.appendChild(card);
  });
};

// ─── Detail View ──────────────────────────────────────────────────────────────
async function openDetail(id, type, itemData) {
  lastView = document.querySelector('.view.active')?.id || 'view-home';
  showSpinner(true);
  const detail = await tmdb(`/${type==='movie'?'movie':'tv'}/${id}?append_to_response=credits`);
  showSpinner(false);
  const info = detail || itemData;
  if (!info) { showToast('Nepodarilo sa načítať detail.'); return; }

  const title   = info.title||info.name||'';
  const year    = (info.release_date||info.first_air_date||'').slice(0,4);
  const rating  = info.vote_average ? info.vote_average.toFixed(1) : '';
  const runtime = info.runtime ? `${info.runtime} min` : (info.episode_run_time?.[0] ? `${info.episode_run_time[0]} min/ep` : '');
  const genres  = (info.genres||[]).map(g=>g.name).join(', ');

  document.getElementById('detail-backdrop').style.backgroundImage =
    info.backdrop_path ? `url("${IMG_BASE}/w1280${info.backdrop_path}")` : 'none';
  document.getElementById('detail-poster').src = info.poster_path ? `${IMG_BASE}/w342${info.poster_path}` : '';
  document.getElementById('detail-poster').alt = title;
  document.getElementById('detail-title').textContent    = title;
  document.getElementById('detail-meta').textContent     = [year, runtime, genres, rating?`⭐ ${rating}`:''].filter(Boolean).join(' · ');
  document.getElementById('detail-overview').textContent = info.overview||'';
  document.getElementById('detail-badges').innerHTML = `
    <span class="badge badge-type">${type==='movie'?'FILM':'SERIÁL'}</span>
    ${year?`<span class="badge badge-year">${year}</span>`:''}
    ${rating?`<span class="badge badge-rating">⭐ ${rating}</span>`:''}
  `;

  const seasons = (info.seasons||[]).filter(s => s.season_number > 0);
  currentDetail = { id, type, title, seasons };

  const picker = document.getElementById('episode-picker');
  if (type==='tv' && seasons.length) {
    picker.classList.remove('hidden');
    buildSeasonSelect(seasons);
    await buildEpisodeSelect(id, seasons[0].season_number);
  } else {
    picker.classList.add('hidden');
  }

  buildPlayButtons(type, id);
  showView('view-detail');
}

function buildSeasonSelect(seasons) {
  const sel = document.getElementById('season-select');
  sel.innerHTML = seasons.map(s =>
    `<option value="${s.season_number}">Séria ${s.season_number}</option>`
  ).join('');
}

async function buildEpisodeSelect(showId, seasonNum) {
  const sel  = document.getElementById('episode-select');
  sel.innerHTML = '<option>Načítavam…</option>';
  const data = await tmdb(`/tv/${showId}/season/${seasonNum}`);
  const eps  = data?.episodes || [];
  sel.innerHTML = eps.length
    ? eps.map(ep => `<option value="${ep.episode_number}">Ep ${ep.episode_number}${ep.name?' – '+ep.name:''}</option>`).join('')
    : '<option value="1">Epizóda 1</option>';
}

window.onSeasonChange = async function(val) {
  if (currentDetail) await buildEpisodeSelect(currentDetail.id, parseInt(val));
};

// ─── Play Buttons (detail page) ───────────────────────────────────────────────
function buildPlayButtons(type, tmdbId) {
  const grid   = document.getElementById('source-grid');
  const pref   = getPref();
  const main   = getSite(pref);
  const alt    = SITES.find(s => s.id !== pref);

  grid.innerHTML = `
    <button class="play-main-btn" onclick="launchFromDetail('${main.id}','${type}',${tmdbId})"
      style="background:${main.color}">
      ▶ Spustiť — ${main.name}
    </button>
    ${alt ? `
    <button class="play-alt-btn" onclick="launchFromDetail('${alt.id}','${type}',${tmdbId})"
      style="border-color:${alt.color};color:${alt.color}">
      Alternatíva: ${alt.name}
    </button>` : ''}
    <button class="play-swap-btn" onclick="swapPreferred('${type}',${tmdbId})">
      🔄 Prepnúť predvolený
    </button>
  `;
}

window.swapPreferred = function(type, tmdbId) {
  const current = getPref();
  const newPref = SITES.find(s => s.id !== current)?.id || current;
  setPref(newPref);
  buildPlayButtons(type, tmdbId);
  showToast(`✅ Predvolený zdroj: ${getSite(newPref).name}`);
};

window.launchFromDetail = async function(siteId, type, tmdbId) {
  const site    = getSite(siteId);
  const season  = parseInt(document.getElementById('season-select')?.value  || 1);
  const episode = parseInt(document.getElementById('episode-select')?.value || 1);
  const url     = type==='movie' ? site.getMovieUrl(tmdbId) : site.getTvUrl(tmdbId, season, episode);
  await window.electronAPI.openStream(url);
  showPlayerBar(currentDetail?.title || '', site.name);
};

// ─── Sports ───────────────────────────────────────────────────────────────────
function buildSportsRow() {
  const row = document.getElementById('row-sports');
  if (!row) return;
  row.innerHTML = '';
  SPORTS.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'live-card';
    card.style.setProperty('--lc-color','#e50914');
    card.onclick = async () => {
      await window.electronAPI.openStream(ch.url);
      showPlayerBar(ch.name, 'Cineby Sports');
    };
    card.innerHTML = `
      <div class="live-label"><span class="live-dot"></span> LIVE</div>
      <div style="font-size:26px">${ch.icon}</div>
      <div class="live-name">${escHtml(ch.name)}</div>
      <div class="live-desc" style="font-size:11px;color:#e50914">via Cineby</div>
    `;
    row.appendChild(card);
  });
}

// ─── Sites View ───────────────────────────────────────────────────────────────
function buildSitesView() {
  const grid = document.getElementById('sites-grid');
  if (!grid) return;
  SITES.forEach(site => {
    const tile = document.createElement('div');
    tile.className = 'site-tile';
    tile.style.setProperty('--site-color', site.color);
    tile.onclick = async () => {
      await window.electronAPI.openStream(`https://www.${site.id==='cineby'?'cineby.sc':'bitcine.tv'}`);
      showPlayerBar(site.name,'');
    };
    tile.innerHTML = `
      <div class="site-tile-name">${escHtml(site.name)}</div>
      <div class="site-tile-meta">
        <span class="site-tile-badge" style="color:${site.color}">${site.badge}</span>
        <span class="site-tile-cat">🔗 TMDB Deep Link</span>
      </div>
    `;
    grid.appendChild(tile);
  });
}

// ─── Player Bar ───────────────────────────────────────────────────────────────
function showPlayerBar(title, source) {
  document.getElementById('player-bar').classList.remove('hidden');
  document.getElementById('titlebar').style.display = 'none';
  document.getElementById('player-title').textContent = [title,source].filter(Boolean).join(' — ');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
}

function hidePlayerBar() {
  document.getElementById('player-bar').classList.add('hidden');
  document.getElementById('titlebar').style.display = 'flex';
}

window.closePlayer = async function() {
  await window.electronAPI.closeStream();
  hidePlayerBar();
  showView(lastView || 'view-home');
};

// ─── Subtitles ────────────────────────────────────────────────────────────────
window.loadSubtitle = async function() {
  const res = await window.electronAPI.loadSubtitle();
  if (res.success) {
    document.getElementById('sub-status').textContent = `📄 ${res.name} (${res.count})`;
    showToast(`✅ ${res.name}`);
  } else showToast('⚠ Nepodarilo sa načítať titulky.');
};
window.adjustOffset = async function(delta) {
  const res = await window.electronAPI.setSubtitleOffset(delta);
  const st  = document.getElementById('sub-status');
  st.textContent = st.textContent.replace(/ \([+-][\d.]+s\)$/,'') + ` (${res.offset>=0?'+':''}${res.offset.toFixed(1)}s)`;
};
window.clearSubtitle = async function() {
  await window.electronAPI.clearSubtitle();
  document.getElementById('sub-status').textContent = '';
  showToast('Titulky odstránené.');
};

// ─── Navigation ───────────────────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}
window.showView = showView;
window.goBackFromDetail = () => showView(lastView || 'view-home');
window.showSection = function(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${name}`)?.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  event.target.classList.add('active');
};

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap'))
    document.getElementById('search-dropdown')?.classList.add('hidden');
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showSpinner(on) { document.getElementById('spinner')?.classList.toggle('hidden',!on); }
let _tt;
function showToast(msg, dur=3000) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(_tt); _tt = setTimeout(() => t.classList.add('hidden'), dur);
}
