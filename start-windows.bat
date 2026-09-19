@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 server.py --open
) else (
  where python >nul 2>nul
  if errorlevel 1 (
    echo Python 3 is required for this fallback. Open Context-Lab.html in Chrome or Edge instead.
    pause
  ) else (
    python server.py --open
  )
)
