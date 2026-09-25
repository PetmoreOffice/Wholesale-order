<#
  Installs Wholesale Order as a Windows service with NSSM (https://nssm.cc).
  Run once, in an elevated PowerShell (Run as administrator), from anywhere:

    .\deploy\windows\install-service.ps1 -Nssm "C:\Tools\nssm\win64\nssm.exe"

  The service runs `node src\server.js` in the api folder, starts with Windows, restarts
  itself if Node exits, and writes logs to api\logs (rotated at 10 MB).
#>
param(
  [Parameter(Mandatory = $true)][string]$Nssm,
  [string]$ServiceName = 'WholesaleOrder',
  [string]$Node = (Get-Command node -ErrorAction Stop).Source,
  # 3000 and 3001 are taken by other apps on the production server.
  [int]$Port = 3005
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$api = Join-Path $repo 'api'
$logs = Join-Path $api 'logs'

if (-not (Test-Path $Nssm)) { throw "NSSM not found at $Nssm" }
if (-not (Test-Path (Join-Path $api '.env'))) { throw "Missing $api\.env - copy it from the development machine first." }
if (-not (Test-Path (Join-Path $repo 'web\dist\index.html'))) { throw 'The website is not built yet. Run deploy\windows\update.ps1 -SkipPull first.' }
$inUse = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($inUse) { throw "Port $Port is already used by process $($inUse[0].OwningProcess). Pick a free one with -Port and set the same port in deploywindowsiisweb.config." }
New-Item -ItemType Directory -Force $logs | Out-Null

& $Nssm install $ServiceName $Node 'src\server.js'
& $Nssm set $ServiceName AppDirectory $api
& $Nssm set $ServiceName DisplayName 'Wholesale Order'
& $Nssm set $ServiceName Description 'Wholesale Order web app and API (Node.js)'
& $Nssm set $ServiceName Start SERVICE_AUTO_START
# Only IIS on this machine reaches Node; the public port is IIS (HTTPS).
& $Nssm set $ServiceName AppEnvironmentExtra "NODE_ENV=production" "HOST=127.0.0.1" "PORT=$Port"
& $Nssm set $ServiceName AppStdout (Join-Path $logs 'service.log')
& $Nssm set $ServiceName AppStderr (Join-Path $logs 'service-error.log')
& $Nssm set $ServiceName AppRotateFiles 1
& $Nssm set $ServiceName AppRotateOnline 1
& $Nssm set $ServiceName AppRotateBytes 10485760
& $Nssm set $ServiceName AppExit Default Restart
& $Nssm set $ServiceName AppRestartDelay 5000

Start-Service $ServiceName
Start-Sleep -Seconds 3
Get-Service $ServiceName
try {
  $health = Invoke-RestMethod "http://127.0.0.1:$Port/api/health" -TimeoutSec 15
  Write-Host "Health: $($health.status), database: $($health.database)"
} catch {
  Write-Warning "The service started but /api/health did not answer. Check $logs\service-error.log"
}
