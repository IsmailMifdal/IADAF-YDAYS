# Serve the specialized IADAF Qwen3-8B GGUF via llama-server (OpenAI-compatible).
# Prefers CUDA build under C:\llama.cpp\bin-cuda, falls back to CPU bin.
param(
    [string]$ModelPath = "",
    [string]$DraftPath = "",
    [int]$Port = 8080,
    # parallel slots share the -c pool (e.g. 32768/4 = 8192 per conversation)
    [int]$Parallel = 4,
    [int]$CtxSize = 32768,
    [int]$GpuLayers = -1,
    [int]$Batch = 2048,
    [int]$UBatch = 512,
    [int]$DraftN = 8,
    [string]$SpecType = "",  # ngram-simple | empty (use draft if present)
    [string]$LlamaBin = "",
    [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path }

if (-not $ModelPath) {
    $ModelPath = Join-Path $RepoRoot "ml\artifacts\gguf\iadaf-qwen3-8b-v3_1-Q4_K_M.gguf"
}
if (-not (Test-Path $ModelPath)) {
    Write-Error "GGUF introuvable: $ModelPath — lance d'abord la conversion/quantization."
}
# Draft is opt-in only: measured Qwen3-0.6B draft → ~14 tok/s (vocab mismatch).
# Pass -DraftPath explicitly to experiment.

function Find-LlamaServer {
    if ($LlamaBin -and (Test-Path $LlamaBin)) { return (Resolve-Path $LlamaBin).Path }
    $candidates = @(
        "C:\llama.cpp\bin-cuda\llama-server.exe",
        "C:\llama.cpp\bin\llama-server.exe",
        (Join-Path $env:USERPROFILE "llama.cpp\bin-cuda\llama-server.exe"),
        (Join-Path $env:USERPROFILE "llama.cpp\bin\llama-server.exe")
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    $onPath = Get-Command llama-server -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    return $null
}

$exe = Find-LlamaServer
if (-not $exe) {
    Write-Error @"
llama-server.exe introuvable.
Télécharge une release Windows (CUDA 12.4 recommandé) depuis:
  https://github.com/ggml-org/llama.cpp/releases
et place les binaires dans C:\llama.cpp\bin-cuda\
"@
}

if (-not $ApiKey) {
    if ($env:OPENAI_API_KEY) { $ApiKey = $env:OPENAI_API_KEY }
    else { $ApiKey = "iadaf-dev-local-key" }
}

$exeDir = Split-Path $exe -Parent
Write-Host "llama-server: $exe" -ForegroundColor Cyan
Write-Host "model:       $ModelPath" -ForegroundColor Cyan
if ($DraftPath -and (Test-Path $DraftPath)) {
    Write-Host "draft:       $DraftPath (speculative --draft $DraftN)" -ForegroundColor Cyan
} elseif ($SpecType) {
    Write-Host "spec-type:   $SpecType" -ForegroundColor Cyan
}
Write-Host "listen:      http://127.0.0.1:$Port  (OpenAI /v1)" -ForegroundColor Cyan
Write-Host "API key:     $ApiKey" -ForegroundColor DarkGray

$argsList = @(
    "-m", $ModelPath,
    "--host", "127.0.0.1",
    "--port", "$Port",
    "-c", "$CtxSize",
    "-np", "$Parallel",
    "-ngl", "$GpuLayers",
    "-b", "$Batch",
    "-ub", "$UBatch",
    "-fa", "on",
    "-cb",
    "--api-key", $ApiKey
)

if ($DraftPath -and (Test-Path $DraftPath)) {
    $argsList += @("-md", $DraftPath, "--draft", "$DraftN", "-ngld", "99", "-cd", "8192")
} elseif ($SpecType) {
    $argsList += @("--spec-type", $SpecType, "--draft", "$DraftN")
}

Push-Location $exeDir
try {
    & $exe @argsList
} finally {
    Pop-Location
}
