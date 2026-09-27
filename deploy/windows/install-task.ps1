<#
  Runs Wholesale Order from Windows Task Scheduler (no extra software; the alternative to
  install-service.ps1 / NSSM). Run once, in an elevated PowerShell:

    .\deploy\windows\install-task.ps1

  The task starts at boot as SYSTEM without anyone signing in, never times out, and runs
  start-app.cmd, which restarts Node 10 seconds after it exits. Logs: api\logs\app.log.
#>
param(
  [string]$TaskName = 'WholesaleOrder',
  # 3000 and 3001 are taken by other apps on the production server.
  [int]$Port = 3005,
  [string]$Node = (Get-Command node -ErrorAction Stop).Source
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\app-control.ps1"
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$api = Join-Path $repo 'api'
$startScript = Join-Path $PSScriptRoot 'start-app.cmd'

if (Get-Service $TaskName -ErrorAction SilentlyContinue) { throw "A Windows service named $TaskName already exists (NSSM). Use one runner only." }
if (-not (Test-Path (Join-Path $api '.env'))) { throw "Missing $api\.env - copy it from the development machine first." }
if (-not (Test-Path (Join-Path $repo 'web\dist\index.html'))) { throw 'The website is not built yet. Run deploy\windows\update.ps1 -SkipPull first.' }

# Re-installing: stop the old task first so its port is free again.
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) { Stop-App $TaskName $api }
$inUse = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($inUse) { throw "Port $Port is already used by process $($inUse[0].OwningProcess). Pick a free one with -Port and set the same port in deploy\windows\iis\web.config." }

$action = New-ScheduledTaskAction -Execute $startScript -Argument "$Port `"$Node`"" -WorkingDirectory $api
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
# ExecutionTimeLimit 0 = no limit (the default would stop the app after 3 days).
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew `
  -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Description 'Wholesale Order web app and API (Node.js)' `
  -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Start-App $TaskName
Start-Sleep -Seconds 5
try {
  $health = Invoke-RestMethod "http://127.0.0.1:$Port/api/health" -TimeoutSec 15
  Write-Host "Health: $($health.status), database: $($health.database)"
} catch {
  Write-Warning "The task started but /api/health did not answer. Check $api\logs\app.log"
}
