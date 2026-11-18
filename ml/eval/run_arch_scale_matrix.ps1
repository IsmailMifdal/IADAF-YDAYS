# Orchestrateur benches architecture multi-user (256/512).
# Prérequis: le serveur OpenAI-compat de la cellule est DÉJÀ up (vLLM / TRT / llama).
# Exemple:
#   $env:OPENAI_BASE_URL="http://127.0.0.1:8000/v1"
#   .\ml\eval\run_arch_scale_matrix.ps1 -Track v5a -Engine vllm -Quant fp8
param(
    [Parameter(Mandatory = $true)]
    [string]$Track,
    [Parameter(Mandatory = $true)]
    [ValidateSet("vllm", "trtllm", "llama.cpp")]
    [string]$Engine,
    [Parameter(Mandatory = $true)]
    [string]$Quant,
    [string]$Levels = "1,2,4,8,16,32,64,128,256,512",
    [string]$Profiles = "short,docs",
    [string]$BaseUrl = "",
    [string]$Model = "auto",
    [int]$MaxTokens = 128,
    [switch]$SkipSummarize
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Repo = Split-Path -Parent $Root
Set-Location $Repo

$Python = if ($env:IADAF_PYTHON) { $env:IADAF_PYTHON } else { "python" }
if (-not $BaseUrl) {
    $BaseUrl = if ($env:OPENAI_BASE_URL) { $env:OPENAI_BASE_URL } else { "http://127.0.0.1:8000/v1" }
}
$env:OPENAI_BASE_URL = $BaseUrl
if (-not $env:OPENAI_API_KEY) { $env:OPENAI_API_KEY = "iadaf-dev-local-key" }

Write-Host "== Arch scale matrix cell ==" -ForegroundColor Cyan
Write-Host "track=$Track engine=$Engine quant=$Quant url=$BaseUrl levels=$Levels"

# Health
try {
    Invoke-RestMethod -Uri "$BaseUrl/models" -Headers @{ Authorization = "Bearer $($env:OPENAI_API_KEY)" } | Out-Null
} catch {
    throw "Serveur injoignable sur $BaseUrl/models — démarre vLLM/TRT/llama avant le bench."
}

foreach ($prof in ($Profiles -split ",")) {
    $prof = $prof.Trim()
    if (-not $prof) { continue }
    Write-Host "--- profile=$prof ---" -ForegroundColor Yellow
    & $Python "$Root\eval\bench_arch_scale.py" `
        --base-url $BaseUrl `
        --model $Model `
        --track $Track `
        --engine $Engine `
        --quant $Quant `
        --profile $prof `
        --levels $Levels `
        --max-tokens $MaxTokens
    if ($LASTEXITCODE -ne 0) { throw "bench_arch_scale failed profile=$prof" }
}

if (-not $SkipSummarize) {
    & $Python "$Root\eval\summarize_arch_scale.py"
}

Write-Host @"

Cellule OK. Prochaine cellule typique:
  1) Couper le serveur actuel
  2) Démarrer l'autre engine/modèle (voir ml/serving/ENGINES-V5.md)
  3) Relancer ce script avec -Track/-Engine/-Quant adaptés

Matrice: ml/artifacts/results/current/arch_scale_matrix.jsonl
Summary: ml/artifacts/results/current/arch_scale_summary.json
Plan:    ml/eval/ARCH-SCALE-PLAN-V5.md
"@ -ForegroundColor Green
