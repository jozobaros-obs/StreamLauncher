@echo off
title Building StreamLauncher.exe ...
cd /d "%~dp0"

echo ============================================
echo  Building StreamLauncher portable .exe
echo ============================================
echo.

if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Building portable .exe, this takes 1-2 minutes...
npm run build

echo.
if exist "dist\" (
    echo ============================================
    echo  DONE! Your .exe is in the dist\ folder
    echo ============================================
    explorer dist
) else (
    echo Build failed. Check errors above.
)

pause
