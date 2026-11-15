<#
  Send the Voxly recordings made on this PC to GitHub, so they reach the Scripture app.
  Safe to run while recording is still going on, and as often as you like.

  Run in PowerShell (from anywhere):
    powershell -ExecutionPolicy Bypass -File C:\G_Labs\Corner-Stone-Bible-\tools\send-recordings.ps1
#>
& {
  Set-Location (Split-Path $PSScriptRoot)   # the repository folder
  # The list of recorded chapters (audio/index.json) is rebuilt on GitHub, so this PC's copy is set aside.
  git checkout -- audio/index.json 2>$null
  git add audio/KJV
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) { git commit -q -m "Voxly audio from PC" }

  foreach ($try in 1..3) {
    git checkout -- audio/index.json 2>$null    # again: the recording may have changed it a moment ago
    git pull --rebase -q
    if ($LASTEXITCODE -ne 0) { git rebase --abort 2>$null; Start-Sleep -Seconds 5; continue }
    git push -q
    if ($LASTEXITCODE -eq 0) { Write-Host "Sent. The app will have these chapters within about 10 minutes." -ForegroundColor Green; return }
    Start-Sleep -Seconds 5
  }
  Write-Host "Could not send just now. Wait a minute and run this again." -ForegroundColor Yellow
}
