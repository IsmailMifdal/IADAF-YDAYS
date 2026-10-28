# ML IADAF — entraînement, serving, évaluation

Dossier prêt à l’emploi pour spécialiser un LLM sur les démarches administratives
françaises et le brancher sur [`ai-service`](../ai-service) via une API
OpenAI-compatible.

## Matériel cible (référence)

| Ressource | Valeur typique |
|-----------|----------------|
| GPU | NVIDIA 16 Go VRAM (ex. RTX 5080 Laptop) |
| RAM | 64 Go |
| OS | Windows / Linux |

## Architecture

```
Utilisateurs → Front → Gateway → ai-service (RAG Chroma)
                                      ↓
                         OpenAI-compatible :8080|/8000/v1
                    (llama.cpp GGUF  |  TensorRT-LLM FP8  |  Strata)
```

- **Un modèle partagé** ; le cloisonnement multi-utilisateur reste le JWT IADAF.
- Spécialisation = **QLoRA** sur `Qwen2.5-7B-Instruct` + **RAG** enrichi.

## Flux rapide

```bash
# 0) Dépendances eval
pip install -r ml/requirements-eval.txt

# 1) Datasets (DILA XML + HF + document-ia + curated)
python ml/datasets/download.py
python ml/datasets/build_instruct.py
python ml/datasets/build_rag_chunks.py
python ml/datasets/build_doc_labels.py

# 2) Entraînement QLoRA (GPU)
#   pip install torch --index-url https://download.pytorch.org/whl/cu128
pip install -r ml/requirements-train.txt
# PowerShell: .\ml\training\run_train.ps1

# 3a) Serving GGUF (simple, déjà validé)
.\ml\serving\llama-iadaf.ps1

# 3b) Serving TensorRT-LLM FP8 (perf multi-users)
#    merge LoRA → engine FP8 → API :8000  — voir ml/serving/trtllm/README.md
.\ml\serving\trtllm\serve-trtllm.ps1

# 4) Brancher ai-service
# OPENAI_BASE_URL=http://127.0.0.1:8080/v1   # llama.cpp
# OPENAI_BASE_URL=http://127.0.0.1:8000/v1   # TRT-LLM
# OPENAI_API_KEY=iadaf-dev-local-key

# 5) Éval
python ml/eval/run_quality.py
python ml/eval/run_perf.py
python ml/eval/run_coherence.py
```

## Serving — choix

| Voie | Quand | Script |
|------|-------|--------|
| **llama.cpp GGUF Q4_K_M** | Défaut Windows, simple | `ml/serving/llama-iadaf.ps1` |
| **TensorRT-LLM FP8** | Throughput multi-users / context long | `ml/serving/trtllm/` |
| **Strata** | MoE iq2_xs déjà installé (baseline) | `ml/serving/strata-iadaf.ps1` |

### TensorRT-LLM (pas un tweak Strata)

1. Garder le QLoRA PyTorch.
2. `merge` → build engine FP8 → `trtllm-serve`.
3. Pointer `OPENAI_BASE_URL` vers `:8000/v1`.
4. Rejouer `run_perf` / `run_quality` / `run_coherence`.

Gain attendu ≈ **+20–100 % throughput** ; latence IADAF souvent déjà OK (~1–2 s).

### Alternative GGUF sans refonte

Monter `-Parallel`, baisser `-CtxSize` si OOM, max TGP — gain limité, zéro migration.

## Datasets

Voir [`datasets/SOURCES.md`](datasets/SOURCES.md).

Sources intégrées côté pipeline : **flux XML DILA** (fiches + CERFA), HF
AgentPublic/CESEDA, **document-ia** (schémas justificatifs), portails officiels
(ANEF, OFII, Légifrance) en curated, corrections qualité (refus / anti-hallucination).
GISTI / Cimade : **orientation uniquement** (pas de copie intégrale).

Aucune pièce utilisateur réelle n’entre dans l’entraînement (contrainte AIPD).

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

## Roadmap v2 — documents + aide renforcée

Objectif : guider l’usager **et** lire les pièces, sans abandonner les règles
déterministes ni les contraintes AIPD. Famille cible : **Qwen3** (plus Qwen2.5).

### Matériel figé (train + run)

| Ressource | Cible |
|-----------|--------|
| GPU | **NVIDIA RTX 5080 Laptop, 16 Go VRAM** |
| RAM | 64 Go |
| Contrainte | Tout le pipeline v2 (QLoRA + serving) doit tenir sur **cette seule carte** |

Pas de dépendance à un GPU ≥ 24 Go ni à un train distant pour la v2 de référence.

### Architecture cible (2 rôles, Qwen3)

| Rôle | Modèle | Train (QLoRA 4-bit) | Run |
|------|--------|---------------------|-----|
| Chat / démarches | **`Qwen3-8B-Instruct`** | ~10–14 Go ; seq ≤ 2k, batch 1–2 + grad accum, checkpointing | GGUF Q4_K_M / FP8 ; contexte et `-Parallel` maîtrisés |
| Documents | **`Qwen3-VL-4B-Instruct`** (cible) ; `Qwen3-VL-8B` seulement si budget pixels + seq très serrés | ~12–15 Go ; batch 1, images bornées (`max_pixels`), FlashAttn | Quantifié ; **chargé à la demande** (pas en parallèle BF16 avec le chat) |

Sur 16 Go : **un seul gros poids GPU à la fois** — LLM texte pour le chat, swap / process séparé pour le VL à l’analyse de pièce. OCR cloud (ex. Mistral) = **secours**, pas le cœur.

Les règles (`ai-service` : dates, IBAN, MRZ, qualité image) restent le filet
de sécurité : le VL **extrait**, le code **valide** (évite les faux « conforme »).

Hors budget 5080 16 Go en v2 : dense 14B+ en QLoRA confortable, VL-8B multi-images haute rés., MoE Flash-Next fine-tuné.

### Flux produit v2

1. Dépôt pièce → VL (lecture) → règles (validation) → message clair à l’usager.
2. Chat enrichi par l’**état du dossier** (pièces OK / KO / manquantes) + RAG.
3. OCR tiers optionnel si le VL est indisponible ou trop coûteux.

### Datasets v2 (prêts à l’usage, toujours synthétiques / ouverts)

Compléter [`datasets/SOURCES.md`](datasets/SOURCES.md) :

| Piste | Contenu | Usage |
|-------|---------|--------|
| Démarches (déjà v1) | DILA XML, AgentPublic, CESEDA, curated ANEF/OFII | SFT + RAG à jour |
| Documents synthétiques | Images fictives (passeport/MRZ, RIB, facture, scans flous/sombres) + schémas document-ia | SFT VL (type + champs JSON) |
| Multilingue | Mêmes Q/R en FR / EN / AR / ES | Alignement produit IADAF |
| Gold qualité élargi | Refus, anti-hallu, pièce manquante / expirée | Bancs eval v2 |

**Toujours interdit** : pièces réelles usagers ; copie intégrale GISTI / Cimade
(liens + orientation seulement).
