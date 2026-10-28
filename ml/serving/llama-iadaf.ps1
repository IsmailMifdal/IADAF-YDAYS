# Serve the specialized IADAF Qwen2.5-7B GGUF via llama-server (OpenAI-compatible).
# Prefers CUDA build under C:\llama.cpp\bin-cuda, falls back to CPU bin.
param(
    [string]$ModelPath = "",
    [int]$Port = 8080,
    [int]$Parallel = 2,
    [int]$CtxSize = 8192,
    [int]$GpuLayers = -1,
    [string]$LlamaBin = "",
    [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path }

if (-not $ModelPath) {
    $ModelPath = Join-Path $RepoRoot "ml\artifacts\gguf\iadaf-Q4_K_M.gguf"
}
if (-not (Test-Path $ModelPath)) {
    Write-Error "GGUF introuvable: $ModelPath — lance d'abord la conversion/quantization."
}

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
    if ($env:STRATA_API_KEY) { $ApiKey = $env:STRATA_API_KEY }
    else { $ApiKey = "iadaf-dev-local-key" }
}

$exeDir = Split-Path $exe -Parent
Write-Host "llama-server: $exe" -ForegroundColor Cyan
Write-Host "model:       $ModelPath" -ForegroundColor Cyan
Write-Host "listen:      http://127.0.0.1:$Port  (OpenAI /v1)" -ForegroundColor Cyan
Write-Host "API key:     $ApiKey" -ForegroundColor DarkGray

$argsList = @(
    "-m", $ModelPath,
    "--host", "127.0.0.1",
    "--port", "$Port",
    "-c", "$CtxSize",
    "-np", "$Parallel",
    "-ngl", "$GpuLayers",
    "--api-key", $ApiKey
)

Push-Location $exeDir
try {
    & $exe @argsList
} finally {
    Pop-Location
}
