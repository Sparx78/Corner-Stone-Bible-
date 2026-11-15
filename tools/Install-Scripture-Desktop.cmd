@echo off
rem Double-click this file on Windows to install Scripture as a desktop app.
rem It runs tools\install-desktop.ps1 from the Scripture website (PowerShell, no administrator rights needed).
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://sparx78.github.io/Corner-Stone-Bible-/tools/install-desktop.ps1 | iex"
echo.
pause
