# Stack locale max qualité/perf — GGUF v3.1 + Postgres embarqué + ai-service
param(
    [string]$Gguf = "",
    [int]$LlamaPort = 8080,
    [int]$AiPort = 8086
)

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$Ml = Join-Path $Root "ml"
$Ai = Join-Path $Root "ai-service"
$Py = Join-Path $Ml ".venv\Scripts\python.exe"
$Tools = Join-Path $Ml ".tools"

if (-not (Test-Path $Py)) { throw "venv manquant: $Py — créez ml/.venv et installez requirements" }
if (-not $Gguf) {
    $Gguf = Join-Path $Ml "artifacts\gguf\iadaf-qwen3-8b-v3_1-Q4_K_M.gguf"
}
if (-not (Test-Path $Gguf)) { throw "GGUF introuvable: $Gguf" }

New-Item -ItemType Directory -Force -Path $Tools | Out-Null
$env:KMP_DUPLICATE_LIB_OK = "TRUE"

# 1) Embedded Postgres (pgserver) if URI file missing / dead
$uriFile = Join-Path $Tools "pg_uri.txt"
$needPg = $true
if (Test-Path $uriFile) {
    $uri = (Get-Content $uriFile -Raw).Trim()
    if ($uri -match ':(\d+)/') {
        $port = [int]$Matches[1]
        try {
            $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
            if ($tcp.TcpTestSucceeded) { $needPg = $false; Write-Host "Postgres OK :$port" }
        } catch {}
    }
}
if ($needPg) {
    Write-Host "Démarrage Postgres embarqué (pgserver)…"
    $keepPg = Join-Path $Ml "serving\keep_pgserver.py"
    if (-not (Test-Path $keepPg)) { throw "Script manquant: $keepPg" }
    Start-Process -FilePath $Py -ArgumentList $keepPg `
        -WorkingDirectory $Ml -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $Tools "pgserver.out") `
        -RedirectStandardError (Join-Path $Tools "pgserver.err")
    Start-Sleep 8
}

# Sync DATABASE_URL into ai-service/.env if uri file present
if (Test-Path $uriFile) {
    $dbUrl = (Get-Content $uriFile -Raw).Trim()
    $envPath = Join-Path $Ai ".env"
    if (Test-Path $envPath) {
        $txt = Get-Content $envPath -Raw
        if ($txt -match 'DATABASE_URL=') {
            $txt = [regex]::Replace($txt, 'DATABASE_URL=.*', "DATABASE_URL=$dbUrl")
        } else {
            $txt += "`nDATABASE_URL=$dbUrl`n"
        }
        # force v3.1 model
        $txt = [regex]::Replace($txt, 'OPENAI_MODEL=.*', 'OPENAI_MODEL=iadaf-qwen3-8b-v3_1-Q4_K_M.gguf')
        Set-Content -Path $envPath -Value $txt -Encoding UTF8
    }
}

# 2) llama-server
$llamaUp = $false
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$LlamaPort/v1/models" `
        -Headers @{ Authorization = "Bearer iadaf-dev-local-key" } -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $llamaUp = $true }
} catch {}
if (-not $llamaUp) {
    Write-Host "Démarrage llama-server…"
    $exe = "C:\llama.cpp\bin-cuda\llama-server.exe"
    if (-not (Test-Path $exe)) { throw "llama-server introuvable: $exe" }
    # Measured 2026-11-12: draft Qwen3-0.6B → ~14 tok/s (vocab mismatch + VRAM).
    # Keep -b/-ub/-cb flash-attn; no draft by default. Optional: -DraftPath on llama-iadaf.ps1
    $llamaArgs = @(
        "-m", $Gguf, "--port", "$LlamaPort", "--host", "127.0.0.1",
        "-c", "32768", "-ngl", "99", "-np", "4", "-b", "2048", "-ub", "512",
        "-fa", "on", "-cb", "--api-key", "iadaf-dev-local-key"
    )
    Start-Process -FilePath $exe -ArgumentList $llamaArgs `
        -WorkingDirectory (Split-Path $exe) -WindowStyle Hidden
    Start-Sleep 18
}

# 3) ai-service
$aiUp = $false
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$AiPort/ai/health" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $aiUp = $true }
} catch {}
if (-not $aiUp) {
    Write-Host "Démarrage ai-service…"
    Start-Process -FilePath $Py -ArgumentList @(
        "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$AiPort"
    ) -WorkingDirectory $Ai -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $Tools "ai-service.out") `
        -RedirectStandardError (Join-Path $Tools "ai-service.err")
    Start-Sleep 20
}

Write-Host ""
Write-Host "Stack locale prête :" -ForegroundColor Green
Write-Host "  GGUF        $Gguf"
Write-Host "  llama.cpp   http://127.0.0.1:$LlamaPort/v1"
Write-Host "  ai-service  http://127.0.0.1:$AiPort  (health: /ai/health)"
Write-Host "  Eval        voir ml/serving/LOCAL-V3.md + ml/serving/RELEASE-V3.1.md"
