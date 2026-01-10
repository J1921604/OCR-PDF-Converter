# バックエンド起動スクリプト

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OCR検索可能PDF変換 - Pythonバックエンド起動" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Python 3.10.11 の存在チェック
$pythonCmd = "py -3.10"
Write-Host "`nPython 3.10.11 の存在を確認中..." -ForegroundColor Yellow

try {
    $pythonVersion = & py -3.10 --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Python確認完了: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Python 3.10.11 が見つかりません" -ForegroundColor Red
        Write-Host "  Python 3.10.11 をインストールしてください" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "✗ Python 3.10.11 が見つかりません" -ForegroundColor Red
    Write-Host "  Python 3.10.11 をインストールしてください" -ForegroundColor Yellow
    exit 1
}

# バックエンドディレクトリに移動
Set-Location -Path "$PSScriptRoot\backend"

# 依存パッケージのインストール
Write-Host "`n依存パッケージをインストール中..." -ForegroundColor Yellow
& py -3.10 -m pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ パッケージのインストールに失敗しました" -ForegroundColor Red
    exit 1
}

Write-Host "✓ パッケージインストール完了" -ForegroundColor Green

# サーバー起動
Write-Host "`nFlaskサーバーを起動中..." -ForegroundColor Yellow
Write-Host "URL: http://localhost:5000" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

& py -3.10 app.py
