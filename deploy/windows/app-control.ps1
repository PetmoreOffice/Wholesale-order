# Shared by update.ps1 and install-task.ps1: stop and start the app whether it runs as an
# NSSM Windows service or as a scheduled task. Dot-source it: . "$PSScriptRoot\app-control.ps1"

function Get-AppRunner([string]$Name) {
  if (Get-Service $Name -ErrorAction SilentlyContinue) { return 'service' }
  if (Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue) { return 'task' }
  return $null
}

# Node processes started by start-app.cmd carry the full path of this repo's server.js, so
# only this app's process matches; other projects' Node processes are never touched.
function Stop-AppNodeProcess([string]$ApiDir) {
  $script = (Join-Path $ApiDir 'src\server.js').ToLowerInvariant()
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine.ToLowerInvariant().Contains($script) } |
    ForEach-Object {
      Write-Host "Stopping leftover app process $($_.ProcessId)"
      Stop-Process -Id $_.ProcessId -Force -Confirm:$false -ErrorAction SilentlyContinue
    }
}

function Stop-App([string]$Name, [string]$ApiDir) {
  switch (Get-AppRunner $Name) {
    'service' { Stop-Service $Name }
    'task' {
      Stop-ScheduledTask -TaskName $Name
      Start-Sleep -Seconds 2
      Stop-AppNodeProcess $ApiDir
    }
  }
}

function Start-App([string]$Name) {
  switch (Get-AppRunner $Name) {
    'service' { Start-Service $Name; Start-Sleep -Seconds 3; Get-Service $Name | Format-Table -AutoSize | Out-Host }
    'task' { Start-ScheduledTask -TaskName $Name; Start-Sleep -Seconds 3; Get-ScheduledTask -TaskName $Name | Format-Table TaskName, State -AutoSize | Out-Host }
  }
}
