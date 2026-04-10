@echo off
REM Compile AvatarEngine_launcher.c en AvatarEngine_launcher.exe (pour ChessBase/Fritz qui n'acceptent pas le .bat)
REM Necessite : MinGW (gcc) ou Visual Studio (cl)
if not defined CA_IN_WT (
  if not defined WT_SESSION_ID (
    where wt >nul 2>&1 && (
      start "" wt.exe cmd /k "set CA_IN_WT=1&& cd /d \"%~dp0\" && \"%~f0\" %*"
      exit /b 0
    )
  )
)
set CA_IN_WT=
title Chess Avatar - Compilation launcher C
color 0B
mode con: cols=104 lines=40 >nul 2>&1
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('ICAgX19fXyBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgXyAgICAgICAgICAgICANCiAgLyBfX198IHxfXyAgIF9fXyAgX19fIF9fXyAgIC8gXF9fICAgX19fXyBffCB8XyBfXyBfIF8gX18gDQogfCB8ICAgfCAnXyBcIC8gXyBcLyBfXy8gX198IC8gXyBcIFwgLyAvIF9gIHwgX18vIF9gIHwgJ19ffA0KIHwgfF9fX3wgfCB8IHwgIF9fL1xfXyBcX18gXC8gX19fIFwgViAvIChffCB8IHx8IChffCB8IHwgICANCiAgXF9fX198X3wgfF98XF9fX3x8X19fL19fXy9fLyAgIFxfXF8vIFxfXyxffFxfX1xfXyxffF98ICAgDQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA0K')); [Console]::Out.Write($s)"
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
