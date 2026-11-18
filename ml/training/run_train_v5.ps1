# IADAF v5 — QLoRA Ministral 3
#   -Variant A  → 8B vitesse (v5a)
#   -Variant B  → 14B qualité (v5b)
param(
    [ValidateSet("A", "B", "a", "b")]
    [string]$Variant = "A",
    [string]$Config = "",
    [switch]$SkipExport,
    [switch]$SkipBuild,
    [switch]$CuratedOnly,
    [double]$Scale = 1.0,
    [int]$MaxSteps = 0,
    [double]$MinHitAt3 = 0.80,
    [switch]$AllowLowHit
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Variant = $Variant.ToUpperInvariant()
$tag = if ($Variant -eq "A") { "v5a" } else { "v5b" }

function Select-TrainPython {
    $candidates = @()
    if ($env:IADAF_PYTHON) { $candidates += $env:IADAF_PYTHON }
    $candidates += "python"
    if (Test-Path "$Root\.venv\Scripts\python.exe") {
        $candidates += "$Root\.venv\Scripts\python.exe"
    }
    foreach ($c in $candidates) {
        try {
            & $c -c "import torch; assert torch.cuda.is_available()" 2>$null
            if ($LASTEXITCODE -eq 0) { return $c }
        } catch { }
    }
    foreach ($c in $candidates) {
        if ($c -eq "python") { return $c }
        if (Test-Path $c) { return $c }
    }
    return "python"
}

$Python = Select-TrainPython
$env:KMP_DUPLICATE_LIB_OK = "TRUE"
$env:OMP_NUM_THREADS = "1"

if (-not $Config) {
    $Config = if ($Variant -eq "A") {
        "$Root\configs\model_v5a.yaml"
    } else {
        "$Root\configs\model_v5b.yaml"
    }
}

$label = if ($Variant -eq "A") { "8B vitesse" } else { "14B qualité" }
Write-Host "== IADAF ML train chat $tag (Ministral 3 — $label) ==" -ForegroundColor Cyan
Write-Host "Config: $Config"
Write-Host "Python: $Python"
& $Python -c "import torch; print('CUDA:', torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else '')"
if ($LASTEXITCODE -ne 0) {
    throw "Python sans torch CUDA. Active conda base ou mets IADAF_PYTHON vers un interpréteur GPU."
}

# Mix SFT partagé (même données A/B) — un seul jsonl instruct_train_v5.jsonl
$data = "$Root\datasets\processed\instruct_train_v5.jsonl"
if (-not $SkipBuild) {
    Write-Host "Building SFT v5 mix (docs-in-context + héritage v4)…"
    $buildArgs = @(
        "$Root\datasets\build_instruct_v5.py",
        "--out", $data,
        "--scale", "$Scale"
    )
    if ($CuratedOnly) { $buildArgs += "--curated-only" }
    & $Python @buildArgs
    if ($LASTEXITCODE -ne 0) { throw "build_instruct_v5.py failed" }
}

if (-not (Test-Path $data)) {
    throw "Dataset manquant: $data — lancez download_v5.py puis build_instruct_v5.py"
}

Write-Host "Go/no-go Hit@3 RAG (seuil $MinHitAt3)…" -ForegroundColor Yellow
& $Python "$Root\eval\run_rag_hit.py" --threshold $MinHitAt3
if ($LASTEXITCODE -ne 0 -and -not $AllowLowHit) {
    throw "Hit@3 under $MinHitAt3 — improve RAG before train (or pass -AllowLowHit)."
}

Write-Host "Arrête llama-server / TRT-LLM avant le train (libère la VRAM)." -ForegroundColor Yellow
if ($Variant -eq "B") {
    Write-Host "14B QLoRA ≈ 12 Go — GPU exclusif obligatoire." -ForegroundColor Yellow
}

$outLora = "$Root\artifacts\lora_$tag"
$outMerged = "$Root\artifacts\merged_$tag"

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

Write-Host "Done. Artefacts: $outLora + GGUF $tag" -ForegroundColor Green
Write-Host "Bench A/B: voir ml/serving/LOCAL-V5.md et ml/datasets/COMPARE-V5A-V5B.md" -ForegroundColor DarkGray
