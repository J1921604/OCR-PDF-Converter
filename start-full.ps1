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
        Write-Host "OK Python確認完了: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "NG Python 3.10.11 が見つかりません" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "NG Python 3.10.11 が見つかりません" -ForegroundColor Red
    exit 1
}

# Node.js の存在チェック
Write-Host "Node.js の存在を確認中..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK Node.js確認完了: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "NG Node.js が見つかりません" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "NG Node.js が見つかりません" -ForegroundColor Red
    exit 1
}

# 仮想環境のセットアップ
Write-Host "`nPython仮想環境をセットアップ中..." -ForegroundColor Yellow
$venvPath = Join-Path $PSScriptRoot ".venv"

if (-not (Test-Path $venvPath)) {
    Write-Host "仮想環境を作成中..." -ForegroundColor Yellow
    & py -3.10 -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "NG 仮想環境の作成に失敗しました" -ForegroundColor Red
        exit 1
    }
}

# 仮想環境のアクティベート
$activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
    Write-Host "OK 仮想環境をアクティベート" -ForegroundColor Green
} else {
    Write-Host "NG 仮想環境のアクティベートスクリプトが見つかりません" -ForegroundColor Red
    exit 1
}

# npm パッケージインストール
Write-Host "`nnpmパッケージをインストール中..." -ForegroundColor Yellow
& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "NG npmパッケージのインストールに失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "OK npmパッケージインストール完了" -ForegroundColor Green

# Python依存パッケージインストール（仮想環境内）
Write-Host "`nPython依存パッケージをインストール中..." -ForegroundColor Yellow
$requirementsPath = Join-Path $PSScriptRoot "backend\requirements.txt"
& python -m pip install --upgrade pip
& python -m pip install -r $requirementsPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "NG Python パッケージのインストールに失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "OK Pythonパッケージインストール完了" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "サーバーを起動しています..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# バックエンドとフロントエンドを並列起動
Write-Host "`n[Backend] http://localhost:5000" -ForegroundColor Green
Write-Host "[Frontend] http://localhost:8080" -ForegroundColor Green
Write-Host "`n両方のサーバーを停止するには Ctrl+C を押してください`n" -ForegroundColor Yellow

# ジョブとして起動
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

# 出力を監視
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
        
        Start-Sleep -Milliseconds 100
    }
}
finally {
    Write-Host "`n`nサーバーを停止中..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "完了" -ForegroundColor Green
}
