@echo off
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" server.py
) else (
    python server.py
)
