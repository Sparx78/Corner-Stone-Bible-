<#
  Kept so the old command still works: it now runs sync-pc.ps1, which updates this PC's copy,
  sends its recordings and refreshes the app's list of recorded chapters.

    powershell -ExecutionPolicy Bypass -File C:\G_Labs\Corner-Stone-Bible-\tools\send-recordings.ps1
#>
& (Join-Path $PSScriptRoot "sync-pc.ps1")
