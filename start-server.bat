@echo off
setlocal enabledelayedexpansion
title Patchwright Agent Monitor Server

echo ========================================================
echo   Patchwright Agent Dashboard & Live Telemetry Server
echo   Reference: Claude Code Agent Monitor (hoangsonww)
echo ========================================================
echo.

:: Detect Python executable
set "PYTHON_CMD="
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
) else (
    for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
        if exist "%%D\python.exe" set "PYTHON_CMD=%%D\python.exe"
    )
)

if "%PYTHON_CMD%"=="" (
    python --version >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=python"
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python not found. Please install Python 3.6+ or add it to PATH.
    pause
    exit /b 1
)

echo [OK] Using Python: %PYTHON_CMD%
cd /d "%~dp0"

echo [OK] Starting Patchwright backend at http://localhost:8000 ...
start "" "http://localhost:8000"

"%PYTHON_CMD%" server.py
pause
