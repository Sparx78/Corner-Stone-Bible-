<#
  Corner Stone: update this PC's copy and send its Voxly recordings to the app, in one go.
  Safe to run while recording is still going on, and as often as you like.

  Sync now (from anywhere):
    powershell -ExecutionPolicy Bypass -File C:\G_Labs\Corner-Stone-Bible-\tools\sync-pc.ps1
  Sync by itself every hour (no admin needed):
    powershell -ExecutionPolicy Bypass -File C:\G_Labs\Corner-Stone-Bible-\tools\sync-pc.ps1 -Auto
  Stop syncing by itself:
    powershell -ExecutionPolicy Bypass -File C:\G_Labs\Corner-Stone-Bible-\tools\sync-pc.ps1 -StopAuto
#>
param([switch]$Auto, [switch]$StopAuto)
& {
  $Repo = Split-Path $PSScriptRoot
  $Task = "Corner Stone Sync"
  $Log  = Join-Path $Repo "sync-log.txt"

  if ($StopAuto) {
    schtasks /Delete /TN $Task /F 2>$null | Out-Null
    Write-Host "Hourly sync is off. Run this script without -StopAuto to sync by hand." -ForegroundColor Green
    return
  }
  if ($Auto) {
    $cmd = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    schtasks /Create /SC HOURLY /TN $Task /TR $cmd /F | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "Done: this PC now syncs with the app every hour, by itself." -ForegroundColor Green }
    else { Write-Host "Windows did not accept the hourly task. You can still sync by hand." -ForegroundColor Yellow; return }
  }

  Set-Location $Repo
  # The Python that can rebuild the app's list of recorded chapters (audio/index.json)
  $Py = @("C:\G_Labs\Voxly\engines\kokoro\venv\Scripts\python.exe", "C:\G_Labs\Voxly\venv\Scripts\python.exe") |
        Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $Py) { $Py = (Get-Command python -ErrorAction SilentlyContinue).Source }

  function Say($text, $colour = "Gray") { Write-Host $text -ForegroundColor $colour; Add-Content $Log ("{0:yyyy-MM-dd HH:mm}  {1}" -f (Get-Date), $text) }

  # 1. Keep the new recordings (the list file is rebuilt below, so this PC's copy is set aside)
  git checkout -- audio/index.json 2>$null
  git add audio/KJV 2>$null
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) { git commit -q -m "Voxly audio from PC" }

  foreach ($try in 1..3) {
    # 2. Get the newest app and everyone else's recordings
    git checkout -- audio/index.json 2>$null
    git pull --rebase --autostash -q 2>$null
    if ($LASTEXITCODE -ne 0) { git rebase --abort 2>$null; Start-Sleep -Seconds 10; continue }

    # 3. Rebuild the list of recorded chapters so the app knows about all of them
    $indexed = $false
    if ($Py) {
      & $Py "tools\voxly_bible_audio.py" --index | Out-Null
      git add audio/index.json
      git diff --cached --quiet
      if ($LASTEXITCODE -ne 0) { git commit -q -m "Audio index" ; $indexed = $true }
    }

    # 4. Send
    git push -q 2>$null
    if ($LASTEXITCODE -eq 0) {
      $n = (git ls-files "audio/KJV/*.m4a" | Measure-Object).Count
      Say "Synced. The app has $n recorded chapters; new ones play within about 10 minutes." Green
      return
    }
    if ($indexed) { git reset -q HEAD~1 }           # someone sent something meanwhile: take theirs, rebuild, try again
    Start-Sleep -Seconds 10
  }
  Say "Could not sync just now (no internet, or GitHub busy). It will try again; or run this again in a minute." Yellow
}
