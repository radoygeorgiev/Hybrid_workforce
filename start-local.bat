@echo off
cd /d "%~dp0"
python server.py --port 8080 --open
if errorlevel 1 (
  echo.
  echo Python was not found. Install Python 3 or run: py server.py --port 8080 --open
  pause
)
