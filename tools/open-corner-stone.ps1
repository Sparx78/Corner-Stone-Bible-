<#
  Opens Corner Stone in its own window and, at the same time, syncs this PC's Voxly recordings in the background
  (sync-pc.ps1). The desktop shortcut made by install-desktop.ps1 runs this when it is installed from this folder.
#>
& {
  $AppUrl = "https://sparx78.github.io/Corner-Stone-Bible-/"
  $Browser = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

  # 1. The app first, so it opens straight away
  if ($Browser) { Start-Process -FilePath $Browser -ArgumentList "--app=$AppUrl", "--window-size=1100,860" }
  else { Start-Process $AppUrl }

  # 2. Then the sync, quietly in the background
  $sync = Join-Path $PSScriptRoot "sync-pc.ps1"
  if (Test-Path $sync) {
    Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$sync`""
  }
}
