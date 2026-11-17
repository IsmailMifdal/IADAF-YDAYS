# Artefacts ML IADAF

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
