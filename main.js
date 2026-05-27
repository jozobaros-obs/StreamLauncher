'use strict';

const {
  app, BrowserWindow, BrowserView, ipcMain,
  session, dialog, globalShortcut, shell
} = require('electron');
const path  = require('path');
const fs    = require('fs');
const Store = require('electron-store');

const { isBlocked, isBlockedNavigation } = require('./src/adblock');

const store = new Store();

let mainWindow      = null;
let playerView      = null;
let subtitleData    = null;
let subtitleOffset  = 0;
let subtitleInterval = null;
let currentStreamUrl = '';

// ─── SRT / VTT Parser ────────────────────────────────────────────────────────
function parseSRT(content) {
  const cues = [];
  const blocks = content.replace(/\r\n/g, '\n').trim().split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;
    const m = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!m) continue;
    const toSec = (h,mn,s,ms) => parseInt(h)*3600+parseInt(mn)*60+parseInt(s)+parseInt(ms)/1000;
    const start = toSec(m[1],m[2],m[3],m[4]);
    const end   = toSec(m[5],m[6],m[7],m[8]);
    const ti    = lines.indexOf(timeLine)+1;
    const text  = lines.slice(ti).join('\n').replace(/<[^>]+>/g,'').trim();
    if (text) cues.push({ start, end, text });
  }
  return cues.sort((a,b) => a.start - b.start);
}

// ─── Ad Blocking Setup ───────────────────────────────────────────────────────
function setupAdBlocking() {
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['<all_urls>'] },
    (details, callback) => callback({ cancel: isBlocked(details.url) })
  );
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'fullscreen' || permission === 'media') return callback(true);
    callback(!['notifications','push'].includes(permission));
  });
}

// ─── Player ───────────────────────────────────────────────────────────────────
function getPlayerBounds() {
  const [w, h] = mainWindow.getContentSize();
  return { x: 0, y: 50, width: w, height: h - 50 };
}

function createPlayer(url) {
  destroyPlayer();
  currentStreamUrl = url;

  playerView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:player',
    },
  });

  mainWindow.addBrowserView(playerView);
  playerView.setBounds(getPlayerBounds());
  playerView.setAutoResize({ width: true, height: true });

  // Allow all media permissions (needed for autoplay)
  playerView.webContents.session.setPermissionRequestHandler((_wc, _perm, cb) => cb(true));

  // Block popups
  playerView.webContents.setWindowOpenHandler(({ url: pu }) => {
    console.log('[Block popup]', pu);
    return { action: 'deny' };
  });

  // Anti-redirect
  playerView.webContents.on('will-navigate', (event, navUrl) => {
    try {
      const nav  = new URL(navUrl);
      const orig = new URL(currentStreamUrl);
      if (nav.hostname === orig.hostname &&
          (nav.pathname === '/' || nav.pathname === '') &&
          navUrl !== currentStreamUrl) {
        event.preventDefault();
        destroyPlayer();
        mainWindow.webContents.send('player-closed');
        return;
      }
    } catch {}
    if (isBlockedNavigation(navUrl, currentStreamUrl)) {
      event.preventDefault();
    }
  });

  // Ad blocking on player session
  playerView.webContents.session.webRequest.onBeforeRequest(
    { urls: ['<all_urls>'] },
    (details, callback) => callback({ cancel: isBlocked(details.url) })
  );

  playerView.webContents.on('did-finish-load', () => {
    injectDomAdRemover();
    injectAutoPlay();
    injectAutoSubtitles();
    injectSubtitleOverlay();
    if (subtitleData) startSubtitleSync();
  });

  playerView.webContents.on('did-frame-finish-load', () => {
    injectDomAdRemover();
    injectAutoPlay();
  });

  playerView.webContents.loadURL(url, {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
}

function destroyPlayer() {
  stopSubtitleSync();
  if (playerView) {
    mainWindow.removeBrowserView(playerView);
    playerView.webContents.destroy();
    playerView = null;
  }
  currentStreamUrl = '';
}

// ─── Auto Play Injection ──────────────────────────────────────────────────────
function injectAutoPlay() {
  if (!playerView) return;
  const script = `
(function(){
  if(window.__slAutoPlay) return;
  window.__slAutoPlay = true;

  const SEL = [
    '.vjs-big-play-button',
    '.jw-icon-playback', '.jw-display-icon-container .jw-icon-play',
    '.plyr__control--overlaid', '[data-plyr="play"]',
    'button[class*="bigPlay" i]', 'button[class*="big-play" i]',
    '.play-btn', '.btn-play', '.playBtn', '#playBtn',
    '.play-button', '#play-button', '#PlayButton',
    'button[class*="play" i]:not([class*="pause" i]):not([class*="replay" i]):not([class*="display" i])',
    'button[aria-label="Play" i]', 'button[title="Play" i]',
    '.click-to-play', '.video-play-overlay', '.player-overlay',
    '[class*="PlayButton"]', '[class*="playButton"]',
    '.watch-btn', '.btn-watch', '.start-player',
  ];

  function tryPlay() {
    const v = document.querySelector('video');
    if (v && !v.paused && v.currentTime > 0) return; // already playing
    if (v && v.paused && v.readyState >= 2) {
      v.play().catch(()=>{});
      return;
    }
    for (const s of SEL) {
      try {
        const el = document.querySelector(s);
        if (el && el.offsetParent !== null && !el.disabled) {
          el.click();
          return;
        }
      } catch(e) {}
    }
  }

  [600, 1200, 2000, 3000, 5000].forEach(d => setTimeout(tryPlay, d));

  // Also trigger when a video element appears in DOM
  const obs = new MutationObserver(() => {
    const v = document.querySelector('video');
    if (v && v.paused) setTimeout(tryPlay, 400);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
  `;
  playerView.webContents.executeJavaScript(script).catch(()=>{});
}

// ─── Auto Czech/Slovak Subtitle Selection ────────────────────────────────────
function injectAutoSubtitles() {
  if (!playerView) return;
  const script = `
(function(){
  if(window.__slAutoSub) return;
  window.__slAutoSub = true;

  const PREF = ['cs','sk','cz','ces','slk','czech','slovak','cze','slo'];

  function match(s) {
    const v = (s||'').toLowerCase();
    return PREF.some(l => v === l || v.startsWith(l+'-') || v.includes(l));
  }

  function selectSubs() {
    // Native HTML5 tracks
    const video = document.querySelector('video');
    if (video && video.textTracks && video.textTracks.length) {
      let found = false;
      for (let i = 0; i < video.textTracks.length; i++) {
        const t = video.textTracks[i];
        if ((t.kind==='subtitles'||t.kind==='captions') && (match(t.language)||match(t.label))) {
          t.mode = 'showing'; found = true;
        } else { t.mode = 'hidden'; }
      }
      if (found) return;
    }

    // VideoJS
    try {
      if (window.videojs) {
        Object.values(videojs.players||{}).forEach(p => {
          if (!p) return;
          const tracks = p.textTracks();
          for (let i=0; i<tracks.length; i++) {
            if (match(tracks[i].language)||match(tracks[i].label)) {
              tracks[i].mode = 'showing'; break;
            }
          }
        });
      }
    } catch(e){}

    // JWPlayer
    try {
      if (window.jwplayer && jwplayer().getCaptionsList) {
        const list = jwplayer().getCaptionsList();
        for (let i=0; i<list.length; i++) {
          if (match(list[i].language)||match(list[i].label)) {
            jwplayer().setCurrentCaptions(i); break;
          }
        }
      }
    } catch(e){}

    // Try clicking subtitle menu items
    try {
      document.querySelectorAll('[class*="subtitle" i] li, [class*="caption" i] li, [class*="track" i] li').forEach(el => {
        if (match(el.innerText)) el.click();
      });
    } catch(e){}
  }

  [2000, 4000, 7000, 10000].forEach(d => setTimeout(selectSubs, d));
})();
  `;
  playerView.webContents.executeJavaScript(script).catch(()=>{});
}

// ─── DOM Ad / Overlay Remover ─────────────────────────────────────────────────
function injectDomAdRemover() {
  if (!playerView) return;
  const script = `
(function(){
  if(window.__slAdRemoverActive) return;
  window.__slAdRemoverActive = true;

  const TEXT_KILL=[/adblock/i,/ad.?block/i,/install.*browser/i,/browser.*install/i,
    /recommended.*install/i,/opera/i,/brave.*browser/i,/download.*app/i,
    /install.*app/i,/push.*notif/i,/allow.*notif/i,/enable.*notif/i,
    /you.*won/i,/congratulation/i,/survey.*required/i,/vpn.*recommended/i,
    /click.*allow/i,/click.*accept/i];

  const CLASS_KILL=[/^ad[_-]/i,/[_-]ad$/i,/advert/i,/pop.?up/i,
    /interstitial/i,/install.?prompt/i,/push.?prompt/i];

  const BTN_KILL=/^(allow|install|accept|enable|continue|proceed|ok|yes|get it)$/i;

  function shouldKill(el){
    if(!el||!el.tagName) return false;
    if(el.tagName==='VIDEO'||el.tagName==='IFRAME') return false;
    if((el.id||'').startsWith('__sl')) return false;
    const cls = typeof el.className==='string' ? el.className : '';
    const id  = el.id||'';
    if(CLASS_KILL.some(p=>p.test(cls)||p.test(id))) return true;
    const text = (el.innerText||'').trim();
    if(text.length>0 && text.length<400 && TEXT_KILL.some(p=>p.test(text))) return true;
    try {
      const st=window.getComputedStyle(el);
      const z=parseInt(st.zIndex)||0;
      const w=el.offsetWidth, h=el.offsetHeight;
      const vw=window.innerWidth, vh=window.innerHeight;
      if((st.position==='fixed'||st.position==='absolute')&&z>50&&!el.querySelector('video')&&w>vw*0.2&&h>vh*0.1){
        const btns=Array.from(el.querySelectorAll('button,a,[role="button"]'));
        if(btns.some(b=>BTN_KILL.test((b.innerText||'').trim()))) return true;
        if(TEXT_KILL.some(p=>p.test(text))) return true;
        if(z>9999&&w>vw*0.4&&h>vh*0.3) return true;
      }
    } catch(e){}
    return false;
  }

  function sweep(){
    document.querySelectorAll('div,section,aside,article,span,figure').forEach(el=>{
      try{ if(shouldKill(el)) el.remove(); }catch(e){}
    });
    if(document.body){ document.body.style.overflow=''; document.body.style.position=''; }
  }

  sweep();
  [300,700,1200,2000,3500,6000,10000].forEach(d=>setTimeout(sweep,d));

  new MutationObserver(muts=>{
    muts.forEach(m=>{
      m.addedNodes.forEach(n=>{
        if(n.nodeType!==1) return;
        try{
          if(shouldKill(n)){ n.remove(); return; }
          n.querySelectorAll&&n.querySelectorAll('div,section,aside').forEach(c=>{
            try{ if(shouldKill(c)) c.remove(); }catch(e){}
          });
        }catch(e){}
      });
    });
  }).observe(document.body||document.documentElement,{childList:true,subtree:true});

  window.open=()=>null;
  window.showAd=window.displayAd=window.openPopup=window.showPopup=()=>{};
  history.back=()=>{};
  history.forward=()=>{};
  history.go=n=>{ if(n>0) window.history.go(n); };
  window.addEventListener('popstate',e=>e.stopImmediatePropagation(),true);
})();
  `;
  playerView.webContents.executeJavaScript(script).catch(()=>{});
}

// ─── Subtitle Overlay ─────────────────────────────────────────────────────────
function injectSubtitleOverlay() {
  if (!playerView) return;
  playerView.webContents.insertCSS(`
    #__sl_sub_wrap {
      position:fixed!important; bottom:70px!important; left:0!important; right:0!important;
      text-align:center!important; z-index:2147483647!important; pointer-events:none!important;
    }
    #__sl_sub_text {
      display:inline-block!important; background:rgba(0,0,0,0.75)!important; color:#fff!important;
      font-size:26px!important; line-height:1.4!important; padding:5px 16px!important;
      border-radius:5px!important; font-family:Arial,sans-serif!important;
      text-shadow:1px 1px 3px #000!important; white-space:pre-line!important; max-width:85vw!important;
    }
  `).catch(()=>{});
  playerView.webContents.executeJavaScript(`
    (function(){
      if(document.getElementById('__sl_sub_wrap')) return;
      const w=document.createElement('div'); w.id='__sl_sub_wrap';
      const t=document.createElement('span'); t.id='__sl_sub_text';
      w.appendChild(t); document.body.appendChild(w);
    })();
  `).catch(()=>{});
}

function startSubtitleSync() {
  stopSubtitleSync();
  if (!subtitleData || !playerView) return;
  subtitleInterval = setInterval(async () => {
    if (!playerView || !subtitleData) return;
    try {
      const ct = await playerView.webContents.executeJavaScript(
        '(function(){const v=document.querySelector("video");return v?v.currentTime:-1;})()'
      );
      if (ct >= 0) {
        const t   = ct + subtitleOffset;
        const cue = subtitleData.find(c => t >= c.start && t <= c.end);
        playerView.webContents.executeJavaScript(
          `(function(){const e=document.getElementById('__sl_sub_text');if(e)e.textContent=${JSON.stringify(cue?.text||'')};})();`
        ).catch(()=>{});
      }
    } catch {}
  }, 150);
}

function stopSubtitleSync() {
  if (subtitleInterval) { clearInterval(subtitleInterval); subtitleInterval = null; }
}

// ─── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.handle('open-stream', async (_e, url) => { createPlayer(url); return { success: true }; });
ipcMain.handle('close-stream', async () => { destroyPlayer(); return { success: true }; });

ipcMain.handle('load-subtitle', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Load Subtitle File',
    properties: ['openFile'],
    filters: [{ name: 'Subtitle Files', extensions: ['srt','vtt','ass','ssa','sub'] }],
  });
  if (result.canceled || !result.filePaths.length) return { success: false };
  try {
    const filePath = result.filePaths[0];
    const content  = fs.readFileSync(filePath, 'utf-8');
    subtitleData   = parseSRT(content);
    subtitleOffset = 0;
    if (playerView) { injectSubtitleOverlay(); startSubtitleSync(); }
    return { success: true, count: subtitleData.length, name: path.basename(filePath) };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('set-subtitle-offset', (_e, delta) => { subtitleOffset += delta; return { offset: subtitleOffset }; });
ipcMain.handle('clear-subtitle', () => {
  stopSubtitleSync(); subtitleData = null; subtitleOffset = 0;
  if (playerView) playerView.webContents.executeJavaScript(
    `const e=document.getElementById('__sl_sub_text');if(e)e.textContent='';`
  ).catch(()=>{});
  return { success: true };
});

ipcMain.handle('get-settings',     ()       => store.store);
ipcMain.handle('save-settings',    (_e, d)  => { for(const [k,v] of Object.entries(d)) store.set(k,v); return {success:true}; });
ipcMain.handle('win-minimize',     ()       => mainWindow.minimize());
ipcMain.handle('win-maximize',     ()       => { mainWindow.isMaximized() ? mainWindow.restore() : mainWindow.maximize(); });
ipcMain.handle('win-close',        ()       => app.quit());
ipcMain.handle('open-external',    (_e, u)  => shell.openExternal(u));

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 860, minWidth: 1100, minHeight: 700,
    frame: false, backgroundColor: '#0a0a0f', show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('resize', () => { if (playerView) playerView.setBounds(getPlayerBounds()); });
  mainWindow.on('enter-full-screen', () => mainWindow.webContents.send('fullscreen-change', true));
  mainWindow.on('leave-full-screen',  () => mainWindow.webContents.send('fullscreen-change', false));
}

app.whenReady().then(() => {
  setupAdBlocking();
  createWindow();
  globalShortcut.register('Escape', () => { if (playerView) { destroyPlayer(); mainWindow.webContents.send('player-closed'); } });
  globalShortcut.register('F11', () => { mainWindow.isFullScreen() ? mainWindow.setFullScreen(false) : mainWindow.setFullScreen(true); });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
