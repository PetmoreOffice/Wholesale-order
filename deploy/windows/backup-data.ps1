<#
  Copies api\data (orders, customer profiles, backups, archive) to a folder outside the
  server, e.g. a NAS share, into one dated folder per day. Old day folders are removed.

    .\deploy\windows\backup-data.ps1 -Destination "\\nas01\backup\wholesale-order"

  Schedule it daily (elevated PowerShell, adjust the paths):

    $script = "C:\apps\Wholesale-order\deploy\windows\backup-data.ps1"
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -Destination `"\\nas01\backup\wholesale-order`""
    Register-ScheduledTask -TaskName 'Wholesale Order data backup' -Action $action -Trigger (New-ScheduledTaskTrigger -Daily -At 23:00) -User 'SYSTEM' -RunLevel Highest

  The SYSTEM account needs write access to the share; otherwise run the task as a
  service account that has it.
#>
param(
  [Parameter(Mandatory = $true)][string]$Destination,
  [int]$KeepDays = 60
)

$ErrorActionPreference = 'Stop'
$source = (Resolve-Path (Join-Path $PSScriptRoot '..\..\api\data')).Path
$target = Join-Path $Destination (Get-Date -Format 'yyyy-MM-dd')

New-Item -ItemType Directory -Force $target | Out-Null
# /E subfolders, /R:2 /W:5 retry briefly if a file is being written, /NP no progress noise.
robocopy $source $target /E /R:2 /W:5 /NP /XF *.tmp | Out-Host
# robocopy: 0-7 are success codes, 8 and above are failures.
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

$cutoff = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem $Destination -Directory |
  Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' -and [datetime]::ParseExact($_.Name, 'yyyy-MM-dd', $null) -lt $cutoff } |
  Remove-Item -Recurse -Force -Confirm:$false

Write-Host "Copied $source to $target"
exit 0
