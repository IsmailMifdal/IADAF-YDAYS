# Pack copie → machine de train (v4 / v5a / v5b)

Vérifié localement : raw v4 **11/11 OK**, mixes **`instruct_train_v4.jsonl`** + **`instruct_train_v5.jsonl`** présents.

## À copier (données + code)

| Chemin | Rôle | ~Taille |
|--------|------|--------:|
| `ml/datasets/raw/v4/` | Delta HF + portals + MANIFEST | ~506 Mo |
| `ml/datasets/raw/document_ia/` | Pointeur schemas (DELTA-21) | petit |
| `ml/datasets/curated/` | Buckets v4 + `docs_in_context_v5.jsonl` | petit |
| `ml/datasets/processed/instruct_train_v4.jsonl` (+ `.meta.json`) | Mix SFT v4 (32k) | ~54 Mo |
| `ml/datasets/processed/instruct_train_v5.jsonl` (+ `.meta.json`) | Mix SFT v5A/B (32k+) | ~61 Mo |
| `ml/eval/gold/` | Replay + gates | petit |
| `ml/artifacts/rag_v3/` | Hit@3 avant train | petit |
| `ml/configs/model_v4.yaml` `model_v5a.yaml` `model_v5b.yaml` | Hyperparams | — |
| `ml/training/` (`train_qlora.py`, `run_train_v4.ps1`, `run_train_v5.ps1`, `export_gguf.py`) | Train | — |
| `ml/datasets/build_instruct_*.py` `download_*.py` | Rebuild si besoin | — |

**Total data utile ≈ 620–650 Mo** (hors artefacts GGUF/LoRA/NVFP4 inutiles pour le train).

## Bases modèles (préfetch local)

Dossier : `ml/artifacts/base_models/` (hors git, ~50–60 Go).

| Track | Dossier local |
|-------|---------------|
| v4 | `base_models/Qwen3-8B` |
| v5a | `base_models/Ministral-3-8B-Instruct-2512-BF16` |
| v5b | `base_models/Ministral-3-14B-Instruct-2512-BF16` |

```powershell
# Relancer / reprendre un download (évite bug httpx2 du CLI hf)
python ml/artifacts/base_models/prefetch_bases.py
# ou : python ml/artifacts/base_models/prefetch_bases.py --only v5a
```

Dans le yaml, pointer `base_model:` vers le chemin absolu local (ou laisser l’ID HF si cache déjà chaud).

## Dataset HF v5

Repo privé : https://huggingface.co/datasets/iadaf/datasets-v5  
(`instruct_train_v5.jsonl` + meta + curated docs + briefs)

```powershell
hf download iadaf/datasets-v5 --repo-type dataset --local-dir ml/datasets
```

## Aussi requis sur la machine de train

| Élément | Où |
|---------|-----|
| Stack CUDA (torch, peft, trl, unsloth optionnel) | machine de train |
| Copie de `base_models/` **ou** re-prefetch | ~50–60 Go |

## Sur la machine de train

```powershell
# v4
.\ml\training\run_train_v4.ps1 -SkipBuild
# ou rebuild: sans -SkipBuild

# v5A / v5B (même mix instruct_train_v5.jsonl)
.\ml\training\run_train_v5.ps1 -Variant A -SkipBuild
.\ml\training\run_train_v5.ps1 -Variant B -SkipBuild

# Si Hit@3 bloque sans RAG : -AllowLowHit
```

## Checklist rapide

- [x] `raw/v4/MANIFEST.json` + data.jsonl P0 (legi, FalseReject, or-bench, MultiJail, PolyGuard, nomiracl, glaive)
- [x] curated v4 + `docs_in_context_v5.jsonl`
- [x] `instruct_train_v4.jsonl` (32000)
- [x] `instruct_train_v5.jsonl` (32008)
- [x] `eval/gold/questions_v1.jsonl` (108) + `documents_v3.jsonl` (35)
- [x] `artifacts/rag_v3/`
- [x] HF `iadaf/datasets-v5` poussé
- [x] Base **Qwen3-8B** dans `artifacts/base_models/` (~15,6 Go)
- [ ] Bases **Ministral 8B / 14B** — à prefetch plus tard (`prefetch_bases.py --only v5a|v5b`)
