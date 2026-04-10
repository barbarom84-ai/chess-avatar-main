@echo off
REM Lance AvatarEngine.py avec Python (sans compilation PyInstaller)
REM -u = sortie non bufferisee (requis pour UCI)
if not defined CA_IN_WT (
  if not defined WT_SESSION_ID (
    where wt >nul 2>&1 && (
      start "" wt.exe cmd /k "set CA_IN_WT=1&& cd /d \"%~dp0\" && \"%~f0\" %*"
      exit /b 0
    )
  )
)
set CA_IN_WT=
title Chess Avatar - AvatarEngine (Python)
color 0B
mode con: cols=104 lines=40 >nul 2>&1
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('ICAgX19fXyBfICAgICAgICAgICAgICAgICAgICAgIF8gICAgICAgICAgICAgXyAgICAgICAgICAgICANCiAgLyBfX198IHxfXyAgIF9fXyAgX19fIF9fXyAgIC8gXF9fICAgX19fXyBffCB8XyBfXyBfIF8gX18gDQogfCB8ICAgfCAnXyBcIC8gXyBcLyBfXy8gX198IC8gXyBcIFwgLyAvIF9gIHwgX18vIF9gIHwgJ19ffA0KIHwgfF9fX3wgfCB8IHwgIF9fL1xfXyBcX18gXC8gX19fIFwgViAvIChffCB8IHx8IChffCB8IHwgICANCiAgXF9fX198X3wgfF98XF9fX3x8X19fL19fXy9fLyAgIFxfXF8vIFxfXyxffFxfX1xfXyxffF98ICAgDQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA0K')); [Console]::Error.Write($s)"
cd /d "%~dp0"
python -u "%~dp0AvatarEngine.py" %*
if errorlevel 1 pause
