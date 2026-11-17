# IADAF v3.1 — QLoRA fails-first on instruct_train_v3_1.jsonl
param(
    [string]$Config = "",
    [switch]$SkipExport,
    [switch]$SkipBuild,
    [int]$MaxSteps = 0,
    [double]$MinHitAt3 = 0.80,
    [switch]$AllowLowHit
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Python = if (Test-Path "$Root\.venv\Scripts\python.exe") {
    "$Root\.venv\Scripts\python.exe"
} else {
    "python"
}

$env:KMP_DUPLICATE_LIB_OK = "TRUE"
$env:OMP_NUM_THREADS = "1"

if (-not $Config) { $Config = "$Root\configs\model_v3_1.yaml" }

Write-Host "== IADAF ML train chat v3.1 (fails-first) ==" -ForegroundColor Cyan
Write-Host "Config: $Config"
Write-Host "Python: $Python"

$data = "$Root\datasets\processed\instruct_train_v3_1.jsonl"
if (-not $SkipBuild) {
    Write-Host "Building grounded SFT v3.1…"
    & $Python "$Root\datasets\build_grounded_sft_v3.py" `
        --out $data `
        --quality-repeats 30 `
        --triage-repeats 20 `
        --gold-repeats 40
    if ($LASTEXITCODE -ne 0) { throw "build_grounded_sft_v3.py failed" }
}

if (-not (Test-Path $data)) {
    throw "Dataset manquant: $data"
}

Write-Host "Go/no-go Hit@3 RAG (seuil $MinHitAt3)…" -ForegroundColor Yellow
& $Python "$Root\eval\run_rag_hit.py" --threshold $MinHitAt3
if ($LASTEXITCODE -ne 0 -and -not $AllowLowHit) {
    throw "Hit@3 under $MinHitAt3 — improve RAG before train (or pass -AllowLowHit)."
}

Write-Host "Arrête llama-server / TRT-LLM avant le train (libère la VRAM)." -ForegroundColor Yellow

$outLora = "$Root\artifacts\lora_v3_1"
$outMerged = "$Root\artifacts\merged_v3_1"

$trainArgs = @(
    "$Root\training\train_qlora.py",
    "--config", $Config,
    "--data", $data,
    "--out", $outLora
)
if ($MaxSteps -gt 0) {
    $env:IADAF_MAX_STEPS = "$MaxSteps"
}

& $Python @trainArgs
if ($LASTEXITCODE -ne 0) {
    throw "train_qlora.py a échoué (code $LASTEXITCODE)."
}

if ($SkipExport) {
    Write-Host "Skip export (--SkipExport)." -ForegroundColor Yellow
    exit 0
}

& $Python "$Root\training\export_gguf.py" `
    --config $Config `
    --adapter $outLora `
    --merged $outMerged `
    --gguf-dir "$Root\artifacts\gguf"
if ($LASTEXITCODE -ne 0) {
    throw "export_gguf.py a échoué (code $LASTEXITCODE)"
}

Write-Host "Done. Serveur: .\ml\serving\llama-iadaf.ps1 -ModelPath <gguf v3_1>" -ForegroundColor Green
