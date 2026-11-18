# Brief IADAF ML **v5** — double piste Ministral 3 (souverain FR)

> **V5A** = Ministral **8B** (vitesse, flux ≥ **50–60 tok/s/user**)  
> **V5B** = Ministral **14B** (qualité)  
> Même mix SFT + même stack docs. On **compare** puis on choisit (ou on scale GPU plus tard).  
> MoE / Small 4 : **hors scope** (hardware non disponible).

## Décisions

| Item | V5A | V5B |
|------|-----|-----|
| Base BF16 | `Ministral-3-8B-Instruct-2512-BF16` | `Ministral-3-14B-Instruct-2512-BF16` |
| Priorité | Latence / tok/s / multi-user | Qualité FR, tools, docs longs |
| `max_seq_length` SFT | 3072 | 2048 |
| Batch train (16 Go) | 2 × accum 8 | 1 × accum 16 |
| Export | GGUF Q4_K_M (+ NVFP4) | idem |
| Mix SFT | **commun** `instruct_train_v5.jsonl` | idem |

Licence : Apache-2.0. Chat template : `mistral`.

## Documents usager (non négociable v5)

Pipeline **code-first** (hérité v4), modèle = explication + readiness :

```
Upload pièce(s)
  → OCR / vision (extrait texte + champs JSON)
  → skill_precheck_validate (IBAN, MRZ, dates, flou, cohérence)  ← 100 % code
  → chat Ministral avec document + résultat contrôle EN CONTEXTE
  → réponse : prêt / pas prêt + next steps + Q&A sur le contenu
```

Règles SFT / runtime :

1. L’usager peut **poser des questions sur ses documents** (champs, cohérence, pièces manquantes).
2. Le modèle **ne valide pas** IBAN/MRZ/dates — il **cite** les `error_codes` du contrôle.
3. Sortie attendue : **PRÊT** ou **NON PRÊT** pour un dépôt admin FR + actions concrètes.
4. Zéro invention de CERFA / montants / champs OCR absents.
5. Multi-pièces : dossier prêt seulement si **toutes** les pièces obligatoires passent.

Curated : [`curated/docs_in_context_v5.jsonl`](curated/docs_in_context_v5.jsonl) + `docs_explain_v4`.  
Eval : `eval/run_docs.py` (`documents_v3.jsonl`) — seuil ≥ 85 %.

Vision native Ministral 3 : utile plus tard pour scans ; **en v5 le chemin critique reste OCR/code + texte en contexte** (prévisible, testable, pas de PII réelle en train).

## Perf cible

| Métrique | Seuil |
|----------|------:|
| Flux **par user** | ≥ **50–60 tok/s** constant (pas un burst ponctuel) |
| Docs en contexte | OK si chunks + ctx borné ; ne pas casser le tok/s/user |
| Qualité | gold FR + multilang + docs gates inchangés / améliorés |

Hypothèse laptop 16 Go (à **mesurer**) :

| Track | 1 user @ 50–60 t/s | Multi-user iso-SLA |
|-------|--------------------|--------------------|
| **V5A 8B** | Probable (NVFP4/TRT) | ~2–3 users si marge KV |
| **V5B 14B** | Possible 1 user ; multi plus dur | Souvent **1 user/GPU** ou scale |

Scale ultérieur (1→2→3 GPU) : [`SCALE-CAPACITY-V5.md`](SCALE-CAPACITY-V5.md).  
Décision A vs B : [`COMPARE-V5A-V5B.md`](COMPARE-V5A-V5B.md).

## Fichiers

| Fichier | Rôle |
|---------|------|
| [`../configs/model_v5a.yaml`](../configs/model_v5a.yaml) | 8B vitesse |
| [`../configs/model_v5b.yaml`](../configs/model_v5b.yaml) | 14B qualité |
| [`../training/run_train_v5.ps1`](../training/run_train_v5.ps1) | `-Variant A` ou `B` |
| [`build_instruct_v5.py`](build_instruct_v5.py) | Mix commun + docs |
| [`download_v5.py`](download_v5.py) | → raw/v4 |
| [`../serving/LOCAL-V5.md`](../serving/LOCAL-V5.md) | Serve A/B |

## Checklist

- [ ] Train smoke A puis B (`-MaxSteps 20`)
- [ ] Full train A + B, export GGUF
- [ ] `run_docs` + `run_quality` + `run_skills` sur chaque track
- [ ] Bench tok/s/**user** avec prompt docs (contexte chargé)
- [ ] Remplir matrice [`COMPARE-V5A-V5B.md`](COMPARE-V5A-V5B.md) → go track
