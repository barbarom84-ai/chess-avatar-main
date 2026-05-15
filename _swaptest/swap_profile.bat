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

echo REMARQUE : Dans une fenetre administrateur, le glisser-depose depuis
echo            l'Explorateur est souvent bloque par Windows ^(securite UAC^).
echo            Utilisez l'option 2 ci-dessous, ou collez le chemin ^(option 1^).
echo.

echo Comment indiquer le nouveau fichier .json ?
echo   [1] Taper ou coller le chemin complet
echo       ^(dans l'Explorateur : Shift + clic droit sur le fichier ^> Copier comme
echo        chemin d'acces, puis Ctrl+V ici^)
echo   [2] Parcourir ^(boite de dialogue fichier - recommande en admin^)
echo.
set /p SWAP_MODE=Tapez 1 ou 2 puis Entree ^(defaut : 1^) : 

if "!SWAP_MODE!"=="" set "SWAP_MODE=1"
set "SWAP_MODE=!SWAP_MODE: =!"
if "!SWAP_MODE!"=="" set "SWAP_MODE=1"

if "!SWAP_MODE!"=="2" goto pick_dialog
if not "!SWAP_MODE!"=="1" (
    echo [ERREUR] Choix invalide. Utilisez 1 ou 2.
    pause
    exit /b 1
)

echo.
echo Collez le chemin complet vers votre fichier .json puis Entree :
set /p "NEW_PROFILE=> "
goto after_input

:pick_dialog
echo.
echo [INFO] Ouverture du selecteur de fichier...
set "NEW_PROFILE="
set "SWAP_TMP=%TEMP%\chessavatar_swap_path.tmp"
del /f /q "%SWAP_TMP%" 2>nul
powershell -NoProfile -STA -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = 'Profil JSON (*.json)|*.json|Tous (*.*)|*.*'; $d.Title = 'Chess Avatar - Choisir le profil'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [System.IO.File]::WriteAllText([System.IO.Path]::Combine($env:TEMP, 'chessavatar_swap_path.tmp'), $d.FileName) }"
if not exist "%SWAP_TMP%" (
    echo [ERREUR] Selection annulee ou impossible d'ouvrir le dialogue.
    pause
    exit /b 1
)
for /f "usebackq delims=" %%a in ("%SWAP_TMP%") do set "NEW_PROFILE=%%a"
del /f /q "%SWAP_TMP%" 2>nul

:after_input

:: Supprimer espaces en fin de ligne (frequent avec set /p)
:trimtrail
if "!NEW_PROFILE!"=="" goto trimtraildone
if "!NEW_PROFILE:~-1!"==" " set "NEW_PROFILE=!NEW_PROFILE:~0,-1!" & goto trimtrail
:trimtraildone

if "!NEW_PROFILE!"=="" (
    echo [ERREUR] Aucun fichier specifie.
    pause
    exit /b 1
)

:: Chemin absolu, guillemets retires
for %%I in ("!NEW_PROFILE!") do set "NEW_PROFILE=%%~fI"

if "!NEW_PROFILE!"=="" (
    echo [ERREUR] Chemin vide apres normalisation.
    pause
    exit /b 1
)

set "_ext=!NEW_PROFILE:~-5!"
if /i not "!_ext!"==".json" (
    echo [ERREUR] Le fichier doit avoir l'extension .json
    echo          Chemin : !NEW_PROFILE!
    pause
    exit /b 1
)

if not exist "!NEW_PROFILE!" (
    echo [ERREUR] Fichier introuvable :
    echo          !NEW_PROFILE!
    echo.
    echo Astuce : en fenetre admin, preferez l'option 2 du menu ou
    echo           Shift + clic droit sur le fichier ^> Copier comme chemin d'acces.
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
