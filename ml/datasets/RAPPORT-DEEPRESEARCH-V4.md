# Rapport — IADAF ML **v4** (Deep Research)

> **Statut :** rempli (sortie Gemini Deep Research intégrée — licences à revalider étape 1 avant ingest).  
> Prompt : [`GEMINI-DEEPRESEARCH-V4.md`](GEMINI-DEEPRESEARCH-V4.md) · Brief : [`BRIEF-RECHERCHE-V4.md`](BRIEF-RECHERCHE-V4.md)  
> Héritage : [`RAPPORT-DEEPRESEARCH-V3-QUALITE.md`](RAPPORT-DEEPRESEARCH-V3-QUALITE.md) (SRC-01→32 — ne pas recopier)

**Vérifier URL + licence avant tout ingest.** Serving usager = **100 % local**.

---

## 0. Checklist avant train

- [x] Synthèse Gemini intégrée (executive summary + tableaux)
- [ ] Revalider chaque URL HF / GitHub / data.gouv (étape 1 AIPD)
- [x] Marquer licences NC → eval only (déjà listé §8)
- [x] Confirmer **delta** vs SRC-01→32
- [x] Mapper chaque source retenue à un upgrade P1–P4 (§3)
- [x] Mettre à jour [`SOURCES.md`](SOURCES.md) section v4 (delta retenu)
- [ ] Décider go/no-go train v4 (§7) — après download HF P0 + mix ~32k

**Scaffold déjà en dépôt :** `download_v4.py`, `build_instruct_v4.py`, curated v4, skills allowlist/finance/ANTS, `model_v4.yaml`, `run_train_v4.ps1`, `documents_v3.jsonl` (35), skills **22/22**.

---

## 1. Executive summary

La v4 comble l’écart entre une **v3.1 solide sur le français** (108/108) mais **fragile en multilingue** (75 %, carte grise 0/4, AR 13/23, faux refus sur démarches légales et fuites ES/AR sur le trading) et les **gates de release** cibles (≥ 90 % multilingue, AR ≥ 18/23, carte grise 4/4, docs ≥ 85 %, skills ≥ 15/15) **sans régresser** sur le gold FR.

Le **mix SFT v4** retenu : **32 000** exemples en QLoRA sur **Qwen3-8B** (RTX 5080 16 Go), avec **14,0 %** de replay gold FR, upsampling **×5** des KO matrice, et **10 sources delta prioritaires** :

1. `moncefem/legi-instruct-fr`
2. `AmazonScience/FalseReject`
3. `bench-llm/or-bench`
4. `DAMO-NLP-SG/MultiJail`
5. `ToxicityPrompts/PolyGuardPrompts`
6. `CohereLabs/aya_redteaming`
7. `miracl/nomiracl`
8. `Helsinki-NLP/un_pc`
9. Pack officiel DILA/ANTS (simulateur coût carte grise + `immatriculation.ants.gouv.fr`)
10. Forge synthétique `sparkfish/augraphy` + `betagouv/document-ia`

**Trois changements non négociables :**

1. **RAG-First + Allowlist code-first** (règles, tarifs ANTS et périmètre légal **hors poids**)
2. **Séparation extraction / validation / explication** (le code valide IBAN/MRZ/dates ; la LoRA explique en FR/EN/AR/ES)
3. **Zéro pièce usager réelle** et **zéro licence NC** en entraînement

**Mapping chantiers :** P1 (allowlist, refus finance, ANTS, AR grounded) → P2 (explication precheck, ≥ 3 000 docs synth) → P3 (mix delta 32k + replay FR) → P4 (gates bloquants locaux).

**Manques assumés :** aucun dataset public ouvert de QA admin FR **nativement en arabe**, ni de corpus multilingue dédié aux refus bourse/levier — à combler par **gabarits synthétiques grounded** sur fiches publiques FR.

---

## 2. Tableau maître sources delta

| ID | Nom | URL | Licence | Format | Usage | Domaine | Volume | Prio | AIPD | Intégration IADAF | Nouveau? |
|----|-----|-----|---------|--------|-------|---------|--------|------|------|-------------------|----------|
| DELTA-01 | moncefem/legi-instruct-fr | https://huggingface.co/datasets/moncefem/legi-instruct-fr | Apache-2.0 | JSON/Parquet | SFT | Droit FR, citation, abstention, tools | 27 357 lignes | P0 | OK | Extraire citation (~2k), abstention (`no_answer`, `wrong_date`), tools (~3,7k) | Oui |
| DELTA-02 | AmazonScience/FalseReject | https://huggingface.co/datasets/AmazonScience/FalseReject | CC-BY (à confirmer) | HF Dataset | SFT + Eval | Anti-sur-refus | 15 800 | P0 | OK | Adapter requêtes bénignes → FR/EN/AR/ES | Oui |
| DELTA-03 | bench-llm/or-bench | https://huggingface.co/datasets/bench-llm/or-bench | CC-BY-4.0 | CSV / HF | SFT + Eval | Over-refusal | 82,3k (hard-1k : 1k) | P0 | OK | Exclure `or-bench-toxic-all` ; calibrer frontière admin sensible | Oui |
| DELTA-04 | allenai/coconot | https://huggingface.co/datasets/allenai/coconot | ODC-BY | Parquet | SFT + Eval | Non-compliance contextuelle | 10k–100k | P1 | OK | Distinguer refus strict / incomplet / réponse encadrée | Oui |
| DELTA-05 | walledai/XSTest | https://huggingface.co/datasets/walledai/XSTest | CC-BY-4.0 (prompts) | HF Dataset | Eval | Calibration faux refus | 450 prompts | P1 | Exclure completions tierces | Holdout allowlist IADAF | Oui |
| DELTA-06 | DAMO-NLP-SG/MultiJail | https://huggingface.co/datasets/DAMO-NLP-SG/MultiJail | MIT | HF Dataset | SFT + Eval | Jailbreaks multi (AR) | — | P0 | OK | Aligner attaques AR/ES/EN → templates refus | Oui |
| DELTA-07 | ToxicityPrompts/PolyGuardPrompts | https://huggingface.co/datasets/ToxicityPrompts/PolyGuardPrompts | CC-BY-4.0 | HF Dataset | SFT + Eval | Modération multi (17 langues dont AR) | — | P0 | OK | Extraire `polyguard_ar` + paires multi | Oui |
| DELTA-08 | CohereLabs/aya_redteaming | https://huggingface.co/datasets/CohereLabs/aya_redteaming | Apache-2.0 | JSONL | SFT + Eval | Red-teaming multi | — | P1 | OK | Compléter refus ES/AR + synth `refuse_bourse` | Oui |
| DELTA-09 | ToxicityPrompts/XSafety | https://huggingface.co/datasets/ToxicityPrompts/XSafety | ODC-By 1.0 | HF Dataset | Eval / SFT | Safety multi | — | P2 | OK | Non-régression safety post anti–faux-refus | Oui |
| DELTA-10 | miracl/nomiracl (+ corpus) | https://huggingface.co/datasets/miracl/nomiracl | Apache-2.0 | HF Dataset | SFT + RAG Eval | Abstention / retrieval multi | 77,2M passages (corpus) | P0 | OK | Abstention grounded AR sans faux « not in context » | Oui |
| DELTA-11 | Helsinki-NLP/un_pc | https://huggingface.co/datasets/Helsinki-NLP/un_pc | UN (attribution) | Corpus parallèle | RAG / Glossaire / SFT | Parallèle AR/FR/ES/EN | Docs ONU 1990–2014 | P1 | OK + mention UN | Terminologie juridique/admin FR↔AR/ES | Oui |
| DELTA-12 | fr3on/eg-legal-instruction-following | https://huggingface.co/datasets/fr3on/eg-legal-instruction-following | Apache-2.0 | HF Dataset | SFT (registre AR) | Instructions juridiques AR | 4 184 | P2 | OK — **ne pas** injecter droit égyptien en RAG | Syntaxe admin AR + mots-clés | Oui |
| DELTA-13 | University-of-Dubai/arabic-legal-text | https://huggingface.co/datasets/University-of-Dubai/arabic-legal-text | CC-BY-4.0 | HF Dataset | SFT (lexique AR) | Textes juridiques AR | — | P3 | OK registre seul | Réserve lexicale AR formel | Oui |
| DELTA-14 | Simulateur coût carte grise (DILA) | https://www.data.gouv.fr/datasets/simulateur-de-cout-du-certificat-dimmatriculation-carte-grise | Licence Ouverte | XML/XSD/JSON | RAG + Skill code + SFT synth | Carte grise | Référentiel DILA (MAJ 17/11/2026) | P0 | OK | Skill calculateur + QA 4 langues | Oui |
| DELTA-15 | Formulaires CERFA Service-Public | https://www.data.gouv.fr/datasets/formulaires-cerfa-de-service-public-gouv-fr | DILA / attribution | Catalogue / PDF | RAG + Typst/CERFA | Formulaires FR | Catalogue officiel | P1 | OK | Index CERFA hors poids + gabarits vierges | Sous-exploité |
| DELTA-16 | Portails ANTS / Ameli EN / CLEISS | https://immatriculation.ants.gouv.fr/ (+ ameli / cleiss) | Contenus État (à vérifier) | HTML→MD/JSON | RAG + SFT grounded | Immat., Ameli EN, social ES/EN | Fiches officielles | P0 | OK sites officiels | Corriger carte-grise 0/4, AME EN, FranceConnect | Oui |
| DELTA-17 | Archangel-system/glaive-function-calling-v2-openai-native | https://huggingface.co/datasets/Archangel-system/glaive-function-calling-v2-openai-native | Apache-2.0 | JSONL/Parquet | SFT | Tool-calling typé | 43 476 | P1 | OK | `dossier_state` + `tool_declined` (adapter FR/AR/ES) | Oui |
| DELTA-18 | wandb/RAGTruth-processed | https://huggingface.co/datasets/wandb/RAGTruth-processed | MIT | HF Dataset | SFT + Eval | Hallucination RAG | — | P1 | OK | Fidélité stricte au contexte | Oui |
| DELTA-19 | sparkfish/augraphy + djo33350/french-synthetic-document-test-samples | https://github.com/sparkfish/augraphy | MIT / CC-BY-4.0 | Lib + PDF/JSON | Pipeline VL/OCR + Eval | Scans FR synth | Lib + &lt;1k samples | P0 | OK 100 % synth | ≥ 3 000 justificatifs bruités | Oui |
| DELTA-20 | nvidia/OCR-Synthetic-Multilingual-v1 | https://huggingface.co/datasets/nvidia/OCR-Synthetic-Multilingual-v1 | CC-BY-4.0 | HDF5 | Pipeline VL/OCR | OCR multi SynthDoG | 10M–100M | P2 | OK | Schéma line_bboxes / reading order + subset EN | Oui |
| DELTA-21 | betagouv/document-ia | https://github.com/betagouv/document-ia | Open (vérifier fichier) | Python / JSON Schemas | Code + Eval | Schémas carte_grise, domicile | Schemas + evals | P0 | OK zéro PII | Aligner JSON extraction avant validation code | Sous-exploité |
| DELTA-22 | facebook/belebele | https://huggingface.co/datasets/facebook/belebele | CC-BY-SA-4.0 | HF Dataset | **Eval only** | Compréhension AR/FR/ES/EN | — | P2 | ShareAlike | Mesurer AR/ES **sans** contaminer SFT | Oui |

**Réserve secondaire (audit licence étape 1) :** `OpenLLM-France/Luciole-PostTraining-Dataset-1.1` (multi FR/EN/ES/AR).  
**RAG léger permis :** [centres d’examen permis](https://www.data.gouv.fr/datasets/centre-dexamen-du-permis-de-conduire) — hors poids.

---

## 3. Mapping upgrades → sources → skills → gates

| Upgrade | Sources delta | Skills | Gate |
|---------|---------------|--------|------|
| **P1** Anti–faux-refus | FalseReject, or-bench, coconot, XSTest (eval), synth allowlist | `skill_allowlist_scope` (déterministe) + LoRA | 0 faux refus carte grise (4/4), urgences FR, APL FR/AR ; faux refus globaux &lt; 2 % |
| **P1** Vrais refus finance | MultiJail, PolyGuard, aya_redteaming, XSafety, synth `refuse_bourse` | `skill_refuse` (finance) | 100 % refus `refuse_bourse` FR/EN/AR/ES |
| **P1** AR + ANTS/Ameli | nomiracl, un_pc, eg-legal (registre), DILA simulateur, ANTS, ameli EN, CLEISS | `skill_ants_cost_and_route` + `qa` | Multilang ≥ 90 % ; AR ≥ 18/23 ; carte-grise 4/4 ; 964 h / ~60 % ; AME EN |
| **P2** Docs / precheck | document-ia, augraphy, djo33350, CERFA DILA + Typst | `skill_precheck_validate` + `skill_extract_fields_json` + `skill_explain_precheck` | Docs ≥ 85 % ; ≥ 3 000 paires synth |
| **P3** RAG-First + mix | legi-instruct-fr, RAGTruth, glaive, replay gold v3 | `skill_checklist_prefill_ml` + `qa` | FR ≥ 90 % (cible 108/108) ; Hit@3 100 % ; scénarios 20/20 |
| **P4** Release | Holdout FR + matrice + belebele + docs élargi | Tous skills ≥ 15/15 | `run_multilang` + `run_quality` + `run_docs` + `run_skills` |

---

## 4. Mix SFT v4 et hyperparams QLoRA 16 Go

**Volume retenu : 32 000** exemples. Train depuis **base Qwen3-8B** (pas stack LoRA sur v3.1), avec **14 %** replay FR stratifié.

| Bucket | Volume | % | Sources | Règle qualité | Upgrade |
|--------|-------:|---|---------|---------------|---------|
| 1. Anti–faux-refus & allowlist | 4 000 | 12,5 % | FalseReject, or-bench (hard-1k), coconot, synth allowlist ×4 langues | Aucun template refus sur démarche autorisée | P1 |
| 2. Safety refus multi & finance | 2 560 | 8,0 % | MultiJail, PolyGuard, aya_redteaming, synth `refuse_bourse` | Refus ferme sans trading/levier | P1 |
| 3. Grounded RAG citation & abstention | 6 400 | 20,0 % | legi-instruct-fr, nomiracl, RAGTruth, fiches ANTS/Ameli | Citation `[S#]` ; abstention si vide/périmé | P1/P3 |
| 4. Admin multilang (AR prioritaire) | 6 080 | 19,0 % | un_pc, eg-legal (registre), QA grounded SP/ANTS/Ameli/CLEISS — AR 50 % · ES 30 % · EN 20 % | Pas de droit étranger ; 964 h / ~60 % depuis RAG | P1/P3 |
| 5. Upsample KO matrice ×5 | 3 200 | 10,0 % | Synth grounded patches KB (carte_grise×4, urgences, apl, ame_en, séjour étudiant, refuse_bourse, scan_flou, langues, anef_vs_ants) | Paraphrases + relecture 100 % gabarits | P1/P2/P4 |
| 6. Explication docs & precheck | 3 360 | 10,5 % | Sorties `precheck_validate` + document-ia + Typst/augraphy | LLM **n’évalue pas** IBAN/MRZ — traduit codes erreur | P2 |
| 7. Tool-calling & `dossier_state` | 1 920 | 6,0 % | glaive (tool_call + declined), legi tools, schémas v4 | JSON Schema strict ; 0 outil non déclaré | P2/P3 |
| 8. Replay gold FR v3 | 4 480 | 14,0 % | Échantillon v3 hors holdout | Zéro chevauchement `questions_v1` / `documents_v2` | P3/P4 |
| **Total** | **32 000** | **100 %** | Dédup exacte/sémantique ; 0 PII | | P1–P4 |

**Pas d’optimisation :** batch effectif 16 (2 × accum 8) × 2 epochs = **4 000** steps.

| Paramètre | v4 | Justification |
|-----------|-----|---------------|
| Quant base | NF4 4-bit double quant, compute bf16 | Budget activations 16 Go |
| LoRA | r=32, α=64, dropout=0.05 | Aligné v3.1 |
| Modules | all-linear (q,k,v,o,gate,up,down) | Multilang + JSON |
| Batch / seq | bs=2, accum=8, max_seq=2048 | + gradient_checkpointing, paged_adamw_8bit |
| Optim | lr=**1e-4**, cosine, warmup=0.05, **2 epochs** | Limite oubli gold FR (vs 1.5e-4 v3.1) |

---

## 5. Skills blueprint

| Skill | Déterministe vs LoRA | Entrée → Sortie | Upgrade | Risque | Effort |
|-------|----------------------|-----------------|---------|--------|--------|
| `skill_allowlist_scope` | **Déterministe** (regex ×4 langues) | Requête → `in_scope_allowed` (carte_grise, urgences, apl, ame, permis) | P1 | Intent mixte permis+illicite → contrôle secondaire | Faible |
| `skill_refuse` (finance) | **Hybride** lexique + LoRA | → `{refuse, reason_code: finance_advice, lang}` | P1 | Faux + sur questions fiscales → exclusion impôts | Faible |
| `skill_ants_cost_and_route` | **Déterministe** XML/JSON DILA | Params véhicule → coût + lien ANTS | P1 | Dérive tarifs → maj JSON hors poids | Moyen |
| `skill_precheck_validate` | **100 % code** | Champs + métadonnées image → `{valid, errors[]}` | P2 | Bruit OCR → `UNREADABLE_BLUR` | Moyen |
| `skill_extract_fields_json` | VL/OCR → JSON document-ia | Image → JSON brut (non validé) | P2 | Hallucination flou → confiance / null | Élevé |
| `skill_explain_precheck` | **LoRA** | JSON erreurs + langue → explication + next step | P2 | Citer uniquement `error_codes` | Moyen |
| `skill_checklist_prefill_ml` | Hybride checklist + LoRA | `dossier_state` + langue → checklist / prefill | P1/P2 | Garder noms pièces FR entre parenthèses | Moyen |

**Reste 100 % code-only :** IBAN checksum, MRZ, dates/délais, taxes carte grise DILA, JSON Schema `dossier_state`, métriques flou/résolution, allowlist pré-routage.

---

## 6. Pipeline docs safe

- **0** pièce usager réelle (AIPD)
- Seuil bloquant : **≥ 3 000** paires synth annotées avant VL/OCR sur chemin critique
- Génération : **Typst** (factures, quittances, hébergement, Vitale factice, titres/passeports MRZ algo) + CERFA DILA vierges
- Schémas : `betagouv/document-ia` (`carte_grise`, `justificatif_domicile`) + structure nvidia OCR (bboxes)
- Dégradation : **augraphy** (flou, sous-exposition, ombres, rognage, JPEG)
- Contrôle externe : `djo33350/french-synthetic-document-test-samples` ; HumynLabs PDF = **eval mise en page only**

**Répartition 3 000 paires :**

| Type | N | Effet |
|------|--:|-------|
| Valides multi-gabarits | 1 000 | Éviter faux rejets |
| Scans dégradés | 800 | Consigne rephoto |
| Titres expirés ± récépissé | 600 | Piste ANEF/récépissé |
| Erreurs structurelles | 600 | Vitale≠domicile, IBAN invalide, MRZ tronquée |

**Eval :** étendre `documents_v2` (12) → **`documents_v3` (≥ 35)** — MRZ, IBAN, multi-chemins, scan_flou EN/AR.

---

## 7. Checklist go/no-go avant train release v4

1. [ ] Téléchargement + audit AIPD/licences (bloquer NC, SA hors eval, non vérifié ; 0 PII)
2. [ ] Builders → `instruct_train_v4.jsonl` (8 buckets, 32k, dédup, séparation holdout)
3. [ ] Patches KB + rebuild RAG (ANTS, DILA carte grise, ameli EN, CLEISS) ; Hit@3 = 100 %
4. [ ] Skills code : allowlist, refuse finance, ants_cost, precheck multi-chemins
5. [ ] Train QLoRA v4 (2 epochs, r=32, α=64, lr=1e-4, seq=2048) — suivre val loss FR + AR
6. [ ] Export GGUF Q4_K_M + NVFP4 — smoke 100 % local
7. [ ] Gates bloquants :

| Commande | Seuil v4 | Non-régression |
|----------|----------|----------------|
| `run_multilang` | ≥ 90 % (≥ 83/92) ; carte-grise **4/4** ; AR ≥ **18/23** | 0 fuite `refuse_bourse` ES/AR ; 0 faux refus urgences/apl |
| `run_quality` | FR ≥ 90 % (cible 108/108) | Hit@3 100 % ; scénarios 20/20 |
| `run_docs` | Gold élargi ≥ 85 % | IBAN/MRZ/dates code 100 % ; scan_flou EN/AR |
| `run_skills` | ≥ 15/15 | Finance + allowlist déclenchés |

```powershell
python ml/eval/run_skills.py
python ml/eval/run_rag_hit.py
python ml/eval/run_quality.py --target ai-service
python ml/eval/run_docs.py
python ml/eval/run_scenarios_reels.py
python ml/eval/run_multilang.py
python ml/eval/run_multilang.py --include-gold
```

---

## 8. Rejets et alertes licence

| Source | Motif | Décision |
|--------|-------|----------|
| PKU-Alignment/BeaverTails (& IT) | cc-by-nc-4.0 | **Rejeté** train (→ PolyGuard) |
| giskardai/do-not-answer-scenarios | CC-BY-NC-SA-4.0 | **Rejeté** train |
| indrehus/docvqa-… / Nemotron DocVQA | Gated / recherche | **Rejeté** |
| rogerdehe/xfund | licence `other` | **Rejeté** |
| Salesforce/xlam-function-calling-60k | Gated | Écarté → glaive Apache-2.0 |
| facebook/belebele ; HasanOJ/ppqa-… | CC-BY-SA | **Eval only** |
| artefactory/Argimi-Legal-French-Jurisprudence | RGPD / licence | **Rejeté** SFT |
| jpacifico/merged-admin-def-16k ; MBZUAI-Paris/DarijaBench | Licence absente | **Quarantaine** |
| HumynLabs/French_Documents_Dataset_PDF | Exclusion usage commercial © | **Eval mise en page only** |
| Forums, doctrine ©, pièces réelles, GISTI/Cimade texte | AIPD / © | **Rejet strict** (liens seulement) |

---

## 9. Playbook Phase 2 — implémentation → train → test

> Démarrer après validation licences §0 / §7 étape 1.

### 9.1 Ingest

1. Créer `ml/datasets/download_v4.py` pour DELTA-01…22 retenus (P0 d’abord)
2. Builders → `processed/instruct_train_v4.jsonl` (8 buckets §4)
3. Synth allowlist + `refuse_bourse` ×4 langues + KO matrice ×5
4. Sync KB (ANTS, DILA, Ameli EN, CLEISS) + rebuild RAG
5. Pipeline docs : Typst + augraphy → ≥ 3k ; gold `documents_v3.jsonl` ≥ 35

### 9.2 Skills code

1. `skill_allowlist_scope` + extension finance `refuse`
2. `skill_ants_cost_and_route` (XML/JSON DILA)
3. Aligner `precheck` / schémas document-ia
4. `run_skills` ≥ 15/15 (+ cas finance & allowlist)

### 9.3 Train & export

1. `configs/model_v4.yaml` (base Qwen3-8B, r=32, α=64, lr=1e-4, 2 epochs)
2. Train → `artifacts/lora_v4/`
3. Export GGUF + NVFP4
4. Smoke local

### 9.4 Eval gates P4

Voir §7 — go release si tous seuils verts.

### 9.5 Ops

- `sentence_transformers` dans venv eval
- Résultats → `ml/artifacts/results/current/`

---

## 10. Prochaines étapes immédiates

1. Audit licence programmatique des DELTA P0 (FalseReject CC-BY exact, document-ia, sites État)
2. Scaffold `download_v4.py` + builders mix 32k
3. Implémenter skills allowlist / refuse finance / ants_cost
4. Train `lora_v4` puis gates
