@echo off
title Chess Avatar - Installation moteur UCI

:: =====================================================
:: Auto-elevation : relance le script en tant qu'admin
:: si l'utilisateur a fait un simple double-clic.
:: =====================================================
net session >nul 2>&1
if errorlevel 1 (
    echo [INFO] Privileges administrateur requis.
    echo [INFO] Demande d'elevation UAC en cours...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
    exit /b 0
)

color 0B
mode con: cols=104 lines=45 >nul 2>&1
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('ICAgX19fXyBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgXyAgICAgICAgICAgICANCiAgLyBfX198IHxfXyAgIF9fXyAgX19fIF9fXyAgIC8gXF9fICAgX19fXyBffCB8XyBfXyBfIF8gX18gDQogfCB8ICAgfCAnXyBcIC8gXyBcLyBfXy8gX198IC8gXyBcIFwgLyAvIF9gIHwgX18vIF9gIHwgJ19ffA0KIHwgfF9fX3wgfCB8IHwgIF9fL1xfXyBcX18gXC8gX19fIFwgViAvIChffCB8IHx8IChffCB8IHwgICANCiAgXF9fX198X3wgfF98XF9fX3x8X19fL19fXy9fLyAgIFxfXF8vIFxfXyxffFxfX1xfXyxffF98ICAgDQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA0K')); [Console]::Out.Write($s)"
:: Aucune dependance Python : AvatarEngine.exe est livre pre-compile dans le ZIP.
:: Le script s'auto-eleve en admin (UAC) si necessaire pour eviter tout
:: probleme de blocage Windows lors du telechargement Stockfish ou de la
:: copie des fichiers.

setlocal enabledelayedexpansion
echo ========================================
echo Installation du Moteur UCI
echo ========================================
echo.

cd /d "%~dp0"

echo Dossier actuel : %CD%
echo.

:: =====================================================
:: ETAPE 1 : Verification des fichiers fournis dans le ZIP
:: =====================================================

if not exist "AvatarEngine.exe" (
    echo [ERREUR] AvatarEngine.exe introuvable !
    echo.
    echo Ce script doit etre lance depuis le dossier extrait du pack ZIP
    echo telecharge depuis le site ChessAvatar. Le pack contient :
    echo   - AvatarEngine.exe
    echo   - install_engine.bat ^(ce fichier^)
    echo   - swap_profile.bat
    echo   - Bot_VotreNom.profile.json
    echo   - README.txt
    pause
    exit /b 1
)

echo [OK] AvatarEngine.exe trouve

:: =====================================================
:: ETAPE 2 : Stockfish ^(auto-telechargement si absent^)
:: =====================================================

set STOCKFISH_FOUND=0
set STOCKFISH_FILE=

for %%f in (stockfish*.exe) do (
    echo [INFO] Stockfish trouve : %%f
    set STOCKFISH_FOUND=1
    set STOCKFISH_FILE=%%f
    goto :stockfish_ok
)

:stockfish_ok
if %STOCKFISH_FOUND%==0 (
    echo [INFO] Stockfish absent - telechargement automatique en cours...
    echo [INFO] Source : https://stockfishchess.org ^(version officielle, ~30 Mo^)
    echo.

    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "try {" ^
      "  $url = 'https://github.com/official-stockfish/Stockfish/releases/download/sf_17/stockfish-windows-x86-64-avx2.zip';" ^
      "  Write-Host '[INFO] Telechargement depuis' $url;" ^
      "  Invoke-WebRequest -Uri $url -OutFile 'stockfish.zip' -UseBasicParsing;" ^
      "  Expand-Archive -Path 'stockfish.zip' -DestinationPath '.\stockfish_tmp' -Force;" ^
      "  $exe = Get-ChildItem -Path '.\stockfish_tmp' -Recurse -Filter 'stockfish*.exe' | Select-Object -First 1;" ^
      "  if ($exe) { Copy-Item $exe.FullName -Destination '.\stockfish.exe' -Force; Write-Host '[OK] stockfish.exe pret' } else { throw 'Executable Stockfish introuvable dans l archive' };" ^
      "  Remove-Item 'stockfish.zip' -Force -ErrorAction SilentlyContinue;" ^
      "  Remove-Item '.\stockfish_tmp' -Recurse -Force -ErrorAction SilentlyContinue;" ^
      "  exit 0" ^
      "} catch {" ^
      "  Write-Host '[ERREUR] Echec du telechargement Stockfish :' $_.Exception.Message;" ^
      "  exit 1" ^
      "}"

    if errorlevel 1 (
        echo.
        echo [ERREUR] Impossible de telecharger Stockfish automatiquement.
        echo.
        echo Solutions :
        echo   1. Verifiez votre connexion Internet
        echo   2. Telechargez manuellement Stockfish depuis https://stockfishchess.org
        echo   3. Placez stockfish.exe dans CE dossier puis relancez ce script
        pause
        exit /b 1
    )

    set STOCKFISH_FILE=stockfish.exe
    set STOCKFISH_FOUND=1
)

echo [OK] Stockfish pret : !STOCKFISH_FILE!

:: =====================================================
:: ETAPE 3 : Profil JSON ^(detecte automatiquement^)
:: =====================================================

set PROFILE_FOUND=0
set PROFILE_FILE=

for %%f in (*.json) do (
    echo [INFO] Fichier de profil trouve : %%f
    set PROFILE_FOUND=1
    set PROFILE_FILE=%%f
    goto :profile_ok
)

:profile_ok
if %PROFILE_FOUND%==0 (
    echo [ERREUR] Aucun fichier .json trouve !
    echo.
    echo Telechargez votre profil depuis le site ChessAvatar et placez-le ici.
    pause
    exit /b 1
)

echo [OK] Tous les fichiers sont presents
echo.

:: =====================================================
:: ETAPE 4 : Configuration automatique
:: =====================================================

echo Lecture de %PROFILE_FILE%...

set ENGINE_NAME=
for /f "tokens=2 delims=:," %%a in ('type "%PROFILE_FILE%" ^| findstr /i "username"') do (
    set temp=%%a
    set temp=!temp:"=!
    set temp=!temp: =!
    set ENGINE_NAME=!temp!
    goto :name_found
)

:name_found
if "!ENGINE_NAME!"=="" (
    for /f "tokens=2 delims=:," %%a in ('type "%PROFILE_FILE%" ^| findstr /i /v "opening" ^| findstr /i "name"') do (
        set temp=%%a
        set temp=!temp:"=!
        set temp=!temp: =!
        set ENGINE_NAME=!temp!
        goto :name_found2
    )
)

:name_found2
if "!ENGINE_NAME!"=="" set ENGINE_NAME=ChessAvatar

set ENGINE_NAME=!ENGINE_NAME!_Avatar

set AUTHOR_NAME=Chess Avatar

echo.
echo ========================================
echo Configuration automatique detectee
echo ========================================
echo [INFO] Fichier de profil : %PROFILE_FILE%
echo [INFO] Nom du moteur     : !ENGINE_NAME!
echo [INFO] Auteur            : !AUTHOR_NAME!
echo [INFO] Stockfish         : !STOCKFISH_FILE!
echo.

set /p CUSTOMIZE="Voulez-vous personnaliser le nom et l'auteur? (O/N) [N]: "

if /i "!CUSTOMIZE!"=="O" (
    echo.
    echo ========================================
    echo Personnalisation
    echo ========================================

    set /p CUSTOM_ENGINE_NAME="Nom du moteur [!ENGINE_NAME!]: "
    if not "!CUSTOM_ENGINE_NAME!"=="" set ENGINE_NAME=!CUSTOM_ENGINE_NAME!

    set /p CUSTOM_AUTHOR="Nom de l'auteur [!AUTHOR_NAME!]: "
    if not "!CUSTOM_AUTHOR!"=="" set AUTHOR_NAME=!CUSTOM_AUTHOR!

    echo.
    echo [INFO] Configuration personnalisee :
    echo [INFO] Nom du moteur : !ENGINE_NAME!
    echo [INFO] Auteur        : !AUTHOR_NAME!
    echo.
)

echo Creation du fichier engine.ini...
(
echo [Engine]
echo Name=!ENGINE_NAME!
echo Author=!AUTHOR_NAME!
echo Protocol=UCI
echo StockfishPath=!STOCKFISH_FILE!
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
    echo [OK] engine.ini cree avec succes
) else (
    echo [ERREUR] Impossible de creer engine.ini
    pause
    exit /b 1
)

:: =====================================================
:: ETAPE 5 : Installation dans Documents\ChessBase\Engines
:: =====================================================

set MOTOR_DIR=%USERPROFILE%\Documents\ChessBase\Engines\!ENGINE_NAME!
echo.
echo Creation du dossier : !MOTOR_DIR!
if not exist "!MOTOR_DIR!" mkdir "!MOTOR_DIR!"

echo.
echo Copie des fichiers...
copy /Y "AvatarEngine.exe" "!MOTOR_DIR!\" >nul
copy /Y "!STOCKFISH_FILE!" "!MOTOR_DIR!\" >nul
copy /Y "%PROFILE_FILE%" "!MOTOR_DIR!\" >nul
copy /Y "engine.ini" "!MOTOR_DIR!\" >nul
if exist "swap_profile.bat" copy /Y "swap_profile.bat" "!MOTOR_DIR!\" >nul

if errorlevel 1 (
    echo.
    echo [ERREUR] Echec de la copie des fichiers
    echo Verifiez que vous avez les droits d'acces
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation terminee !
echo ========================================
echo.
echo Dossier d'installation : !MOTOR_DIR!
echo.
echo Fichiers installes :
echo - AvatarEngine.exe
echo - !STOCKFISH_FILE!
echo - %PROFILE_FILE%
echo - engine.ini ^(Nom: !ENGINE_NAME!, Auteur: !AUTHOR_NAME!^)
if exist "swap_profile.bat" echo - swap_profile.bat ^(pour changer d'avatar plus tard^)
echo.
echo Prochaines etapes :
echo.
echo Pour Fritz 20 / ChessBase :
echo 1. Ouvrez le logiciel
echo 2. Cliquez sur l'onglet "Module" dans le ruban
echo 3. Cliquez sur "Module UCI"
echo 4. Cliquez sur "..." pour parcourir
echo 5. Selectionnez : !MOTOR_DIR!\AvatarEngine.exe
echo 6. Le moteur apparaitra sous le nom : !ENGINE_NAME!
echo.
echo Pour Arena / Cutechess :
echo 1. Menu Engines ^> Install New Engine
echo 2. Selectionnez : !MOTOR_DIR!\AvatarEngine.exe
echo.
echo Pour changer d'avatar plus tard :
echo   Lancez swap_profile.bat dans !MOTOR_DIR!
echo   ^(voir README.txt pour les details^)
echo.
echo Votre avatar est pret a jouer !
echo.

endlocal
pause
