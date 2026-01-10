# API smoke test: start backend, call /api/health and /api/ocr/process with a sample PDF.
# PowerShell 5.1 compatible.

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$py = Join-Path $root '.venv\Scripts\python.exe'
$app = Join-Path $root 'backend\app.py'

$logOut = Join-Path $env:TEMP 'ocr-backend-smoke.out.log'
$logErr = Join-Path $env:TEMP 'ocr-backend-smoke.err.log'
Remove-Item $logOut, $logErr -ErrorAction SilentlyContinue

# Kill anything currently listening on 5000 (best effort)
try {
  Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue |
    ForEach-Object {
      try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
} catch {}

$p = Start-Process -FilePath $py -ArgumentList @($app) -WorkingDirectory $root -PassThru -NoNewWindow -RedirectStandardOutput $logOut -RedirectStandardError $logErr
Write-Output "Started backend PID=$($p.Id)"

try {
  $ok = $false
  for ($i = 0; $i -lt 80; $i++) {
    try {
      $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 250
  }

  if (-not $ok) {
    Write-Output 'Health check failed'
    if (Test-Path $logOut) { Write-Output '--- stdout (tail) ---'; Get-Content $logOut -Tail 60 }
    if (Test-Path $logErr) { Write-Output '--- stderr (tail) ---'; Get-Content $logErr -Tail 120 }
    exit 1
  }

  Write-Output 'Health check OK'

  $inputPdf = Join-Path $root '.specify\memory\constitution.pdf'
  if (-not (Test-Path $inputPdf)) {
    throw "Input PDF not found: $inputPdf"
  }

  Write-Output 'Posting /api/ocr/process ... (may take a bit)'
  $resp = curl.exe -s -X POST -F "file=@$inputPdf" http://localhost:5000/api/ocr/process
  Write-Output ("Response: $resp")

  if (Test-Path $logErr) { Write-Output '--- backend stderr (tail) ---'; Get-Content $logErr -Tail 120 }
  if (Test-Path $logOut) { Write-Output '--- backend stdout (tail) ---'; Get-Content $logOut -Tail 60 }

} finally {
  try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}
  Write-Output "Stopped backend PID=$($p.Id)"
}
