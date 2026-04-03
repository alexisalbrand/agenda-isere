@echo off
cd /d "%~dp0"
start "Agenda Isere" cmd /k npm start
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
