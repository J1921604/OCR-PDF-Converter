<#
start-full.ps1

要件:
- Python 3.10.11 を標準実行環境 (py -3.10)
- 仮想環境 .venv を作成/使用し requirements.txt をインストール
- フロント(http://localhost:8080/) を自動起動
- 白画面(未描画)の原因になりやすい Start-Job 監視ループは使わず、安定して起動・停止できる構成
#>

[CmdletBinding()]
param(
    # 0の場合は従来通りENTER待ち。0より大きい場合は指定秒数後に自動停止する（CI/自動検証用）。
    [int]$AutoExitSeconds = 0,
    # CIなどでブラウザ自動起動を抑止したい場合に使用。
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

# Windows PowerShell での日本語ログ文字化けを抑制
try { chcp 65001 | Out-Null } catch {}
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new() } catch {}
$env:PYTHONUTF8 = '1'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OCR PDF Converter - Starting Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

function Fail($message) {
    Write-Host "[NG] $message" -ForegroundColor Red
    exit 1
}

function Ok($message) {
    Write-Host "[OK] $message" -ForegroundColor Green
}

Write-Host "`nChecking Python 3.10 (py -3.10)..." -ForegroundColor Yellow
try {
    $pythonVersion = & py -3.10 --version 2>&1
    if ($LASTEXITCODE -ne 0) { Fail "Python 3.10.11 not found (py -3.10 failed)" }
    Ok $pythonVersion
} catch {
    Fail "Python 3.10.11 not found (py launcher missing)"
}

Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>&1
    if ($LASTEXITCODE -ne 0) { Fail "Node.js not found" }
    Ok $nodeVersion
} catch {
    Fail "Node.js not found"
}

$venvPath = Join-Path $PSScriptRoot '.venv'
$venvPython = Join-Path $venvPath 'Scripts\python.exe'

Write-Host "`nSetting up Python virtual environment (.venv)..." -ForegroundColor Yellow
if (-not (Test-Path $venvPython)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    & py -3.10 -m venv $venvPath
    if ($LASTEXITCODE -ne 0) { Fail "Failed to create .venv" }
}

try {
    $venvVersion = & $venvPython --version 2>&1
    Ok ".venv python: $venvVersion"
} catch {
    Fail "Failed to run .venv python"
}

Write-Host "`nInstalling Python packages (requirements.txt) into .venv..." -ForegroundColor Yellow
$requirementsPath = Join-Path $PSScriptRoot 'requirements.txt'
if (-not (Test-Path $requirementsPath)) { Fail "requirements.txt not found" }

& $venvPython -m pip install --upgrade pip --quiet
& $venvPython -m pip install -r $requirementsPath --quiet
if ($LASTEXITCODE -ne 0) { Fail "pip install -r requirements.txt failed" }
Ok "Python packages installed"

Write-Host "`nInstalling npm packages..." -ForegroundColor Yellow
& npm install --silent
if ($LASTEXITCODE -ne 0) { Fail "npm install failed" }
Ok "npm packages installed"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Starting servers..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$backendUrl = 'http://localhost:5000'
$frontendUrl = 'http://localhost:8080/'

Write-Host "`n[Backend]  $backendUrl" -ForegroundColor Green
Write-Host "[Frontend] $frontendUrl" -ForegroundColor Green

# 起動: 直接プロセスを起動（Start-Jobは使わない）
$backendScript = Join-Path $PSScriptRoot 'backend\app.py'
if (-not (Test-Path $backendScript)) { Fail "backend/app.py not found" }

Write-Host "`nLaunching backend..." -ForegroundColor Yellow
$backendProc = Start-Process -FilePath $venvPython -ArgumentList @($backendScript) -WorkingDirectory $PSScriptRoot -NoNewWindow -PassThru
Ok "Backend PID: $($backendProc.Id)"

Write-Host "Launching frontend (webpack dev server)..." -ForegroundColor Yellow
$npmCmd = Join-Path $PSScriptRoot 'node_modules\.bin\npm.cmd'
if (-not (Test-Path $npmCmd)) {
    # fallback: global npm
    $npmCmd = 'npm.cmd'
}

$frontendProc = Start-Process -FilePath $npmCmd -ArgumentList @('start') -WorkingDirectory $PSScriptRoot -NoNewWindow -PassThru
Ok "Frontend PID (cmd): $($frontendProc.Id)"

function Test-PortListen($port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        return [bool]$conn
    } catch {
        return $false
    }
}

Write-Host "`nWaiting for ports 5000/8080 to be ready..." -ForegroundColor Yellow
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    if ((Test-PortListen 5000) -and (Test-PortListen 8080)) {
        Ok "Both servers are listening"
        break
    }
    Start-Sleep -Milliseconds 500
}

if (-not ((Test-PortListen 5000) -and (Test-PortListen 8080))) {
    Write-Host "[WARNING] Ports are not ready yet. Opening frontend anyway..." -ForegroundColor Yellow
}

Write-Host "`nOpening browser: $frontendUrl" -ForegroundColor Cyan
if (-not $NoBrowser) {
    try {
        Start-Process $frontendUrl | Out-Null
    } catch {
        Write-Host "[WARNING] Failed to open browser automatically" -ForegroundColor Yellow
    }
}

if ($AutoExitSeconds -gt 0) {
    Write-Host "`nAuto-exit in $AutoExitSeconds seconds (CI mode)..." -ForegroundColor Yellow
    Start-Sleep -Seconds $AutoExitSeconds
} else {
    Write-Host "`nPress ENTER to stop servers..." -ForegroundColor Yellow
    [void][System.Console]::ReadLine()
}

Write-Host "`nStopping servers..." -ForegroundColor Yellow

try {
    # port based kill (more reliable than cmd PID)
    foreach ($p in @(5000, 8080)) {
        $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
} catch {}

try { Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue } catch {}
try { Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue } catch {}

Ok "Stopped"
