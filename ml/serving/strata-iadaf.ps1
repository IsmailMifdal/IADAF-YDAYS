# Launch Strata for IADAF — portable (any Windows user / machine).
# Resolution: 1) STRATA_HOME / %USERPROFILE%\Strata  2) `strata` CLI only if no local install
param(
    [string]$ModelPath = "",
    [int]$Port = 8080,
    [int]$Parallel = 2,
    [string]$Context = "32k",
    [string]$Preset = "iadaf-5080",
    [string]$StrataHome = "",
    [string]$Config = ""
)

$ErrorActionPreference = "Stop"

if (-not $env:STRATA_API_KEY) {
    $env:STRATA_API_KEY = "iadaf-dev-local-key"
    Write-Host "STRATA_API_KEY not set — using ephemeral dev key." -ForegroundColor Yellow
}

function Find-StrataHome {
    if ($StrataHome -and (Test-Path $StrataHome)) { return (Resolve-Path $StrataHome).Path }
    if ($env:STRATA_HOME -and (Test-Path $env:STRATA_HOME)) { return $env:STRATA_HOME }
    $default = Join-Path $env:USERPROFILE "Strata"
    if (Test-Path (Join-Path $default "serve\server.py")) { return $default }
    return $null
}

function Find-StrataConfig([string]$HomeDir) {
    if ($Config) { return $Config }
    if ($env:STRATA_CONFIG) { return $env:STRATA_CONFIG }
    $preferred = Join-Path $HomeDir "strata-iq2_xs.json"
    if (Test-Path $preferred) { return $preferred }
    $first = Get-ChildItem -Path $HomeDir -Filter "strata-*.json" -File -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
    return $first
}

$cli = Get-Command strata -ErrorAction SilentlyContinue
$homeDir = Find-StrataHome

if ($homeDir) {
    $py = Join-Path $homeDir ".venv\Scripts\python.exe"
    if (-not (Test-Path $py)) {
        $py = Join-Path $homeDir ".venv\bin\python"
    }
    if (-not (Test-Path $py)) {
        Write-Error "venv manquant sous $homeDir\.venv — lance START-HERE.bat / setup dans ce dossier"
    }
    $cfg = Find-StrataConfig $homeDir
    if (-not $cfg -or -not (Test-Path $cfg)) {
        Write-Error "Aucune config strata-*.json dans $homeDir — définis -Config ou STRATA_CONFIG"
    }
    Write-Host "Using local Strata at $homeDir (port $Port)" -ForegroundColor Cyan
    Write-Host "Config: $cfg"
    Set-Location $homeDir
    & $py (Join-Path $homeDir "serve\server.py") --engine strata --config $cfg --port $Port
} elseif ($cli) {
    Write-Host "Starting Strata CLI preset '$Preset' on port $Port…" -ForegroundColor Cyan
    if ($ModelPath) {
        if (-not (Test-Path $ModelPath)) { Write-Error "ModelPath not found: $ModelPath" }
        & strata launch --model-path $ModelPath --context $Context --kv q4_0 `
            --parallel $Parallel --vision off --tune quick --access local `
            --port $Port --api-key-env STRATA_API_KEY --save-preset $Preset --yes --no-tui
    } else {
        & strata launch --family qwen --model iq3_xxs --context $Context --kv q4_0 `
            --parallel $Parallel --vision off --tune quick --access local `
            --port $Port --api-key-env STRATA_API_KEY --save-preset $Preset --yes --no-tui
    }
} else {
    Write-Error @"
Strata introuvable.

Une seule install : place Strata sous %USERPROFILE%\Strata, lance START-HERE.bat,
puis relance ce script. Evite install.ps1 si tu as deja ce dossier (doublon GPU/modele).
"@
}

Write-Host @"

Strata API: http://127.0.0.1:$Port/v1
  OPENAI_BASE_URL=http://127.0.0.1:$Port/v1
  OPENAI_API_KEY=$($env:STRATA_API_KEY)

Healthcheck:
  python ml/serving/healthcheck.py --base-url http://127.0.0.1:$Port/v1
"@ -ForegroundColor Green
