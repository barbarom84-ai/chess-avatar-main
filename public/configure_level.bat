@echo off
if not defined CA_IN_WT (
  if not defined WT_SESSION_ID (
    where wt >nul 2>&1 && (
      start "" wt.exe cmd /k "set CA_IN_WT=1&& cd /d \"%~dp0\" && \"%~f0\" %*"
      exit /b 0
    )
  )
)
set CA_IN_WT=
title Chess Avatar - Configuration niveau
color 0B
mode con: cols=104 lines=40 >nul 2>&1
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('ICAgX19fXyBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgXyAgICAgICAgICAgICANCiAgLyBfX198IHxfXyAgIF9fXyAgX19fIF9fXyAgIC8gXF9fICAgX19fXyBffCB8XyBfXyBfIF8gX18gDQogfCB8ICAgfCAnXyBcIC8gXyBcLyBfXy8gX198IC8gXyBcIFwgLyAvIF9gIHwgX18vIF9gIHwgJ19ffA0KIHwgfF9fX3wgfCB8IHwgIF9fL1xfXyBcX18gXC8gX19fIFwgViAvIChffCB8IHx8IChffCB8IHwgICANCiAgXF9fX198X3wgfF98XF9fX3x8X19fL19fXy9fLyAgIFxfXF8vIFxfXyxffFxfX1xfXyxffF98ICAgDQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA0K')); [Console]::Out.Write($s)"
echo Configuration du niveau de jeu
echo.
echo Choisissez le niveau :
echo 1. Debutant (ELO ~1200)
echo 2. Intermediaire (ELO ~1500)
echo 3. Avance (ELO ~1800)
echo 4. Expert (ELO ~2100)
echo 5. Grand Maitre (ELO ~2400+)
echo.
set /p level="Entrez le numero (1-5) : "

set MOTOR_DIR=%USERPROFILE%\Documents\ChessBase\Engines\MonAvatar

if "%level%"=="1" (
    set threads=1
    set depth=8
    set movetime=1000
    set aggro=30
)
if "%level%"=="2" (
    set threads=1
    set depth=11
    set movetime=800
    set aggro=50
)
if "%level%"=="3" (
    set threads=2
    set depth=14
    set movetime=600
    set aggro=70
)
if "%level%"=="4" (
    set threads=4
    set depth=17
    set movetime=400
    set aggro=85
)
if "%level%"=="5" (
    set threads=4
    set depth=20
    set movetime=200
    set aggro=100
)

echo.
echo Configuration appliquee :
echo - Threads : %threads%
echo - Profondeur : %depth%
echo - Temps de reflexion : %movetime%ms
echo - Agressivite : %aggro%%%
echo.
echo Redemarrez Fritz 20 pour appliquer les changements.
pause
