@echo off
REM ====================================================================
REM [OUTIL DEVELOPPEUR] Compilation d'AvatarEngine.py en AvatarEngine.exe
REM
REM Ce script est destine UNIQUEMENT aux developpeurs qui modifient
REM AvatarEngine.py. Les utilisateurs finaux n'en ont PAS besoin :
REM AvatarEngine.exe est livre pre-compile dans le pack ZIP telecharge
REM depuis le site (route /api/engine-pack).
REM
REM Cote dev, l'equivalent recommande est :
REM   npm run build:engine
REM
REM Prerequis (developpeurs uniquement) :
REM   - Python 3.11+ dans le PATH
REM   - PyInstaller (pip install pyinstaller)
REM ====================================================================
if not defined CA_IN_WT (
  if not defined WT_SESSION_ID (
    where wt >nul 2>&1 && (
      start "" wt.exe cmd /k "set CA_IN_WT=1&& cd /d \"%~dp0\" && \"%~f0\" %*"
      exit /b 0
    )
  )
)
set CA_IN_WT=
title Chess Avatar - Compilation AvatarEngine
color 0B
mode con: cols=104 lines=45 >nul 2>&1
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('ICAgX19fXyBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgXyAgICAgICAgICAgICANCiAgLyBfX198IHxfXyAgIF9fXyAgX19fIF9fXyAgIC8gXF9fICAgX19fXyBffCB8XyBfXyBfIF8gX18gDQogfCB8ICAgfCAnXyBcIC8gXyBcLyBfXy8gX198IC8gXyBcIFwgLyAvIF9gIHwgX18vIF9gIHwgJ19ffA0KIHwgfF9fX3wgfCB8IHwgIF9fL1xfXyBcX18gXC8gX19fIFwgViAvIChffCB8IHx8IChffCB8IHwgICANCiAgXF9fX198X3wgfF98XF9fX3x8X19fL19fXy9fLyAgIFxfXF8vIFxfXyxffFxfX1xfXyxffF98ICAgDQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA0K')); [Console]::Out.Write($s)"

echo.
echo ========================================
echo   Compilation d'AvatarEngine
echo ========================================
echo.

REM Verifier si Python est installe
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python n'est pas installe ou n'est pas dans le PATH
    echo.
    echo Telechargez Python depuis: https://www.python.org/downloads/
    echo Assurez-vous de cocher "Add Python to PATH" lors de l'installation
    pause
    exit /b 1
)

echo [OK] Python detecte

REM Verifier si PyInstaller est installe
python -m pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo.
    echo [INFO] PyInstaller n'est pas installe. Installation en cours...
    python -m pip install pyinstaller
    if errorlevel 1 (
        echo [ERREUR] Echec de l'installation de PyInstaller
        pause
        exit /b 1
    )
)

echo [OK] PyInstaller detecte

REM Verifier si AvatarEngine.py existe
if not exist "AvatarEngine.py" (
    echo.
    echo [ERREUR] AvatarEngine.py introuvable dans le dossier actuel
    echo.
    echo Assurez-vous que ce fichier .bat est dans le meme dossier que AvatarEngine.py
    pause
    exit /b 1
)

echo [OK] AvatarEngine.py trouve

echo.
echo ========================================
echo   Compilation en cours...
echo ========================================
echo.

REM Compiler avec PyInstaller
pyinstaller --onefile --console --clean --name AvatarEngine AvatarEngine.py

if errorlevel 1 (
    echo.
    echo [ERREUR] La compilation a echoue
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Compilation reussie!
echo ========================================
echo.

REM Copier l'executable dans le dossier courant
if exist "dist\AvatarEngine.exe" (
    copy /Y "dist\AvatarEngine.exe" "AvatarEngine.exe"
    echo [OK] AvatarEngine.exe cree dans le dossier actuel
    
    REM Nettoyer les fichiers temporaires
    echo.
    echo Nettoyage des fichiers temporaires...
    rmdir /S /Q build 2>nul
    rmdir /S /Q dist 2>nul
    del /Q AvatarEngine.spec 2>nul
    echo [OK] Nettoyage termine
) else (
    echo [ERREUR] AvatarEngine.exe n'a pas ete cree
)

echo.
echo ========================================
echo   Instructions d'utilisation
echo ========================================
echo.
echo 1. Placez les fichiers suivants dans le MEME dossier:
echo    - AvatarEngine.exe
echo    - stockfish.exe
echo    - profile.json
echo.
echo 2. Dans Fritz 20, ajoutez AvatarEngine.exe comme moteur UCI
echo.
echo 3. Configurez le niveau depuis Fritz ou via profile.json
echo.
echo ========================================
echo.

pause
