<#
  Corner Stone (King James Bible): install as a desktop app on Windows.

  Creates a "Corner Stone" shortcut on your Desktop and in the Start menu. It opens the app in its own window
  (Microsoft Edge or Google Chrome "app mode"), works offline once opened, and updates itself.

  The simplest way needs no script: in Microsoft Edge, open the app and choose ... > Apps > Install this site as an app.

  To use this script instead: download it, read it, then in PowerShell run
    powershell -ExecutionPolicy Bypass -File .\install-desktop.ps1
  Remove the shortcuts again:
    $env:SCRIPTURE_UNINSTALL = "1"; powershell -ExecutionPolicy Bypass -File .\install-desktop.ps1
#>
# Everything runs in its own scope, so nothing is left behind in your PowerShell session.
& {
  $Uninstall = ($env:SCRIPTURE_UNINSTALL -eq "1")

  $ErrorActionPreference = "Stop"
  $AppUrl   = "https://sparx78.github.io/Corner-Stone-Bible-/"
  $AppName  = "Corner Stone"
  $Home2    = Join-Path $env:LOCALAPPDATA "ScriptureBible"
  $Icon     = Join-Path $Home2 "scripture.ico"
  $Desktop  = [Environment]::GetFolderPath("Desktop")
  $StartDir = [Environment]::GetFolderPath("Programs")
  $Links    = @((Join-Path $Desktop "$AppName.lnk"), (Join-Path $StartDir "$AppName.lnk"))
  # Shortcuts from before the app was renamed (it was called "Scripture")
  $OldLinks = @((Join-Path $Desktop "Scripture.lnk"), (Join-Path $StartDir "Scripture.lnk"))
  foreach ($l in $OldLinks) { if (Test-Path $l) { Remove-Item $l -Force } }

  if ($Uninstall) {
    foreach ($l in $Links) { if (Test-Path $l) { Remove-Item $l -Force; Write-Host "Removed $l" } }
    if (Test-Path $Home2) { Remove-Item $Home2 -Recurse -Force }
    Write-Host "Corner Stone desktop shortcuts removed. Your notes stay in the browser (and in sync, if it is on)." -ForegroundColor Green
    $env:SCRIPTURE_UNINSTALL = $null
    return
  }

  # 1. Find a browser that can open a web app in its own window
  $candidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  $Browser = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if (-not $Browser) { throw "Neither Microsoft Edge nor Google Chrome was found. Install one of them and run this again." }
  Write-Host "Using $Browser"

  # 2. The app's icon
  New-Item -ItemType Directory -Force -Path $Home2 | Out-Null
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -UseBasicParsing -Uri ($AppUrl + "icons/scripture.ico") -OutFile $Icon

  # 3. Shortcuts on the Desktop and in the Start menu
  $shell = New-Object -ComObject WScript.Shell
  foreach ($l in $Links) {
    $s = $shell.CreateShortcut($l)
    $s.TargetPath       = $Browser
    $s.Arguments        = "--app=$AppUrl --window-size=1100,860"
    $s.IconLocation     = "$Icon,0"
    $s.Description      = "Corner Stone: read, listen and study the King James Bible"
    $s.WorkingDirectory = Split-Path $Browser
    $s.Save()
    Write-Host "Created $l"
  }

  Write-Host ""
  Write-Host "Corner Stone is installed. Opening it now..." -ForegroundColor Green
  Write-Host "Tip: right-click its icon in the taskbar and choose 'Pin to taskbar'."
  Write-Host "In the app: Settings > Offline > Save everything, so it also works without internet."
  Start-Process -FilePath $Browser -ArgumentList "--app=$AppUrl", "--window-size=1100,860"
}
