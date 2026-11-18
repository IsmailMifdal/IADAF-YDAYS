# Artefacts ML IADAF

Les binaires (GGUF, LoRA, NVFP4, index, résultats) sont **hors git**.  
Orga Hugging Face privée : [iadaf](https://huggingface.co/iadaf).

| Repo HF | Contenu |
|---------|---------|
| [`iadaf/models-v3_1`](https://huggingface.co/iadaf/models-v3_1) | `gguf/`, `lora_v3_1/`, `iadaf_qwen3_8b_nvfp4/` (+ `rag_v3/`, `results/` si uploadés) |
| [`iadaf/datasets-v3_1`](https://huggingface.co/datasets/iadaf/datasets-v3_1) | `processed/` v3.1 (SFT instruct, labels, VL) |
| [`iadaf/datasets-v4`](https://huggingface.co/datasets/iadaf/datasets-v4) | **v4** : `processed/instruct_train_v4.jsonl` (+ meta) — à créer au 1er push |
| [`iadaf/models-v4`](https://huggingface.co/iadaf/models-v4) | **après train** : `lora_v4/`, GGUF, NVFP4 |

`datasets/curated/` et les builders restent dans git. `datasets/raw/` est régénérable via `download_*.py` (non poussé sur HF ; ~300 Mo locaux optionnels).

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

# --- Dataset SFT v4 (avant / pour machine de train) ---
# Créer le repo dataset privé une fois : hf repo create iadaf/datasets-v4 --type dataset --private
hf upload iadaf/datasets-v4 ml/datasets/processed/instruct_train_v4.jsonl processed/instruct_train_v4.jsonl --repo-type dataset
hf upload iadaf/datasets-v4 ml/datasets/processed/instruct_train_v4.meta.json processed/instruct_train_v4.meta.json --repo-type dataset

# Sur la machine de train (pull data seule) :
# hf download iadaf/datasets-v4 --repo-type dataset --local-dir ml/datasets

# --- Après train : pousser le LoRA ---
# hf repo create iadaf/models-v4 --type model --private
# hf upload iadaf/models-v4 ml/artifacts/lora_v4 lora_v4
```

## Copie machine dédiée (train) → retour dev

**À emporter (léger, suffisant si `instruct_train_v4.jsonl` est déjà build) :**

| Élément | Obligatoire |
|---------|:-----------:|
| Git branch / commit code (configs, `train_qlora.py`, `model_v4.yaml`, `run_train_v4.ps1`) | oui |
| `ml/datasets/processed/instruct_train_v4.jsonl` (~54 Mo) + `.meta.json` | oui |
| Python CUDA (torch, peft, trl, transformers) + auth HF pour `Qwen/Qwen3-8B` | oui |
| `ml/datasets/raw/v4/` (~310 Mo) | non (rebuild possible) |
| `ml/artifacts/gguf|lora_v3_1|nvfp4` | non pour le train v4 |

**Retour sur la machine de dev :**

| Élément | |
|---------|--|
| `ml/artifacts/lora_v4/` | adapter entraîné |
| optionnel GGUF / NVFP4 | export local ou push `iadaf/models-v4` puis `hf download` |

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
