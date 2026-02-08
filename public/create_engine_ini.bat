@echo off
REM ====================================================================
REM Script de Creation Automatique de engine.ini
REM ====================================================================
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
