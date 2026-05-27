@echo off
title StreamLauncher
cd /d "%~dp0"

:: Check if node_modules exists, install if not
if not exist "node_modules\" (
    echo Installing dependencies, please wait...
    npm install
    echo.
)

:: Start the app
npm start
