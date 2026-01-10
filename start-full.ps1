# バックエンド統合起動スクリプト
# Pythonバックエンド + Reactフロントエンドを同時起動

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OCR検索可能PDF変換 - 完全統合起動" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Python 3.10.11 の存在チェック
Write-Host "`nPython 3.10.11 の存在を確認中..." -ForegroundColor Yellow

try {
    $pythonVersion = & py -3.10 --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Python確認完了: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Python 3.10.11 が見つかりません" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Python 3.10.11 が見つかりません" -ForegroundColor Red
    exit 1
}

# Node.js の存在チェック
Write-Host "Node.js の存在を確認中..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Node.js確認完了: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Node.js が見つかりません" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Node.js が見つかりません" -ForegroundColor Red
    exit 1
}

# npm パッケージインストール
Write-Host "`nnpmパッケージをインストール中..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ npmパッケージのインストールに失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "✓ npmパッケージインストール完了" -ForegroundColor Green

# Python依存パッケージインストール
Write-Host "`nPython依存パッケージをインストール中..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\backend"
& py -3.10 -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Python パッケージのインストールに失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Pythonパッケージインストール完了" -ForegroundColor Green

Set-Location -Path $PSScriptRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "サーバーを起動しています..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# バックエンドとフロントエンドを並列起動
Write-Host "`n[バックエンド] http://localhost:5000" -ForegroundColor Green
Write-Host "[フロントエンド] http://localhost:8080" -ForegroundColor Green
Write-Host "`n両方のサーバーを停止するには Ctrl+C を押してください`n" -ForegroundColor Yellow

# ジョブとして起動
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot
    Set-Location backend
    & py -3.10 app.py
}

$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot
    npm start
}

# 出力を監視
try {
    while ($true) {
        Receive-Job -Job $backendJob -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "[Backend] $_" -ForegroundColor Cyan
        }
        Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "[Frontend] $_" -ForegroundColor Yellow
        }
        Start-Sleep -Milliseconds 100
    }
} finally {
    Write-Host "`n`nサーバーを停止中..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob
    Write-Host "完了" -ForegroundColor Green
}
