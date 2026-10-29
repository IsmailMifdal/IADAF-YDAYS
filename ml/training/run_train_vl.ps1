# IADAF v2 — QLoRA documents Qwen3-VL-4B (RTX 5080 16 GB, à part du chat)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$env:KMP_DUPLICATE_LIB_OK = "TRUE"
$env:OMP_NUM_THREADS = "1"

Write-Host "== IADAF ML train VL documents ==" -ForegroundColor Cyan
Write-Host "Arrête le chat GGUF / Strata avant (un seul gros modèle GPU)." -ForegroundColor Yellow

if (-not (Test-Path "$Root\datasets\processed\vl_train.jsonl")) {
    Write-Host "Building VL synth dataset…"
    python "$Root\datasets\build_vl_synth.py"
    if ($LASTEXITCODE -ne 0) { throw "build_vl_synth.py failed" }
}

python "$Root\training\train_vl_qlora.py" `
    --config "$Root\configs\model_vl.yaml" `
    --data "$Root\datasets\processed\vl_train.jsonl" `
    --out "$Root\artifacts\lora_vl"
if ($LASTEXITCODE -ne 0) {
    throw "train_vl_qlora.py a échoué (code $LASTEXITCODE)"
}

Write-Host "Done. Adapter VL → $Root\artifacts\lora_vl" -ForegroundColor Green
Write-Host "Inférence: process séparé (pas en parallèle BF16 avec le 8B chat)."
