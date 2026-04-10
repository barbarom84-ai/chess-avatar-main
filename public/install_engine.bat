@echo off
title Chess Avatar - Installation moteur UCI
color 0B
mode con: cols=104 lines=45 >nul 2>&1
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('ICAgX19fXyBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgXyAgICAgICAgICAgICANCiAgLyBfX198IHxfXyAgIF9fXyAgX19fIF9fXyAgIC8gXF9fICAgX19fXyBffCB8XyBfXyBfIF8gX18gDQogfCB8ICAgfCAnXyBcIC8gXyBcLyBfXy8gX198IC8gXyBcIFwgLyAvIF9gIHwgX18vIF9gIHwgJ19ffA0KIHwgfF9fX3wgfCB8IHwgIF9fL1xfXyBcX18gXC8gX19fIFwgViAvIChffCB8IHx8IChffCB8IHwgICANCiAgXF9fX198X3wgfF98XF9fX3x8X19fL19fXy9fLyAgIFxfXF8vIFxfXyxffFxfX1xfXyxffF98ICAgDQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA0K')); [Console]::Out.Write($s)"
:: Demander les droits administrateur si necessaire
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Demande des droits administrateur...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

setlocal enabledelayedexpansion
echo ========================================
echo Installation du Moteur UCI
echo ========================================
echo.

:: Obtenir le dossier du script
cd /d "%~dp0"

echo Dossier actuel : %CD%
echo.

:: =====================================================
:: ETAPE 1 : Compilation (si necessaire)
:: =====================================================

:: Verifier si AvatarEngine.py existe
if not exist "AvatarEngine.py" (
    echo [ERREUR] AvatarEngine.py introuvable !
    echo.
    echo Telechargez AvatarEngine.py depuis le site ChessAvatar
    pause
    exit /b 1
)

echo [OK] AvatarEngine.py trouve

:: Verifier si recompilation necessaire
set NEED_COMPILE=0

if not exist "AvatarEngine.exe" (
    echo [INFO] AvatarEngine.exe introuvable
    set NEED_COMPILE=1
) else (
    :: Verifier si .py est plus recent que .exe
    for %%A in (AvatarEngine.py) do set PY_TIME=%%~tA
    for %%B in (AvatarEngine.exe) do set EXE_TIME=%%~tB
    
    if "!PY_TIME!" GTR "!EXE_TIME!" (
        echo [INFO] AvatarEngine.py a ete modifie
        echo [INFO] Recompilation necessaire
        set NEED_COMPILE=1
    ) else (
        echo [OK] AvatarEngine.exe deja a jour
    )
)

:: Compiler si necessaire
if %NEED_COMPILE%==1 (
    echo.
    echo [INFO] Compilation automatique en cours...
    echo.
    
    :: Verifier Python
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
    
    :: Verifier PyInstaller
    python -m pip show pyinstaller >nul 2>&1
    if errorlevel 1 (
        echo.
        echo [INFO] Installation de PyInstaller...
        python -m pip install pyinstaller
        if errorlevel 1 (
            echo [ERREUR] Echec de l'installation de PyInstaller
            echo Si python -m pip est bloque ^(ex: Device Guard^), contactez votre administrateur ou utilisez un autre PC pour compiler AvatarEngine.exe.
            pause
            exit /b 1
        )
    )
    
    echo [OK] PyInstaller detecte
    echo.
    echo ========================================
    echo   Compilation en cours...
    echo ========================================
    echo.
    
    pyinstaller --onefile --console --clean --name AvatarEngine AvatarEngine.py
    
    if errorlevel 1 (
        echo [ERREUR] La compilation a echoue
        pause
        exit /b 1
    )
    
    if exist "dist\AvatarEngine.exe" (
        copy /Y "dist\AvatarEngine.exe" "AvatarEngine.exe" >nul
        echo [OK] AvatarEngine.exe compile avec succes !
        rmdir /S /Q build 2>nul
        rmdir /S /Q dist 2>nul
        del /Q AvatarEngine.spec 2>nul
    ) else (
        echo [ERREUR] AvatarEngine.exe n'a pas ete cree
        pause
        exit /b 1
    )
    
    echo.
)

:: =====================================================
:: ETAPE 2 : Verification des fichiers
:: =====================================================

:: AvatarEngine.exe requis
if not exist "AvatarEngine.exe" (
    echo [ERREUR] AvatarEngine.exe introuvable !
    echo.
    echo Lancez d'abord la compilation ^(etape 1^) ou placez AvatarEngine.exe dans ce dossier.
    pause
    exit /b 1
)

echo [OK] AvatarEngine.exe trouve

:: Chercher Stockfish
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
    echo [ERREUR] Aucun fichier Stockfish trouve !
    echo.
    echo Fichiers .exe presents :
    dir /B *.exe
    echo.
    echo Telechargez Stockfish depuis stockfishchess.org
    pause
    exit /b 1
)

:: Chercher le fichier de profil JSON (n'importe quel .json)
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
    echo Fichiers presents :
    dir /B
    echo.
    echo Generez votre profil sur le site ChessAvatar
    echo Le nom du fichier peut etre profile.json ou Bot_VotreNom.profile.json
    pause
    exit /b 1
)

echo [OK] Tous les fichiers sont presents
echo.

:: =====================================================
:: ETAPE 3 : Configuration automatique
:: =====================================================

:: Lire le nom depuis profile.json
echo Lecture de %PROFILE_FILE%...
setlocal enabledelayedexpansion

:: Chercher "username" dans profile.json
set ENGINE_NAME=
for /f "tokens=2 delims=:," %%a in ('type "%PROFILE_FILE%" ^| findstr /i "username"') do (
    set temp=%%a
    set temp=!temp:"=!
    set temp=!temp: =!
    set ENGINE_NAME=!temp!
    goto :name_found
)

:name_found
:: Si pas de username, chercher "name"
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
:: Par defaut si pas trouve
if "!ENGINE_NAME!"=="" set ENGINE_NAME=ChessAvatar

:: Ajouter suffixe _Avatar
set ENGINE_NAME=!ENGINE_NAME!_Avatar

:: Auteur fixe
set AUTHOR_NAME=Chess Avatar

echo.
echo ========================================
echo Configuration automatique detectee
echo ========================================
echo [INFO] Fichier de profil : %PROFILE_FILE%
echo [INFO] Nom du moteur : !ENGINE_NAME!
echo [INFO] Auteur : !AUTHOR_NAME!
echo [INFO] Stockfish : %STOCKFISH_FILE%
echo.

:: Demander si l'utilisateur veut personnaliser
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
    echo [INFO] Auteur : !AUTHOR_NAME!
    echo.
)

:: Creer engine.ini dans le dossier actuel
echo Creation du fichier engine.ini...
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
    echo [OK] engine.ini cree avec succes
) else (
    echo [ERREUR] Impossible de creer engine.ini
    pause
    exit /b 1
)

:: =====================================================
:: ETAPE 4 : Installation
:: =====================================================

:: Creer le dossier du moteur
set MOTOR_DIR=%USERPROFILE%\Documents\ChessBase\Engines\!ENGINE_NAME!
echo.
echo Creation du dossier : !MOTOR_DIR!
if not exist "!MOTOR_DIR!" mkdir "!MOTOR_DIR!"

:: Copier les fichiers
echo.
echo Copie des fichiers...
copy /Y "AvatarEngine.exe" "!MOTOR_DIR!\"
copy /Y "%STOCKFISH_FILE%" "!MOTOR_DIR!\"
copy /Y "%PROFILE_FILE%" "!MOTOR_DIR!\"
copy /Y "engine.ini" "!MOTOR_DIR!\"

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
echo - %STOCKFISH_FILE%
echo - %PROFILE_FILE%
echo - engine.ini (Nom: !ENGINE_NAME!, Auteur: !AUTHOR_NAME!)
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
echo Votre avatar est pret a jouer !
echo.

endlocal
pause
