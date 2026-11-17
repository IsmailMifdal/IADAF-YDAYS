# Artefacts ML IADAF

Les binaires (GGUF, LoRA, NVFP4, index, résultats) sont **hors git**.  
Orga Hugging Face privée : [iadaf](https://huggingface.co/iadaf).

| Repo HF | Contenu |
|---------|---------|
| [`iadaf/models-v3_1`](https://huggingface.co/iadaf/models-v3_1) | `gguf/`, `lora_v3_1/`, `iadaf_qwen3_8b_nvfp4/` (+ `rag_v3/`, `results/` si uploadés) |
| [`iadaf/datasets-v3_1`](https://huggingface.co/datasets/iadaf/datasets-v3_1) | `processed/` (SFT instruct, labels, VL) |

`datasets/curated/` et les builders restent dans git. `datasets/raw/` est régénérable via `download_*.py` (non poussé sur HF).

## Sync (pull)

Token **Write** (ou Read) avec droits orga `iadaf`, puis :

```powershell
pip install -U "huggingface_hub[cli]"
hf auth login

# Depuis la racine du repo
hf download iadaf/models-v3_1 --local-dir ml/artifacts
hf download iadaf/datasets-v3_1 --repo-type dataset --local-dir ml/datasets
```

Après pull, les chemins locaux attendus par `start-local-v3_1.ps1` / le train sont les mêmes (`ml/artifacts/gguf/…`, `ml/datasets/processed/…`).

## Sync (push) — propriétaire des artefacts

Toujours préciser `--repo-type dataset` pour le dataset (sinon HF crée un faux *model*).

```powershell
hf upload iadaf/models-v3_1 ml/artifacts/gguf gguf
hf upload iadaf/models-v3_1 ml/artifacts/lora_v3_1 lora_v3_1
hf upload iadaf/models-v3_1 ml/artifacts/iadaf_qwen3_8b_nvfp4 iadaf_qwen3_8b_nvfp4
hf upload iadaf/models-v3_1 ml/artifacts/rag_v3 rag_v3
hf upload iadaf/models-v3_1 ml/artifacts/results results

hf upload iadaf/datasets-v3_1 ml/datasets/processed processed --repo-type dataset
```

## Modèles (racine `artifacts/`)

| Chemin | Rôle |
|--------|------|
| `iadaf_qwen3_8b_nvfp4/` | Modèle TRT servi (NVFP4) |
| `gguf/iadaf-qwen3-8b-v3_1-Q4_K_M.gguf` | Serveur local llama.cpp |
| `lora_v3_1/` | Adapter final (sans checkpoints) |
| `rag_v3/` | Index RAG hybrid |

Merge BF16 : **non conservé** (~15 Go) — recreable via `python ml/serving/export_iadaf_nvfp4.py` puis quant WSL.

## Résultats

| Dossier | Contenu |
|---------|---------|
| `results/current/` | Derniers benches / evals / gates / courbe |
| `results/archive/` | Comparatifs engines historiques (base NVFP4, llama C32) |

Index principal : `results/current/phase_gates_v3.json` · `results/current/bench_iadaf_nvfp4_summary.json`.
