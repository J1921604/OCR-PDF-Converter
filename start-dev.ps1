#!/usr/bin/env pwsh
# OCR-PDF Converter - ワンコマンド開発環境起動スクリプト
# 使用方法: .\start-dev.ps1

$ErrorActionPreference = 'Stop'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " OCR-PDF Converter 開発環境起動中..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 依存関係チェック
Write-Host "[1/4] 依存関係を確認中..." -ForegroundColor Yellow

$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "✗ Node.jsがインストールされていません。" -ForegroundColor Red
    Write-Host "  https://nodejs.org/ からNode.js 18以上をインストールしてください。" -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
Write-Host "✓ Node.js $nodeVersion が検出されました。" -ForegroundColor Green

# package.jsonの存在確認
if (-not (Test-Path "package.json")) {
    Write-Host "✗ package.jsonが見つかりません。プロジェクトルートで実行してください。" -ForegroundColor Red
    exit 1
}

# 依存パッケージのインストール
Write-Host ""
Write-Host "[2/4] 依存パッケージをインストール中..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    Write-Host "  初回セットアップ: npm install を実行しています..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ npm install が失敗しました。" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ 依存パッケージのインストールが完了しました。" -ForegroundColor Green
} else {
    Write-Host "✓ node_modules が存在します。スキップします。" -ForegroundColor Green
}

# 開発サーバー起動
Write-Host ""
Write-Host "[3/4] 開発サーバーを起動中..." -ForegroundColor Yellow

# バックグラウンドでnpm startを実行
$job = Start-Job -ScriptBlock {
    param($WorkingDir)
    Set-Location $WorkingDir
    npm start
} -ArgumentList (Get-Location).Path

Write-Host "✓ 開発サーバーがバックグラウンドで起動しました。" -ForegroundColor Green

# サーバー起動待機（最大30秒）
Write-Host ""
Write-Host "[4/4] サーバーの起動を待機中..." -ForegroundColor Yellow

$maxWaitTime = 30
$waitInterval = 1
$elapsedTime = 0
$serverReady = $false

while ($elapsedTime -lt $maxWaitTime) {
    Start-Sleep -Seconds $waitInterval
    $elapsedTime += $waitInterval
    
    # localhostへの接続テスト
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            break
        }
    } catch {
        # まだ起動していない場合はエラーを無視
    }
    
    Write-Host "  待機中... ($elapsedTime 秒)" -ForegroundColor Gray
}

if ($serverReady) {
    Write-Host "✓ サーバーが起動しました！" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " 開発環境が準備完了しました！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "アプリケーションURL: " -NoNewline
    Write-Host "http://localhost:3000" -ForegroundColor Blue
    Write-Host ""
    Write-Host "ブラウザを開いています..." -ForegroundColor Yellow
    
    # デフォルトブラウザでlocalhostを開く
    Start-Process "http://localhost:3000"
    
    Start-Sleep -Seconds 2
    
    Write-Host ""
    Write-Host "✓ ブラウザが開きました。" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " PowerShellウィンドウを閉じます" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "注意: 開発サーバーはバックグラウンドで引き続き実行されます。" -ForegroundColor Gray
    Write-Host "停止するには、タスクマネージャーでNode.jsプロセスを終了してください。" -ForegroundColor Gray
    Write-Host ""
    
    Start-Sleep -Seconds 3
    
    # PowerShellウィンドウを閉じる
    Stop-Process -Id $PID
    
} else {
    Write-Host "✗ サーバーの起動がタイムアウトしました（30秒）。" -ForegroundColor Red
    Write-Host "  手動でサーバーを確認してください: npm start" -ForegroundColor Red
    
    # ジョブを停止
    Stop-Job -Job $job
    Remove-Job -Job $job
    
    exit 1
}
