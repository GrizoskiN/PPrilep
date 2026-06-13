@echo off
REM Double-click this to back up the live Supabase project (DB + photos).
REM Saves into  ..\backups\<timestamp>\  (outside the git repo).
cd /d "%~dp0.."
node scripts\backup.mjs
echo.
pause
