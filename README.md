# StreamLauncher – Build & Run Instructions

## ─────────────────────────────────────────────────
## WINDOWS APP (Electron .exe)
## ─────────────────────────────────────────────────

### Prerequisites
- Node.js 18+ installed → https://nodejs.org
- Internet connection (first build only)

### Steps

1. Extract the ZIP to a folder, e.g. `C:\StreamLauncher\`

2. Open Command Prompt (or PowerShell) in that folder:
   ```
   cd C:\StreamLauncher
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. **Run directly (development / test):**
   ```
   npm start
   ```

5. **Build portable .exe (for USB / distribution):**
   ```
   npm run build
   ```
   → Output: `dist\StreamLauncher-1.0.0-portable.exe`
   → Copy this single file to USB and run it on any Windows PC.

### First Launch
- Go to ⚙ Settings
- Enter your **free TMDB API key**:
  1. Visit https://www.themoviedb.org — create a free account
  2. Go to Settings → API → Request API key (v3 auth)
  3. Paste the key in the Settings screen
- Click Save → content loads immediately

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Esc | Exit player back to launcher |
| F11 | Toggle fullscreen |

### Notes
- **Ad blocking** is always active — no ads, no popups, no crypto miners
- **Anti-redirect** blocks any navigation away from the streaming site
- **Subtitles**: while in player, click "⬛ Subtitles" in the toolbar
  - Supports .srt and .vtt files
  - Use –0.5s / +0.5s buttons to sync timing
  - Overlay is injected directly over the video

---

## ─────────────────────────────────────────────────
## GOOGLE TV / ANDROID TV APP
## ─────────────────────────────────────────────────

### Prerequisites
- Android Studio (free) → https://developer.android.com/studio
- Java 17+ (bundled with Android Studio)
- USB cable for side-loading

### Steps

1. Open Android Studio
2. File → Open → select `StreamLauncher/android/` folder
3. Wait for Gradle sync to complete (downloads dependencies)

4. **IMPORTANT – Copy the launcher HTML into Android assets:**
   Copy these files into `android/app/src/main/assets/`:
   - `renderer/index.html`  → `assets/index.html`
   - `renderer/css/app.css` → `assets/css/app.css`
   - `renderer/js/app.js`   → `assets/js/app.js`

   The Android app loads `file:///android_asset/index.html` as its UI.
   The UI is identical to the Windows app — same TMDB search, same sources.

5. Build APK: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   → Output: `android/app/build/outputs/apk/debug/app-debug.apk`

6. Install via USB:
   - Enable Developer Options on your Google TV:
     Settings → Device Preferences → About → Build (click 7x)
   - Enable USB Debugging in Developer Options
   - Connect USB cable to TV
   - In Android Studio: Run → Run 'app' (deploys directly)
   - OR use ADB: `adb install app-debug.apk`

### Alternative: Install via file manager
   - Copy the .apk to a USB drive
   - On Google TV: install a file manager app (e.g., FX File Explorer)
   - Navigate to the APK and install

### TV Remote Controls
| Button | Action |
|--------|--------|
| D-pad arrows | Navigate menus |
| Select / OK | Click focused item |
| Back button | Go back / exit player |
| Home button | Return to TV home |

### Notes
- The launcher HTML is bundled inside the APK — no server needed
- TMDB API key is stored in the browser's localStorage on the TV
- Ad blocking is done in the Android WebView (same domain list as PC)
- Fullscreen video works automatically when streaming sites request it

---

## ─────────────────────────────────────────────────
## ADDING / UPDATING STREAMING SITES
## ─────────────────────────────────────────────────

Edit `src/sites.js` to add new sites or update broken URLs.
Each site entry looks like:

```javascript
{
  id: 'mysite',
  name: 'My Site',
  url: 'https://mysite.com',
  category: 'movies-tv',   // or 'live-tv'
  color: '#ff6600',
  badge: 'HD',
  description: 'Description shown in UI',
  getMovieUrl: (tmdbId) => `https://mysite.com/movie/${tmdbId}`,
  getTvUrl: (tmdbId, season, ep) => `https://mysite.com/tv/${tmdbId}/${season}/${ep}`,
  hasTmdbDeepLink: true,
}
```

## ─────────────────────────────────────────────────
## STREAMING SITES INCLUDED (from FMHY)
## ─────────────────────────────────────────────────

### Movies & TV (with TMDB deep links)
| Site | Quality | Notes |
|------|---------|-------|
| Cineby | 4K | Fast, multiple servers |
| BitCine | HD | Movies and TV |
| Rive | 4K | Ultra quality |
| VidSrc.to | HD | Large catalogue |
| VidSrc.me | HD | Alt VidSrc server |
| Embed.su | HD | Clean player |
| 2Embed | HD | Multi-source |
| Braflix | HD | Wide selection |
| TheFliXtor | HD | Large library |
| BFlix | HD | Movies & series |
| Freek | HD | Free collection |
| Cataz | HD | Browse & stream |
| PressPlay | HD | Modern UI |
| Nontongo | HD | Free movies |
| MovieOrca | HD | Browse mode |
| HDToday | HD | Browse mode |

### Live TV (direct browse)
| Site | Notes |
|------|-------|
| Pluto TV | 250+ free live channels |
| Tubi TV | Free movies, TV & live |
| Plex | Free tier with live TV |
| Peacock | NBC free tier |
| Stirr | Local & national TV |
| Newsmax | Free live news |
