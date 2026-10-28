# Launch TensorRT-LLM via Docker (Windows). Fallback message if Docker/GPU unavailable.
param(
    [string]$ApiKey = "",
    [string]$Dtype = "fp8",
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$Here = $PSScriptRoot
if (-not $ApiKey) {
    $ApiKey = if ($env:OPENAI_API_KEY) { $env:OPENAI_API_KEY } else { "iadaf-dev-local-key" }
}

$merged = Join-Path (Split-Path (Split-Path $Here -Parent) -Parent) "artifacts\merged"
if (-not (Test-Path (Join-Path $merged "config.json"))) {
    Write-Error "Merged HF manquant: $merged — lance export_gguf.py --merge-only"
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host @"
Docker introuvable. Sur Windows Laptop GPU, options :
  1) Installer Docker Desktop + NVIDIA Container Toolkit
  2) Rester sur GGUF : .\ml\serving\llama-iadaf.ps1
  3) Builder sous WSL2 Ubuntu avec TensorRT-LLM
"@ -ForegroundColor Yellow
    exit 1
}

$env:OPENAI_API_KEY = $ApiKey
$env:DTYPE = $Dtype
Write-Host "TRT-LLM compose (dtype=$Dtype) → http://127.0.0.1:$Port/v1" -ForegroundColor Cyan
Push-Location $Here
try {
    docker compose -f docker-compose.yml up
} finally {
    Pop-Location
}
