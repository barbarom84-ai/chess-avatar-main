@echo off
REM ====================================================================
REM Script de Creation Automatique de engine.ini
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
title Chess Avatar - Creation engine.ini
color 0B
mode con: cols=104 lines=45 >nul 2>&1
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('ICAgX19fXyBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgXyAgICAgICAgICAgICANCiAgLyBfX198IHxfXyAgIF9fXyAgX19fIF9fXyAgIC8gXF9fICAgX19fXyBffCB8XyBfXyBfIF8gX18gDQogfCB8ICAgfCAnXyBcIC8gXyBcLyBfXy8gX198IC8gXyBcIFwgLyAvIF9gIHwgX18vIF9gIHwgJ19ffA0KIHwgfF9fX3wgfCB8IHwgIF9fL1xfXyBcX18gXC8gX19fIFwgViAvIChffCB8IHx8IChffCB8IHwgICANCiAgXF9fX198X3wgfF98XF9fX3x8X19fL19fXy9fLyAgIFxfXF8vIFxfXyxffFxfX1xfXyxffF98ICAgDQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA0K')); [Console]::Out.Write($s)"
REM Lit profile.json et cree engine.ini automatiquement
REM Nom du moteur : extrait de profile.json (username ou name)
REM Auteur : Chess Avatar (fixe)

echo ========================================
echo Creation Automatique de engine.ini
echo ========================================
echo.

cd /d "%~dp0"

echo Dossier actuel : %CD%
echo.

:: Verifier profile.json
if not exist "profile.json" (
    echo [ERREUR] profile.json introuvable !
    echo Generez votre profil sur le site ChessAvatar
    pause
    exit /b 1
)

:: Lire le nom depuis profile.json
echo Lecture de profile.json...
setlocal enabledelayedexpansion

:: Chercher "username" dans profile.json
set ENGINE_NAME=
for /f "tokens=2 delims=:," %%a in ('type "profile.json" ^| findstr /i "username"') do (
    set temp=%%a
    set temp=!temp:"=!
    set temp=!temp: =!
    set ENGINE_NAME=!temp!
    goto :name_found
)

:name_found
:: Si pas de username, chercher "name"
if "!ENGINE_NAME!"=="" (
    for /f "tokens=2 delims=:," %%a in ('type "profile.json" ^| findstr /i /v "opening" ^| findstr /i "name"') do (
        set temp=%%a
        set temp=!temp:"=!
        set temp=!temp: =!
        set ENGINE_NAME=!temp!
        goto :name_found2
    )
)

:name_found2
:: Par defaut si pas trouve
if "!ENGINE_NAME!"=="" set ENGINE_NAME=ChessAvatar

:: Ajouter suffixe _Avatar
set ENGINE_NAME=!ENGINE_NAME!_Avatar

:: Auteur fixe
set AUTHOR_NAME=Chess Avatar

echo.
echo [INFO] Nom du moteur : !ENGINE_NAME!
echo [INFO] Auteur : !AUTHOR_NAME!
echo.

:: Detecter Stockfish
set STOCKFISH_FILE=stockfish.exe
for %%f in (stockfish*.exe) do (
    set STOCKFISH_FILE=%%f
    goto :found
)
:found
echo [INFO] Stockfish : %STOCKFISH_FILE%
echo.

:: Creer engine.ini
echo Creation de engine.ini...
(
echo [Engine]
echo Name=!ENGINE_NAME!
echo Author=!AUTHOR_NAME!
echo Protocol=UCI
echo StockfishPath=%STOCKFISH_FILE%
echo.
echo [Options]
echo Hash=128
echo Threads=4
echo Depth=20
echo Contempt=0
echo.
echo [Personality]
echo Profile=%PROFILE_FILE%
) > "engine.ini"

if exist "engine.ini" (
    echo.
    echo [OK] engine.ini cree avec succes !
    echo.
    echo Contenu :
    echo ========================================
    type engine.ini
    echo ========================================
    echo.
    echo Vous pouvez maintenant tester AvatarEngine.exe
    echo ou executer install_engine.bat pour installer dans Fritz 20
) else (
    echo [ERREUR] Impossible de creer engine.ini
)

echo.
endlocal
pause
