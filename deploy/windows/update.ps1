<#
  Updates the server to the latest code on GitHub and restarts the app.
  Run in an elevated PowerShell from anywhere:

    .\deploy\windows\update.ps1              # pull, install, build, restart
    .\deploy\windows\update.ps1 -SkipPull    # first install: build from the current checkout

  Works with either runner: scheduled task (install-task.ps1) or NSSM service
  (install-service.ps1). api\.env, web\.env, api\secrets and api\data are outside Git and
  are never touched.
#>
param(
  [string]$ServiceName = 'WholesaleOrder',
  [switch]$SkipPull
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\app-control.ps1"
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$api = Join-Path $repo 'api'
$web = Join-Path $repo 'web'

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
$runner = Get-AppRunner $ServiceName
if ($runner) {
  Write-Host "`n== Stop $ServiceName ($runner)" -ForegroundColor Cyan
  Stop-App $ServiceName $api
}

try {
  Invoke-Step 'Install API packages' $api { npm ci --omit=dev }
  Invoke-Step 'Check the SQL read-only guard' $api { node scripts/check-read-only.mjs }
  Invoke-Step 'Check local order data' $api { node scripts/check-store.mjs }
  Invoke-Step 'Run regression tests (mock data only)' $api { npm test }
  Invoke-Step 'Install web packages' $web { npm ci }
  # The site is served by the API on the same address, so it calls /api.
  $env:VITE_API_URL = '/api'
  Invoke-Step 'Build the website' $web { npm run build }
} finally {
  Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
  # Start again even when a step failed, so the API is not left offline; fix and re-run.
  if ($runner) {
    Write-Host "`n== Start $ServiceName ($runner)" -ForegroundColor Cyan
    Start-App $ServiceName
  }
}

if (-not $runner) {
  Write-Host "`n$ServiceName is not installed yet. Next: deploy\windows\install-task.ps1 (Task Scheduler) or install-service.ps1 (NSSM)" -ForegroundColor Yellow
}
