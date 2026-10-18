@echo off
cd /d "%~dp0"
set "HYBRID_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%HYBRID_PYTHON%" goto run
set "HYBRID_PYTHON=py"
where py >nul 2>nul
if not errorlevel 1 goto run
set "HYBRID_PYTHON=python"
where python >nul 2>nul
if not errorlevel 1 goto run
echo Python 3.10 or later is required. You can also open standalone.html.
pause
exit /b 1
:run
"%HYBRID_PYTHON%" server.py --port 8080 --open
if errorlevel 1 (
  echo.
  echo The local server could not start. Read the error above.
  pause
)
