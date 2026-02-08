@echo off
REM Lance AvatarEngine.py avec Python (sans compilation PyInstaller)
REM -u = sortie non bufferisee (requis pour UCI)
cd /d "%~dp0"
python -u "%~dp0AvatarEngine.py" %*
if errorlevel 1 pause
