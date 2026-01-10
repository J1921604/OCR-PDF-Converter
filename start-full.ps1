# OCR Searchable PDF Converter - Launch Script
# Start Python Backend + React Frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OCR PDF Converter - Starting Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check Python 3.10.11
Write-Host "`nChecking Python 3.10.11..." -ForegroundColor Yellow

try {
    $pythonVersion = & py -3.10 --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "[NG] Python 3.10.11 not found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[NG] Python 3.10.11 not found" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "[NG] Node.js not found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[NG] Node.js not found" -ForegroundColor Red
    exit 1
}

# Setup Python venv
Write-Host "`nSetting up Python virtual environment..." -ForegroundColor Yellow
$venvPath = Join-Path $PSScriptRoot ".venv"

if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    & py -3.10 -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[NG] Failed to create venv" -ForegroundColor Red
        exit 1
    }
}

# Activate venv
$activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
    Write-Host "[OK] Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "[NG] Activate script not found" -ForegroundColor Red
    exit 1
}

# Install npm packages
Write-Host "`nInstalling npm packages..." -ForegroundColor Yellow
& npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "[NG] npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] npm packages installed" -ForegroundColor Green

# Install Python packages
Write-Host "`nInstalling Python packages..." -ForegroundColor Yellow
$requirementsPath = Join-Path $PSScriptRoot "requirements.txt"
& python -m pip install --upgrade pip --quiet
& python -m pip install -r $requirementsPath --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "[NG] Python packages install failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Python packages installed" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Starting servers..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[Backend] http://localhost:5000" -ForegroundColor Green
Write-Host "[Frontend] http://localhost:8080" -ForegroundColor Green
Write-Host "`nPress Ctrl+C to stop servers`n" -ForegroundColor Yellow

# Start as background jobs
$backendJob = Start-Job -ScriptBlock {
    param($scriptRoot, $venvPath)
    Set-Location $scriptRoot
    & "$venvPath\Scripts\python.exe" "backend\app.py"
} -ArgumentList $PSScriptRoot, $venvPath

$frontendJob = Start-Job -ScriptBlock {
    param($scriptRoot)
    Set-Location $scriptRoot
    & npm start
} -ArgumentList $PSScriptRoot

# Monitor output (non-blocking)
Write-Host "`nServers are starting... (Press Ctrl+C to stop)`n" -ForegroundColor Yellow

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$maxWaitSeconds = 60

while ($stopwatch.Elapsed.TotalSeconds -lt $maxWaitSeconds) {
    # Get any output from jobs
    $backendOutput = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
    if ($backendOutput) {
        $backendOutput | ForEach-Object {
            Write-Host "[Backend] $_" -ForegroundColor Cyan
        }
    }
    
    $frontendOutput = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
    if ($frontendOutput) {
        $frontendOutput | ForEach-Object {
            Write-Host "[Frontend] $_" -ForegroundColor Yellow
        }
    }
    
    # Check if both servers are ready
    $backendReady = $false
    $frontendReady = $false
    
    try {
        $tcpConnections = Get-NetTCPConnection -LocalPort 5000,8080 -ErrorAction SilentlyContinue
        foreach ($conn in $tcpConnections) {
            if ($conn.LocalPort -eq 5000 -and $conn.State -eq 'Listen') { $backendReady = $true }
            if ($conn.LocalPort -eq 8080 -and $conn.State -eq 'Listen') { $frontendReady = $true }
        }
    } catch {
        # Ignore errors
    }
    
    if ($backendReady -and $frontendReady) {
        Write-Host "`n[SUCCESS] Both servers are ready!" -ForegroundColor Green
        Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Cyan
        Write-Host "  Frontend: http://localhost:8080" -ForegroundColor Yellow
        Write-Host "`nPress Ctrl+C to stop servers`n" -ForegroundColor White
        break
    }
    
    Start-Sleep -Milliseconds 500
}

if (-not ($backendReady -and $frontendReady)) {
    Write-Host "`n[WARNING] Servers may not be fully ready yet" -ForegroundColor Yellow
    if (-not $backendReady) { Write-Host "  Backend (port 5000) not responding" -ForegroundColor Red }
    if (-not $frontendReady) { Write-Host "  Frontend (port 8080) not responding" -ForegroundColor Red }
    Write-Host "  Continuing to monitor...`n" -ForegroundColor Yellow
}

# Continue monitoring
try {
    while ($true) {
        $backendOutput = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        if ($backendOutput) {
            $backendOutput | ForEach-Object {
                Write-Host "[Backend] $_" -ForegroundColor Cyan
            }
        }
        
        $frontendOutput = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        if ($frontendOutput) {
            $frontendOutput | ForEach-Object {
                Write-Host "[Frontend] $_" -ForegroundColor Yellow
            }
        }
        
        # Check if jobs are still running
        $backendState = (Get-Job -Id $backendJob.Id -ErrorAction SilentlyContinue).State
        $frontendState = (Get-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue).State
        
        if ($backendState -ne 'Running' -or $frontendState -ne 'Running') {
            Write-Host "`n[ERROR] Job stopped unexpectedly" -ForegroundColor Red
            if ($backendState -ne 'Running') {
                Write-Host "Backend job state: $backendState" -ForegroundColor Red
            }
            if ($frontendState -ne 'Running') {
                Write-Host "Frontend job state: $frontendState" -ForegroundColor Red
            }
            break
        }
        
        Start-Sleep -Milliseconds 100
    }
}
finally {
    Write-Host "`n`nStopping servers..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "[OK] Stopped" -ForegroundColor Green
}
