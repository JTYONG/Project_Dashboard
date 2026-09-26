@echo off
setlocal enabledelayedexpansion
title EVA SQUARE - Local Server
cd /d "%~dp0backend"

rem ---- Find a Python interpreter ----
where python >nul 2>nul
if errorlevel 1 (
    where py >nul 2>nul
    if errorlevel 1 (
        echo.
        echo Python was not found on this computer.
        echo Please install Python 3.9 or later from https://www.python.org/downloads/
        echo and make sure to check "Add python.exe to PATH" during installation.
        echo Then double-click run.bat again.
        echo.
        pause
        exit /b 1
    )
    set "PYEXE=py"
) else (
    set "PYEXE=python"
)

rem ---- Create the virtual environment on first run ----
if not exist ".venv\Scripts\activate.bat" (
    echo Setting up EVA SQUARE for the first time - this can take a minute...
    !PYEXE! -m venv .venv
    if errorlevel 1 (
        echo.
        echo Could not create a Python virtual environment. See the error above.
        pause
        exit /b 1
    )
)

call .venv\Scripts\activate.bat

rem ---- Install/update dependencies (fast no-op once already installed) ----
echo Checking dependencies...
python -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
    echo.
    echo Failed to install dependencies. Check your internet connection and try again.
    pause
    exit /b 1
)

rem ---- Seed the database with demo accounts on first run ----
if not exist "..\database\square.db" (
    echo Creating the local database with sample accounts...
    python -m app.seed
)

echo.
echo ============================================================
echo   EVA SQUARE is starting at http://localhost:8000
echo   Your browser will open automatically in a few seconds.
echo   Keep this window open while you use the app.
echo   Close this window (or press Ctrl+C) to stop the server.
echo ============================================================
echo.

start "" cmd /c "timeout /t 3 >nul & start http://localhost:8000"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

echo.
echo EVA SQUARE has stopped.
pause
