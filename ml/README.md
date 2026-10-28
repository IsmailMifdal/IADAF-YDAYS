# ML IADAF — entraînement, serving Strata, évaluation

Dossier prêt à l’emploi pour spécialiser un LLM sur les démarches administratives
françaises et le brancher sur [`ai-service`](../ai-service) via une API
OpenAI-compatible (Strata).

## Matériel cible (référence)

| Ressource | Valeur typique |
|-----------|----------------|
| GPU | NVIDIA 16 Go VRAM (ex. RTX 5080 Laptop) |
| RAM | 64 Go |
| OS | Windows / Linux |

Les scripts **ne dépendent d’aucun chemin utilisateur** : `strata` sur le PATH,
ou install sous `%USERPROFILE%\Strata` / `$HOME/Strata`, ou `STRATA_HOME`.

## Architecture

```
Utilisateurs → Front → Gateway → ai-service (RAG Chroma)
                                      ↓
                               Strata :8080/v1  (1 modèle, N slots)
```

- **Un modèle partagé** ; le cloisonnement multi-utilisateur reste le JWT IADAF.
- Spécialisation = **QLoRA** sur `Qwen2.5-7B-Instruct` + **RAG** enrichi.
- Inférence multi-requêtes = **Strata**.

## Flux rapide

```bash
# 0) Dépendances eval
pip install -r ml/requirements-eval.txt

# 1) Datasets
python ml/datasets/download.py
python ml/datasets/build_instruct.py
python ml/datasets/build_rag_chunks.py
python ml/datasets/build_doc_labels.py

# 2) Entraînement QLoRA (GPU) — optionnel
# PyTorch CUDA obligatoire (pas le wheel +cpu) :
#   pip uninstall -y torch torchvision torchaudio
#   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
pip install -r ml/requirements-train.txt
# PowerShell: .\ml\training\run_train.ps1

# 3) Serving Strata
export STRATA_API_KEY=dev-local-key
bash ml/serving/strata-iadaf.sh
# Autre terminal :
python ml/serving/healthcheck.py --base-url http://127.0.0.1:8080/v1

# 4) Brancher ai-service (configs/serving.env.example)
# USE_OPENAI=true
# OPENAI_BASE_URL=http://127.0.0.1:8080/v1
# OPENAI_API_KEY=…

# 5) Éval
python ml/eval/run_quality.py
python ml/eval/run_perf.py
python ml/eval/run_coherence.py
```

## Strata (une seule install par machine)

**Recommandé** — une copie sous `%USERPROFILE%\Strata` (Windows) ou `$HOME/Strata` :

1. Clone / extrait Strata dans ce dossier, lance `START-HERE.bat` une fois.
2. `bash ml/serving/strata-iadaf.sh` (détecte ce dossier automatiquement).

N’installe **pas** le CLI `install.ps1` en plus : ça retélécharge moteur + modèle.

```bash
# optionnel si le dossier n'est pas au chemin par défaut
export STRATA_HOME="$HOME/Strata"
export STRATA_CONFIG="$STRATA_HOME/strata-iq2_xs.json"
bash ml/serving/strata-iadaf.sh
```

## Datasets

Voir [`datasets/SOURCES.md`](datasets/SOURCES.md). Aucune pièce utilisateur réelle
n’entre dans l’entraînement (contrainte AIPD).

## Objectifs d’évaluation (YDAYS)

| Banc | Seuil | Script |
|------|-------|--------|
| Qualité (100 Q de référence) | ≥ 90 % | `eval/run_quality.py` |
| Perf p95 (prompt court) | &lt; 15 s | `eval/run_perf.py` |
| Cohérence (5 runs / Q) | similarité ≥ seuil | `eval/run_coherence.py` |

Seuils : [`eval/thresholds.yaml`](eval/thresholds.yaml).

## Hors scope v1

- Fine-tune du MoE Qwen3.8-Flash-Next
- Entraînement sur documents usagers réels
- Remplacement complet des règles documentaires par un modèle vision
