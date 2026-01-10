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
    Write-Host "× Node.jsがインストールされていません。" -ForegroundColor Red
    Write-Host "  https://nodejs.org/ からNode.js 18以上をインストールしてください。" -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
Write-Host "✓ Node.js $nodeVersion が検出されました。" -ForegroundColor Green

# package.jsonの存在確認
if (-not (Test-Path "package.json")) {
    Write-Host "× package.jsonが見つかりません。プロジェクトルートで実行してください。" -ForegroundColor Red
    exit 1
}

# 依存パッケージのインストール
Write-Host ""
Write-Host "[2/4] 依存パッケージをインストール中..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    Write-Host "  初回セットアップ: npm install を実行しています..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "× npm install が失敗しました。" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ 依存パッケージのインストールが完了しました。" -ForegroundColor Green
} else {
    Write-Host "✓ node_modules が存在します。スキップします。" -ForegroundColor Green
}

# 開発サーバー起動
Write-Host ""
Write-Host "[3/4] 開発サーバーを起動中..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ブラウザで http://localhost:3000 を開く" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "サーバーを停止するには Ctrl+C を押してください" -ForegroundColor Gray
Write-Host ""

# npm start を実行（バックグラウンドではなく前景で実行）
npm start
