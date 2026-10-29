# IADAF v2 — QLoRA chat Qwen3-8B (RTX 5080 16 GB)
param(
    [string]$Config = "",
    [switch]$SkipExport,
    [switch]$V1,
    [switch]$V3
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$env:KMP_DUPLICATE_LIB_OK = "TRUE"
$env:OMP_NUM_THREADS = "1"

if ($V3) {
    & "$PSScriptRoot\run_train_v3.ps1" -Config $Config -SkipExport:$SkipExport
    exit $LASTEXITCODE
}

if (-not $Config) {
    if ($V1) { $Config = "$Root\configs\model_v1.yaml" }
    else { $Config = "$Root\configs\model.yaml" }
}

Write-Host "== IADAF ML train chat (v2 Qwen3-8B) ==" -ForegroundColor Cyan
Write-Host "Config: $Config"
Write-Host "KMP_DUPLICATE_LIB_OK=$env:KMP_DUPLICATE_LIB_OK"

if (-not (Test-Path "$Root\datasets\processed\instruct_train.jsonl")) {
    Write-Host "Building instruct dataset…"
    python "$Root\datasets\download.py" --skip-hf
    if ($LASTEXITCODE -ne 0) { throw "download.py failed" }
    python "$Root\datasets\build_instruct.py"
    if ($LASTEXITCODE -ne 0) { throw "build_instruct.py failed" }
}

Write-Host "Arrête llama-server / Strata / VL avant le train (libère la VRAM)." -ForegroundColor Yellow

$outLora = if ($V1) { "$Root\artifacts\lora_v1" } else { "$Root\artifacts\lora" }
$outMerged = if ($V1) { "$Root\artifacts\merged_v1" } else { "$Root\artifacts\merged" }

python "$Root\training\train_qlora.py" `
    --config $Config `
    --data "$Root\datasets\processed\instruct_train.jsonl" `
    --out $outLora
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

Write-Host "Done. Quantize GGUF puis .\ml\serving\llama-iadaf.ps1" -ForegroundColor Green
