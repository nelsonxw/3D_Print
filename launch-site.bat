@echo off
rem Launches the Photo-to-STL site natively on Windows (tool runner, worker, API, frontend)
rem and opens it in the default browser. Run scripts\windows\setup-local.ps1 once first.
rem Extra arguments are passed to start-local.ps1, e.g.  launch-site.bat -CpuOnly

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\windows\start-local.ps1" %*
if errorlevel 1 (
    echo.
    echo Launch failed. Check the messages above.
    pause
    exit /b 1
)

echo Waiting for the frontend to start...
timeout /t 10 /nobreak >nul
start "" "http://localhost:3000"
