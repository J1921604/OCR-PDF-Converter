# OCR-PDF Converter - Development Server Startup Script
# Usage: .\start-dev.ps1

$ErrorActionPreference = 'Stop'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " OCR-PDF Converter Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check dependencies
Write-Host "[1/3] Checking dependencies..." -ForegroundColor Yellow

$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "Error: Node.js is not installed." -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
Write-Host "OK: Node.js $nodeVersion detected." -ForegroundColor Green

# Check package.json
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found." -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host ""
Write-Host "[2/3] Installing dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    Write-Host "Running npm install..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: npm install failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: Dependencies installed." -ForegroundColor Green
} else {
    Write-Host "OK: node_modules exists. Skipping." -ForegroundColor Green
}

# Start development server
Write-Host ""
Write-Host "[3/3] Starting development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Open http://localhost:3000 in browser" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Open browser after the dev server is ready (without using webpack --open)
$targetUrl = 'http://localhost:3000/'

# Start a background job that waits for port 3000 to open, then opens the browser.
# This keeps the main terminal attached to `npm start` logs.
try {
    Start-Job -ArgumentList $targetUrl -ScriptBlock {
        param($url)

        $maxSeconds = 60
        for ($i = 0; $i -lt $maxSeconds; $i++) {
            try {
                if (Test-NetConnection -ComputerName 'localhost' -Port 3000 -InformationLevel Quiet) {
                    Start-Process $url
                    return
                }
            } catch {
                # ignore and retry
            }
            Start-Sleep -Seconds 1
        }

        # Fallback: open anyway after timeout
        Start-Process $url
    } | Out-Null
} catch {
    # If Start-Job is unavailable/restricted, fall back to immediate open.
    Start-Process $targetUrl
}

# Run npm start
npm start
