@echo off
REM ====================================================================
REM Compilation d'AvatarEngine.py en AvatarEngine.exe
REM ====================================================================

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
