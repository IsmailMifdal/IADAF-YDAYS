# ML IADAF — v3.1

Guides : [`serving/LOCAL-V3.md`](serving/LOCAL-V3.md) · [`serving/RELEASE-V3.1.md`](serving/RELEASE-V3.1.md) · [`serving/TRTLLM-MONO-SCALE.md`](serving/TRTLLM-MONO-SCALE.md) · [`artifacts/README.md`](artifacts/README.md)

## Exploitation

```powershell
# Stack locale GGUF + Postgres embarqué + ai-service
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\ml\serving\start-local-v3_1.ps1

# Prod multi-user — TRT IADAF NVFP4 (WSL)
wsl -d Ubuntu-24.04 -- bash ml/serving/_wsl_serve_iadaf_nvfp4.sh
```

| Mode | Entrée | URL |
|------|--------|-----|
| Local qualité | `start-local-v3_1.ps1` / `llama-iadaf.ps1` | `http://127.0.0.1:8080/v1` → ai-service `:8086` |
| Multi-user | `_wsl_serve_iadaf_nvfp4.sh` | `http://127.0.0.1:8000/v1` |
| Env type | `configs/serving.env.example` | copier vers `ai-service/.env` |

Runtime local (logs, `pgdata`, `pg_uri.txt`) → **`ml/.tools/`** (gitignored). Postgres embarqué : `serving/keep_pgserver.py`.

Gates : `artifacts/results/current/phase_gates_v3.json`.

## Layout

| Dossier | Rôle |
|---------|------|
| `serving/` | Démarrage, export NVFP4, healthcheck |
| `eval/` | Qualité, scénarios, débit, smoke |
| `training/` | QLoRA + export GGUF (`run_train_v3_1.ps1`) |
| `datasets/` | Sources + builders SFT/RAG |
| `configs/` | `model_v3_1.yaml`, `serving.env.example` |
| `artifacts/` | Modèles / index / résultats (hors git sauf README) |

## Scripts actifs (`serving/`)

| Script | Usage |
|--------|--------|
| `start-local-v3_1.ps1` | Stack locale complète |
| `llama-iadaf.ps1` | llama-server seul (GGUF v3.1) |
| `keep_pgserver.py` | Postgres embarqué → `.tools/pg_uri.txt` |
| `healthcheck.py` | Probe OpenAI-compat |
| `_wsl_trtllm_env.sh` | Env TRT-LLM WSL (`source`) |
| `_wsl_serve_iadaf_nvfp4.sh` | Serve modèle IADAF NVFP4 |
| `_wsl_export_iadaf_nvfp4.sh` / `export_iadaf_nvfp4.py` | Rebuild NVFP4 |
| `_wsl_upgrade_trtllm.sh` | Upgrade package TRT-LLM |

## Eval (résumé)

Voir commandes détaillées dans [`serving/LOCAL-V3.md`](serving/LOCAL-V3.md).

```powershell
.\ml\.venv\Scripts\Activate.ps1
# puis run_rag_hit / run_skills / run_scenarios_reels / run_quality / bench_*
```

## Train v3.1

```powershell
.\ml\training\run_train_v3_1.ps1
```

Configs historiques (`model.yaml`, `model_v3.yaml`, VL) et scripts `run_train*.ps1` / `run_train_vl.ps1` restent pour rejouabilité — le chemin courant est **v3.1**.
