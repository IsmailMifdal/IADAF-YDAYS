# ML IADAF — v3 (chemins Public + Pro)

Spécialisation LLM alignée sur [`docs/VISION-PRODUIT.md`](../docs/VISION-PRODUIT.md) :
plusieurs **chemins** de démarches (particuliers élargis + préparation Pro),
lecture de pièces, branchée sur [`ai-service`](../ai-service) via API
OpenAI-compatible.

v2 (Qwen3-8B chat + VL-4B) reste la baseline technique ; v3 élargit **données,
tâches et bancs d’éval**, pas forcément la taille des modèles (contrainte 16 Go).

## Matériel figé (train + run)

| Ressource | Cible |
|-----------|--------|
| GPU | **NVIDIA RTX 5080 Laptop, 16 Go VRAM** |
| RAM | 64 Go |
| Règle | **Un seul gros poids GPU à la fois** (chat **ou** VL) |

## Architecture v3

| Rôle | Modèle (cible) | Config | Artefact |
|------|----------------|--------|----------|
| Chat / chemins | `Qwen/Qwen3-8B` (héritage v2) | `configs/model.yaml` | `artifacts/lora` → GGUF |
| Documents / pièces | `Qwen/Qwen3-VL-4B-Instruct` | `configs/model_vl.yaml` | `artifacts/lora_vl` |
| (Option) routeur de chemin | petit classifieur ou tête SFT | à ajouter | tags `chemin_id` |

Les règles `ai-service` (dates, IBAN, MRZ, qualité, complétude dossier) restent le
filet : le VL **extrait**, le code **valide**, le chat **oriente** vers un chemin.

Baselines conservées :

- v1 : `configs/model_v1.yaml` (`Qwen2.5-7B-Instruct`)
- v2 : mêmes configs modèles ; jeux de données / gold plus étroits (séjour, santé, CAF, impôts)

## Objectifs produit → objectifs ML

| Besoin vision | Capacité ML v3 |
|---------------|----------------|
| Chemins Public élargis (permis, carte grise, …) | SFT + RAG sur fiches DILA / ANTS / CERFA |
| Tous particuliers FR (pas seulement non-FR) | Q/R admin grand public + ton clair |
| Multilingue FR/EN/AR/ES | Paires instruct traduites / glossaires officiels |
| Pré-vérif pièces | VL synth + schémas justificatifs (identité, adresse, bancaire, permis, véhicule…) |
| État de dossier / checklist | JSON `dossier_state` enrichi par `chemin_id` |
| Préparation Pro (accompagnant) | SFT « synthèse pour conseiller », multi-dossiers, refus du conseil juridique |
| Aide automatisée | Anti-hallu, citations sources, refus hors périmètre |

## Flux produit v3

```
Question → (option) routeur chemin → Chat + RAG
        → État dossier (checklist)
        → Dépôt pièce → VL (lecture) → règles (validation)
        → Message usager / (Pro) synthèse accompagnant
```

1. Un **chemin** = étapes + pièces + règles + textes (réutilisable Public / Pro).
2. Chat enrichi par l’**état du dossier** + RAG (sources officielles à jour).
3. OCR cloud = secours optionnel ; pas de pièces usagers réelles en train (AIPD).

## Commandes — datasets

```powershell
cd IADAF-YDAYS
# v2 (déjà en place)
python ml/datasets/download.py
python ml/datasets/build_instruct.py
python ml/datasets/build_rag_chunks.py
python ml/datasets/build_doc_labels.py
python ml/datasets/build_vl_synth.py

# v3 — téléchargement CPU only
python ml/datasets/download_v3.py
python ml/datasets/download_v3_qualite.py   # P0 Qualité Max (yssf-io, etc.)

# SFT grounded v3 (n'écrase pas instruct_train.jsonl v2)
python ml/datasets/build_grounded_sft_v3.py
# → ml/datasets/processed/instruct_train_v3.jsonl (~16k+ avec safety)

# Index RAG local (CPU) pour eval
python ml/datasets/build_rag_index_v3.py
# → ml/artifacts/rag_v3/
```

Eval qualité **avec RAG** (serveur chat local up) :

```powershell
$env:OPENAI_BASE_URL = "http://127.0.0.1:8080/v1"
$env:OPENAI_API_KEY  = "iadaf-dev-local-key"
python ml/eval/run_quality.py --with-rag
# → ml/artifacts/eval_quality_rag.json
```

Sources, rapports et prompts Gemini :
[`datasets/SOURCES.md`](datasets/SOURCES.md) ·
[`datasets/RAPPORT-DEEPRESEARCH-V3.md`](datasets/RAPPORT-DEEPRESEARCH-V3.md) ·
[`datasets/GEMINI-DEEPRESEARCH-V3.md`](datasets/GEMINI-DEEPRESEARCH-V3.md) ·
**post-échec v2 (qualité max)** → [`datasets/GEMINI-DEEPRESEARCH-V3-QUALITE.md`](datasets/GEMINI-DEEPRESEARCH-V3-QUALITE.md).

## Résultats v2 (mesurés — RTX 5080 Laptop)

### Chat Qwen3-8B → GGUF Q4_K_M

QLoRA ~5 h (800 steps, loss ≈ 0,67) → `artifacts/lora` → `merged` →
`gguf/iadaf-qwen3-8b-Q4_K_M.gguf` (~4,7 Go).

| Banc | 1er run (post-chat) | Relance (post-VL*) | Seuil | Verdict |
|------|---------------------|--------------------|-------|---------|
| Qualité | 67 % (67/100) | **62 %** (62/100) | ≥ 90 % | **KO** |
| Docs | 50 % (4/8) | **50 %** (4/8) | ≥ 85 % | **KO** |
| Perf p95 (c=1) | ≈ 1,4 s | **≈ 1,1 s** | &lt; 15 s | **OK** |
| Cohérence mean | 0,89 | **0,875** (q004 KO → success=False) | ≥ 0,75 mean | **partiel** |

\*Le GGUF chat n’a **pas** changé après le VL : écart qualité 67→62 = variance
échantillonnage / scoring keywords, pas un effet du LoRA VL.

Rapports : `ml/artifacts/eval_{quality,docs,perf,coherence}.json`.

### VL Qwen3-VL-4B (prototype)

- Adapter : `artifacts/lora_vl` (~34 s, 8 steps, 29 ex., loss ≈ 3,15).
- **Fallback texte + chemin image** — pas de train multimodal pixels.
- N’améliore pas `run_docs` / `run_quality` (ces bancs appellent le chat GGUF).

### Priorité suivante (v3 Qualité Max + skills)

Voir [`datasets/RAPPORT-DEEPRESEARCH-V3-QUALITE.md`](datasets/RAPPORT-DEEPRESEARCH-V3-QUALITE.md)
et le registre chemins [`../chemins/registry.json`](../chemins/registry.json) :

1. **RAG-First** + SFT grounded (`[Source: URL]`) — verdict = `run_quality.py --with-rag`.
2. Corpus SFT v3 enrichi (gold ×40, glossaire, hard-negatives, safety, dossier_state, skills).
3. **Hit@3 RAG** go/no-go : `python ml/eval/run_rag_hit.py`.
4. **Skills runtime** (`ai-service`) : `qa` / `checklist` / `precheck` / `prefill` / `refuse` + `dossier_state`.
5. Faits volatils → RAG/code ; VL extrait (`ml/serving/vl_extract.py`) ; règles valident.
6. Banc skills déterministe : `python ml/eval/run_skills.py`.

## Commandes — train chat

```powershell
cd C:\Autre\Ynov\M2_info\Projets\Ydays\IADAF-YDAYS
$env:KMP_DUPLICATE_LIB_OK = "TRUE"
# Arrêter llama-server / Strata / VL avant

# v3 grounded (recommandé pour ≥90 % avec RAG)
.\ml\training\run_train_v3.ps1
# ou : .\ml\training\run_train.ps1 -V3

# Baseline v2 / v1
.\ml\training\run_train.ps1
.\ml\training\run_train.ps1 -V1
```

Serving chat GGUF :

```powershell
.\ml\serving\llama-iadaf.ps1 -ModelPath "C:\Autre\Ynov\M2_info\Projets\Ydays\IADAF-YDAYS\ml\artifacts\gguf\iadaf-qwen3-8b-Q4_K_M.gguf"
# Après export v3 : pointer le GGUF produit sous artifacts/gguf/
```

Eval post-train (serveur up) :

```powershell
$env:OPENAI_BASE_URL = "http://127.0.0.1:8080/v1"
$env:OPENAI_API_KEY  = "iadaf-dev-local-key"
$env:KMP_DUPLICATE_LIB_OK = "TRUE"
python ml/eval/run_rag_hit.py
python ml/eval/run_quality.py --with-rag
python ml/eval/run_skills.py
```

TensorRT-LLM FP8 (option perf) : `ml/serving/trtllm/README.md`.

## Commandes — train VL + test

**Prérequis** : arrêter le serveur chat (un seul gros modèle sur 16 Go).

```powershell
cd C:\Autre\Ynov\M2_info\Projets\Ydays\IADAF-YDAYS
$env:KMP_DUPLICATE_LIB_OK = "TRUE"

# Dataset images synthétiques (si pas déjà fait)
python ml/datasets/build_vl_synth.py

# QLoRA Qwen3-VL-4B → ml/artifacts/lora_vl
.\ml\training\run_train_vl.ps1
```

Après le VL, pour retester le **chat** (pas le VL) : relancer `llama-iadaf.ps1`
puis :

```powershell
$env:OPENAI_BASE_URL = "http://127.0.0.1:8080/v1"
$env:OPENAI_API_KEY  = "iadaf-dev-local-key"

python ml/eval/run_quality.py
python ml/eval/run_docs.py
python ml/eval/run_perf.py
python ml/eval/run_coherence.py
```

Smoke test manuel chat (serveur up) : questions gold dans
`ml/eval/gold/questions_v1.jsonl` et `documents_v2.jsonl`.

> Le VL n’est pas encore exposé via `llama-iadaf.ps1` (GGUF texte). L’adapter
> `artifacts/lora_vl` se charge en process séparé (transformers / script dédié) ;
> `run_docs` évalue surtout le **chat** sur l’état de dossier.

## Datasets

Voir [`datasets/SOURCES.md`](datasets/SOURCES.md).

- Synthétique / ouvert uniquement (AIPD) : **pas** de pièces usagers réelles.
- GISTI / Cimade = **liens** seulement, pas de copie intégrale.
- v3 ajoute des domaines Public élargis + corpus Pro (URSSAF, création, ton conseiller) **sous licences ouvertes**.

## Seuils YDAYS

| Banc | Seuil | Script |
|------|-------|--------|
| Qualité (gold démarches) | ≥ 90 % | `eval/run_quality.py` |
| Docs / dossier | ≥ 85 % | `eval/run_docs.py` |
| Perf p95 | &lt; 15 s | `eval/run_perf.py` |
| Cohérence | similarité ≥ seuil | `eval/run_coherence.py` |

Cibles v3 (quand les gold existent) : ≥ 100 Q multi-chemins ; gold docs par type de pièce
des nouveaux chemins ; quelques scénarios « accompagnant Pro ».

## Hors scope sur 16 Go

Dense 14B+ QLoRA confortable, VL-8B multi-images haute rés., fine-tune MoE,
entraînement simultané chat + VL.
