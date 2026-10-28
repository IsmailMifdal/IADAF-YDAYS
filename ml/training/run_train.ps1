# QLoRA train + export hints — RTX 5080 Laptop 16 GB
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

# Anaconda + PyTorch often ship two OpenMP runtimes → OMP Error #15 abort
$env:KMP_DUPLICATE_LIB_OK = "TRUE"
$env:OMP_NUM_THREADS = "1"

Write-Host "== IADAF ML train ==" -ForegroundColor Cyan
Write-Host "KMP_DUPLICATE_LIB_OK=$env:KMP_DUPLICATE_LIB_OK (Anaconda OpenMP workaround)"

if (-not (Test-Path "$Root\datasets\processed\instruct_train.jsonl")) {
    Write-Host "Building instruct dataset…"
    python "$Root\datasets\download.py" --skip-hf
    if ($LASTEXITCODE -ne 0) { throw "download.py failed" }
    python "$Root\datasets\build_instruct.py"
    if ($LASTEXITCODE -ne 0) { throw "build_instruct.py failed" }
}

# Stop Strata first if it still holds the GPU (user responsibility) — warn only
Write-Host "Assure-toi que Strata est arrêté (libère la VRAM) avant le train." -ForegroundColor Yellow

python "$Root\training\train_qlora.py" `
    --config "$Root\configs\model.yaml" `
    --data "$Root\datasets\processed\instruct_train.jsonl" `
    --out "$Root\artifacts\lora"
if ($LASTEXITCODE -ne 0) {
    throw "train_qlora.py a échoué (code $LASTEXITCODE). Pas d'export."
}

if (-not (Test-Path "$Root\artifacts\lora")) {
    throw "Adapter manquant après train: $Root\artifacts\lora"
}

python "$Root\training\export_gguf.py" `
    --config "$Root\configs\model.yaml" `
    --adapter "$Root\artifacts\lora" `
    --merged "$Root\artifacts\merged" `
    --gguf-dir "$Root\artifacts\gguf"
if ($LASTEXITCODE -ne 0) {
    throw "export_gguf.py a échoué (code $LASTEXITCODE)"
}

Write-Host "Done. See export_gguf output for llama.cpp / Strata steps." -ForegroundColor Green
