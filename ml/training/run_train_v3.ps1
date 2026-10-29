# IADAF v3 — QLoRA chat grounded sur instruct_train_v3.jsonl
param(
    [string]$Config = "",
    [switch]$SkipExport,
    [switch]$SkipBuild,
    [int]$MaxSteps = 0
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$env:KMP_DUPLICATE_LIB_OK = "TRUE"
$env:OMP_NUM_THREADS = "1"

if (-not $Config) { $Config = "$Root\configs\model_v3.yaml" }
if (-not (Test-Path $Config)) { $Config = "$Root\configs\model.yaml" }

Write-Host "== IADAF ML train chat v3 (grounded SFT) ==" -ForegroundColor Cyan
Write-Host "Config: $Config"

$data = "$Root\datasets\processed\instruct_train_v3.jsonl"
if (-not $SkipBuild) {
    Write-Host "Building grounded SFT v3…"
    python "$Root\datasets\build_grounded_sft_v3.py"
    if ($LASTEXITCODE -ne 0) { throw "build_grounded_sft_v3.py failed" }
}

if (-not (Test-Path $data)) {
    throw "Dataset manquant: $data"
}

Write-Host "Go/no-go Hit@3 RAG (seuil 0.55 informatif)…" -ForegroundColor Yellow
python "$Root\eval\run_rag_hit.py" --threshold 0.55
# Ne bloque pas le train si Hit@3 faible : on log seulement.

Write-Host "Arrête llama-server / Strata / VL avant le train (libère la VRAM)." -ForegroundColor Yellow

$outLora = "$Root\artifacts\lora_v3"
$outMerged = "$Root\artifacts\merged_v3"

$trainArgs = @(
    "$Root\training\train_qlora.py",
    "--config", $Config,
    "--data", $data,
    "--out", $outLora
)
if ($MaxSteps -gt 0) {
    $env:IADAF_MAX_STEPS = "$MaxSteps"
}

python @trainArgs
if ($LASTEXITCODE -ne 0) {
    throw "train_qlora.py a échoué (code $LASTEXITCODE)."
}

if ($SkipExport) {
    Write-Host "Skip export (--SkipExport)." -ForegroundColor Yellow
    exit 0
}

python "$Root\training\export_gguf.py" `
    --config $Config `
    --adapter $outLora `
    --merged $outMerged `
    --gguf-dir "$Root\artifacts\gguf"
if ($LASTEXITCODE -ne 0) {
    throw "export_gguf.py a échoué (code $LASTEXITCODE)"
}

Write-Host "Done. Serveur: .\ml\serving\llama-iadaf.ps1 -ModelPath <gguf v3>" -ForegroundColor Green
