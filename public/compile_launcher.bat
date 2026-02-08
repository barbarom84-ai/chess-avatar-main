@echo off
REM Compile AvatarEngine_launcher.c en AvatarEngine_launcher.exe (pour ChessBase/Fritz qui n'acceptent pas le .bat)
REM Necessite : MinGW (gcc) ou Visual Studio (cl)
echo.
echo Compilation du launcher C...
echo.

where gcc >nul 2>&1
if %errorlevel%==0 (
    gcc -o AvatarEngine_launcher.exe AvatarEngine_launcher.c
    if %errorlevel%==0 (
        echo [OK] AvatarEngine_launcher.exe cree avec gcc
        goto :done
    )
)

where cl >nul 2>&1
if %errorlevel%==0 (
    cl /Fe:AvatarEngine_launcher.exe AvatarEngine_launcher.c
    if %errorlevel%==0 (
        echo [OK] AvatarEngine_launcher.exe cree avec MSVC
        del AvatarEngine_launcher.obj 2>nul
        goto :done
    )
)

echo [ERREUR] Ni gcc ni cl trouve. Installez MinGW ou Visual Studio.
echo MinGW : https://www.mingw-w64.org/
echo Ou utilisez le mode Python : python -u AvatarEngine.py
pause
exit /b 1

:done
echo.
if "%~1"=="" (
    echo Dans ChessBase/Fritz, selectionnez AvatarEngine_launcher.exe comme moteur UCI.
    echo.
    pause
)
exit /b 0
