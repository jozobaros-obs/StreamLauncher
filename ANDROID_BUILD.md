# Build Android APK via GitHub (free, no Android Studio)

## Steps — takes about 5 minutes total

### 1. Create free GitHub account
Go to https://github.com and sign up (free).

### 2. Create new repository
- Click "+" → "New repository"
- Name: `StreamLauncher`
- Set to **Private**
- Click "Create repository"

### 3. Upload the code
On the new repo page, click **"uploading an existing file"**
- Drag the entire `StreamLauncher` folder contents
- OR use GitHub Desktop (free app): https://desktop.github.com

### 4. Wait for build (~3-5 minutes)
- Go to your repo → click **"Actions"** tab
- You'll see "Build StreamLauncher APK" running
- Green checkmark = done ✅

### 5. Download your APK
- Click the finished workflow run
- Scroll down to **"Artifacts"**
- Click **"StreamLauncher-APK"** → downloads a ZIP
- Unzip → get `app-debug.apk`

### 6. Install on Google TV
- Copy `app-debug.apk` to USB drive
- On Google TV: install a file manager (e.g. FX File Explorer from Play Store)
- Open the APK from USB → Install

### Re-building after changes
Any time you update a file on GitHub, the build runs automatically
and a new APK is available in Actions → latest run → Artifacts.
