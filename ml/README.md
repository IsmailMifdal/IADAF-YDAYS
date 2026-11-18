# ML IADAF — v3.1 (prod) · **v5A/v5B** (scaffold Ministral 3)

Guides : [`serving/LOCAL-V3.md`](serving/LOCAL-V3.md) · [`serving/LOCAL-V5.md`](serving/LOCAL-V5.md) · [`serving/ENGINES-V5.md`](serving/ENGINES-V5.md) · [`datasets/BRIEF-V5.md`](datasets/BRIEF-V5.md) · [`datasets/COMPARE-V5A-V5B.md`](datasets/COMPARE-V5A-V5B.md) · [`datasets/SCALE-CAPACITY-V5.md`](datasets/SCALE-CAPACITY-V5.md) · [`serving/RELEASE-V3.1.md`](serving/RELEASE-V3.1.md) · [`serving/TRTLLM-MONO-SCALE.md`](serving/TRTLLM-MONO-SCALE.md) · [`artifacts/README.md`](artifacts/README.md)

## Train v5 — double piste (souverain FR)

- **V5A** = Ministral **8B** → vitesse / ≥ 50–60 tok/s/user  
- **V5B** = Ministral **14B** → qualité  
- Mix SFT **commun** + docs-in-context (prêt / pas prêt admin FR)

```powershell
python ml/datasets/download_v5.py
.\ml\training\run_train_v5.ps1 -Variant A    # 8B
.\ml\training\run_train_v5.ps1 -Variant B    # 14B
# Smoke : .\ml\training\run_train_v5.ps1 -Variant A -MaxSteps 20 -SkipExport -AllowLowHit
```

Configs : [`configs/model_v5a.yaml`](configs/model_v5a.yaml) · [`configs/model_v5b.yaml`](configs/model_v5b.yaml). Serve : [`serving/LOCAL-V5.md`](serving/LOCAL-V5.md).

### Bench architecture multi-user (256 / 512)

Plan : [`eval/ARCH-SCALE-PLAN-V5.md`](eval/ARCH-SCALE-PLAN-V5.md) · engines : [`serving/ENGINES-V5.md`](serving/ENGINES-V5.md)

```powershell
$env:OPENAI_BASE_URL = "http://127.0.0.1:8000/v1"
.\ml\eval\run_arch_scale_matrix.ps1 -Track v5a -Engine vllm -Quant fp8
# Après plusieurs cellules :
python ml/eval/summarize_arch_scale.py
# → artifacts/results/current/arch_scale_summary.json
```

## Exploitation

```powershell
# Stack locale GGUF + Postgres embarqué + ai-service
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\ml\serving\start-local-v3_1.ps1

# Prod multi-user — TRT IADAF NVFP4 (WSL Ubuntu-24.04 ou 26.04)
wsl -d Ubuntu-26.04 -- bash ml/serving/_wsl_serve_iadaf_nvfp4.sh
# Laptop 16 Go : plafonner le batch si besoin
# $env:TRTLLM_MAX_BATCH=128; wsl -d Ubuntu-26.04 -- bash ml/serving/_wsl_serve_iadaf_nvfp4.sh
```

Capacité mesurée (RTX 5080 Laptop, TRT-LLM 1.4 NVFP4, ≥ 60 tok/s/user) : **3 users** — détail `artifacts/results/current/bench_capacity_60tps_summary.json`.

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

Artefacts lourds (privé HF) : [`iadaf/models-v3_1`](https://huggingface.co/iadaf/models-v3_1) · [`iadaf/datasets-v3_1`](https://huggingface.co/datasets/iadaf/datasets-v3_1) — commandes pull/push dans [`artifacts/README.md`](artifacts/README.md).

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
