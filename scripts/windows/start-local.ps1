# Starts the native Windows stack: tool runner, Celery worker, API and frontend.
# Requires PostgreSQL and a Redis-compatible server (Memurai) already running on localhost.
param(
    [string]$ToolsDir = (Join-Path $env:USERPROFILE "tools"),
    [string]$ColmapBin = "",
    [string]$OpenMvsBin = "",
    [string]$BlenderExe = "",
    [string]$StorageDir = "",
    [string]$JwtSecret = "dev-only-change-me",
    [string]$DatabaseUrl = "postgresql+psycopg://photo:photo@localhost:5432/photo_stl",
    [string]$RedisUrl = "redis://localhost:6379/0"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$venvPython = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) { throw "Run .\scripts\windows\setup-local.ps1 first" }

if (-not $ColmapBin) { $ColmapBin = Join-Path $ToolsDir "colmap\bin" }
if (-not $OpenMvsBin) { $OpenMvsBin = Join-Path $ToolsDir "openmvs" }
if (-not $BlenderExe) { $BlenderExe = Join-Path $ToolsDir "blender-4.2.3-windows-x64\blender.exe" }
if (-not $StorageDir) { $StorageDir = Join-Path $root "data" }
$storage = (New-Item -ItemType Directory -Force -Path $StorageDir).FullName

foreach ($path in @($ColmapBin, $OpenMvsBin, $BlenderExe)) {
    if (-not (Test-Path $path)) { throw "Tool path not found: $path (set it with the matching parameter)" }
}

$env:PATH = "$ColmapBin;$OpenMvsBin;$env:PATH"
$env:DATABASE_URL = $DatabaseUrl
$env:REDIS_URL = $RedisUrl
$env:JWT_SECRET = $JwtSecret
$env:STORAGE_ROOT = $storage
$env:CORS_ORIGINS = '["http://localhost:3000"]'
$env:CLAMAV_ENABLED = "false"
$env:BLENDER_BIN = $BlenderExe
$env:COLMAP_RUNNER_URL = "http://localhost:8001"
$env:OPENMVS_RUNNER_URL = "http://localhost:8001"
$env:COLMAP_USE_GPU = "true"
$env:ALLOWED_BINARIES = "colmap,InterfaceCOLMAP,DensifyPointCloud,ReconstructMesh"

$backend = Join-Path $root "backend"
$runner = Join-Path $root "tool-runner"
$frontend = Join-Path $root "frontend"

Start-Process -FilePath $venvPython -WorkingDirectory $runner -WindowStyle Normal -ArgumentList "-m", "uvicorn", "runner:app", "--host", "127.0.0.1", "--port", "8001"
Start-Process -FilePath $venvPython -WorkingDirectory $backend -WindowStyle Normal -ArgumentList "-m", "celery", "-A", "app.celery_app", "worker", "--pool=solo", "--concurrency=1", "--loglevel=info"
Start-Process -FilePath $venvPython -WorkingDirectory $backend -WindowStyle Normal -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"
Start-Process -FilePath "npm.cmd" -WorkingDirectory $frontend -WindowStyle Normal -ArgumentList "run", "dev"

Write-Host "Started tool runner (8001), worker, API (http://localhost:8000) and frontend (http://localhost:3000)."
