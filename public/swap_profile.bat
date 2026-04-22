@echo off
title Chess Avatar - Changement d'avatar

:: Auto-elevation UAC (le dossier moteur peut avoir ete cree en admin
:: par install_engine.bat, donc swap_profile.bat doit aussi etre admin).
net session >nul 2>&1
if errorlevel 1 (
    echo [INFO] Privileges administrateur requis pour modifier le dossier moteur.
    echo [INFO] Demande d'elevation UAC en cours...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
    exit /b 0
)

color 0B
mode con: cols=104 lines=35 >nul 2>&1

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ========================================
echo   Hot-swap profil avatar
echo ========================================
echo.
echo Dossier moteur : %CD%
echo.

if not exist "AvatarEngine.exe" (
    echo [ERREUR] Ce script doit etre place dans le dossier d'un moteur deja installe.
    echo          ^(typiquement: Documents\ChessBase\Engines\^<NomMoteur^>\^)
    pause
    exit /b 1
)

echo Profil actuel :
if exist "profile.json" (
    echo   profile.json
) else (
    for %%f in (*.json) do echo   %%f
)
echo.

echo Glissez-deposez votre nouveau fichier .json dans cette fenetre,
echo puis appuyez sur Entree :
set /p NEW_PROFILE="> "

set NEW_PROFILE=!NEW_PROFILE:"=!

if "!NEW_PROFILE!"=="" (
    echo [ERREUR] Aucun fichier specifie.
    pause
    exit /b 1
)

if not exist "!NEW_PROFILE!" (
    echo [ERREUR] Fichier introuvable : !NEW_PROFILE!
    pause
    exit /b 1
)

echo.
echo [INFO] Sauvegarde de l'ancien profil...
if exist "profile.json" copy /Y "profile.json" "profile.previous.json" >nul

echo [INFO] Copie du nouveau profil sous le nom standard profile.json...
copy /Y "!NEW_PROFILE!" "profile.json" >nul
if errorlevel 1 (
    echo [ERREUR] Impossible de copier le nouveau profil.
    pause
    exit /b 1
)

echo [INFO] Suppression de engine.ini ^(le moteur prendra le nom du nouveau profil^)...
if exist "engine.ini" del /Q "engine.ini"

echo.
echo ========================================
echo   Profil change avec succes !
echo ========================================
echo.
echo [OK] Nouveau profil actif : profile.json
echo [OK] Ancien profil sauvegarde : profile.previous.json
echo [OK] engine.ini supprime - sera regenere par AvatarEngine au prochain lancement
echo.
echo IMPORTANT :
echo   1. Si Fritz / Arena est ouvert, fermez-le completement
echo   2. Relancez Fritz / Arena
echo   3. Demarrez une nouvelle partie : votre moteur joue avec le nouveau profil
echo.
echo Pour restaurer l'ancien profil :
echo   copy /Y profile.previous.json profile.json
echo.

endlocal
pause
