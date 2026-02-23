@echo off
setlocal

:: Try Git Bash from standard install locations
set "GITBASH="
if exist "C:\Program Files\Git\bin\bash.exe" (
    set "GITBASH=C:\Program Files\Git\bin\bash.exe"
) else if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    set "GITBASH=C:\Program Files (x86)\Git\bin\bash.exe"
) else (
    where bash >nul 2>&1 && set "GITBASH=bash"
)

if "%GITBASH%"=="" (
    echo Error: Git Bash not found. Install Git for Windows or run dev.sh from Git Bash.
    exit /b 1
)

"%GITBASH%" "%~dp0dev.sh"
