# One-time setup for running the stack natively on Windows (no Docker, no WSL2).
# Run from PowerShell:  .\scripts\windows\setup-local.ps1
param(
    [string]$PythonExe = "python"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$venv = Join-Path $root "backend\.venv"

& $PythonExe -c "import sys; assert sys.version_info >= (3, 12), 'Python 3.12+ required'"
if ($LASTEXITCODE -ne 0) { throw "Install Python 3.12 and pass its path with -PythonExe" }

& $PythonExe -m venv $venv
$venvPython = Join-Path $venv "Scripts\python.exe"
& $venvPython -m pip install -r (Join-Path $root "backend\requirements-dev.txt")
& $venvPython -m pip install -r (Join-Path $root "tool-runner\requirements.txt")

Push-Location (Join-Path $root "frontend")
try {
    npm install
} finally {
    Pop-Location
}

Write-Host "Setup complete. Start the stack with: .\scripts\windows\start-local.ps1"
