<#
  Updates the server to the latest code on GitHub and restarts the service.
  Run in an elevated PowerShell from anywhere:

    .\deploy\windows\update.ps1              # pull, install, build, restart
    .\deploy\windows\update.ps1 -SkipPull    # first install: build from the current checkout

  api\.env, web\.env, api\secrets and api\data are outside Git and are never touched.
#>
param(
  [string]$ServiceName = 'WholesaleOrder',
  [switch]$SkipPull
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Invoke-Step([string]$Title, [string]$Directory, [scriptblock]$Command) {
  Write-Host "`n== $Title" -ForegroundColor Cyan
  Push-Location $Directory
  try {
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Title failed (exit code $LASTEXITCODE)" }
  } finally { Pop-Location }
}

foreach ($file in 'api\.env', 'web\.env') {
  if (-not (Test-Path (Join-Path $repo $file))) { throw "Missing $file - copy it from the development machine first." }
}

if (-not $SkipPull) { Invoke-Step 'Pull latest code' $repo { git pull --ff-only } }

# npm ci replaces node_modules, so the running app is stopped first (about a minute offline).
$service = Get-Service $ServiceName -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq 'Running') {
  Write-Host "`n== Stop $ServiceName" -ForegroundColor Cyan
  Stop-Service $ServiceName
}

try {
  Invoke-Step 'Install API packages' (Join-Path $repo 'api') { npm ci --omit=dev }
  Invoke-Step 'Check the SQL read-only guard' (Join-Path $repo 'api') { node scripts/check-read-only.mjs }
  Invoke-Step 'Install web packages' (Join-Path $repo 'web') { npm ci }
  # The site is served by the API on the same address, so it calls /api.
  $env:VITE_API_URL = '/api'
  Invoke-Step 'Build the website' (Join-Path $repo 'web') { npm run build }
} finally {
  Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
  # Start again even when a step failed, so the API is not left offline; fix and re-run.
  if ($service) {
    Write-Host "`n== Start $ServiceName" -ForegroundColor Cyan
    Start-Service $ServiceName
    Start-Sleep -Seconds 3
    Get-Service $ServiceName
  }
}

if (-not $service) {
  Write-Host "`nService $ServiceName is not installed yet. Next: deploy\windows\install-service.ps1" -ForegroundColor Yellow
}
