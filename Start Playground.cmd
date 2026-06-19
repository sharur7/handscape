@echo off
title Gesture Playground
cd /d "%~dp0"
echo Starting Gesture Playground...
echo Opening http://localhost:8000 in your browser.
echo Close this window (or press Ctrl+C) to stop.
echo.
start "" http://localhost:8000
node serve.mjs
pause
