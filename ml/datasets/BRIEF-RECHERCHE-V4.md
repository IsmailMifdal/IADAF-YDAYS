# Brief recherche — fine-tune IADAF **v4**

> Objectif de ce document : préparer une **recherche avancée** (Gemini DeepResearch + Hugging Face) pour trouver **datasets** et **skills** à intégrer avant le train QLoRA **v4**.  
> Prompt collable : [`GEMINI-DEEPRESEARCH-V4.md`](GEMINI-DEEPRESEARCH-V4.md) · Rapport à remplir : [`RAPPORT-DEEPRESEARCH-V4.md`](RAPPORT-DEEPRESEARCH-V4.md)  
> Héritage v3 : [`RAPPORT-DEEPRESEARCH-V3-QUALITE.md`](RAPPORT-DEEPRESEARCH-V3-QUALITE.md) · [`SOURCES.md`](SOURCES.md)

**Phase actuelle :** recherche uniquement (pas d’ingest, pas de train).  
**Cible ML :** `lora_v4` → GGUF Q4_K_M + export NVFP4, base type **Qwen3-8B**, hardware **RTX 5080 16 Go**, serving **100 % local**.

---

## 1. Objectif produit v4

Renforcer la qualité du modèle sur :

1. **Multilang** FR / EN / AR / ES (AR prioritaire)
2. **Documents & pré-vérification** (explication des checks, pas validation LLM)
3. **Comportement** : anti–faux-refus + vrais refus hors-scope
4. **Packs faibles** : surtout **carte grise / ANTS**

Sans régresser le gold FR déjà saturé en v3.1.

### Architecture non négociable

| Couche | Rôle |
|--------|------|
| **Code** | IBAN, MRZ, dates, formats, checklist dossier — source de vérité |
| **RAG** | Fiches, faits à jour, montants/délais/CERFA — citation `[Source: URL]` |
| **Poids (LoRA v4)** | Style, follow-context, multilang, refus calibrés, explication checks, tool JSON |

Principe docs : **extraction (OCR/VL) ≠ validation** — le LLM n’invente pas un IBAN « valide ».

---

## 2. Baseline v3.1 (faits mesurés)

### Bancs qualité

| Banc | Score | Seuil |
|------|------:|------:|
| Qualité ai-service | **108/108** | ≥ 90 % |
| Qualité prodlike | 105/108 (97,2 %) | — |
| Hit@3 RAG | **102/102** | ≥ 90 % |
| Skills déterministes | **15/15** | 100 % |
| Docs gold (`documents_v2`) | **11/12** (KO `d002` expiration) | ≥ 85 % |
| Scénarios réels | **20/20** | ≥ 18 |
| Smoke | 3/3 | — |

Artefacts : `ml/serving/RELEASE-V3.1.md`, `ml/artifacts/results/current/`.

### Matrice multilang — gap prioritaire v4

**69/92 (75 %)** — `ml/artifacts/results/current/eval_multilang_matrix.json`  
Script : `python ml/eval/run_multilang.py` (+ `--include-gold`).

| Langue | Score | Pack / élément critique |
|--------|------:|-------------------------|
| EN | 20/23 | AME EN parfois raté |
| FR | 19/23 | urgences, APL, carte grise (faux refus) |
| ES | 17/23 | séjour 964 h, refuse_bourse non respecté |
| **AR** | **13/23** | fragile (séjour, CPAM, APL, langues, ANTS) |
| **carte-grise** | **0/4** | faux refus FR/EN/AR ; ES contenu faux (préfecture ≠ ANTS) |
| documents | 10/12 | scan_flou EN/AR |
| titre-sejour | 12/16 | ES/AR renouvellement + travail étudiant |

**Diagnostic comportemental (pas scoring) :**

- Faux refus : le modèle émet le template « hors périmètre / illégal » sur des sujets **in-scope** (carte grise, urgences, APL). Le banc multilang tape le LLM en direct → mal **génératif / SFT**, pas seulement le router skills.
- Vrais refus ratés : `refuse_bourse` ES/AR conseille l’investissement au lieu de refuser.
- Contenu faux : AR « pas de travail étudiant » ; langues IADAF « FR only » ; carte grise ES → préfecture.
- Infra : erreurs RAG `sentence_transformers` ont pollué certains contextes (ops Phase 2).

### Stack runtime v3.1

- LoRA `lora_v3_1` (r=32, α=64) · GGUF Q4_K_M · NVFP4 TRT-LLM
- Skills : `qa` | `checklist` | `precheck` | `prefill` | `refuse`
- Docs pipeline : `ai-service/app/documents/` (qualité → OCR optionnel → règles)
- Chemins : `chemins/registry.json` (séjour, Ameli, CAF, impôts, permis, carte grise)

### Perf (contrainte hardware, pas levier qualité)

QoS ≥ 60 tok/s/user ≈ **2–3 users** (RTX 5080 16 Go). Ne pas confondre avec burst agrégé TRT.

---

## 3. Upgrades qualité v4 (P1 → P4)

### P1 — Comportement

| Upgrade | Détail | Data / skills recherchés |
|---------|--------|---------------------------|
| Anti–faux-refus | Allowlist in-scope : carte grise/ANTS, urgences 15/17/18/112, APL/CAF, CPAM/AME, permis | SFT « répondre, ne pas refuser » ×4 langues + patches KB |
| Vrais refus | Bourse / trading / levier | Safety refusals FR/EN/ES/AR + élargissement skill `refuse` |
| AR d’abord | Glossaire + grounded FR→AR admin | Datasets multi **admin**, pas Aya chat générique seul |
| Carte grise / ANTS | Fiches + URL `immatriculation.ants.gouv.fr` | Corpus ANTS / immatriculation grounded |

### P2 — Docs & pré-vérification

| Upgrade | Détail | Data / skills |
|---------|--------|---------------|
| Expliquer les checks | Expiration → ANEF/récépissé ; flou → rephoto ; Vitale ≠ domicile | SFT `dossier_state` / precheck |
| Code-first figé | IBAN/MRZ/dates = règles | Étendre skills déterministes si besoin ; **pas** LoRA juge |
| VL/OCR synth | Typst/CERFA, schemas document-ia ; ≥ 3k avant VL critique | DocVQA open / synth maison |
| Gold docs élargi | MRZ, IBAN, multi-chemins, formats | Eval + SFT (au-delà de 12 cas) |

### P3 — Data / archi train

- **RAG-First** : montants, délais, CERFA **hors poids**
- **Mix SFT v4** : upsample KO matrice + multilang + anti-sur-refus (xstest-like) + grounded citation
- **Delta only** : ne pas rediscourir SRC-01→32 déjà listés en v3 qualité — chercher le **complément** v4
- **Anti-régression** : qualité FR ≥ 90 % (cible ~100 %) + Hit@3

### P4 — Gates de succès v4

| Gate | Cible |
|------|------:|
| Matrice multilang | ≥ **90 %** |
| carte-grise | **4/4** |
| AR | ≥ **18/23** |
| Qualité FR ai-service | ≥ **90 %** (cible ~100 %) |
| Docs (gold élargi) | ≥ **85 %** |
| Skills | ≥ **15/15** |
| Hit@3 / scénarios | pas de régression |

### Hors priorité v4 (ne pas rechercher comme levier principal)

- VL live en prod avant volume synth suffisant
- Fine-tune pour « valider » IBAN/MRZ
- Optimisation burst tok/s agrégé comme proxy de qualité admin

---

## 4. Skills : actuel vs recherché

### Actuel (`ai-service/app/skills/`)

| Skill | LLM ? | Rôle |
|-------|:-----:|------|
| `qa` | Oui | Chat grounded + état dossier |
| `checklist` | Non | Pièces manquantes vs chemin |
| `precheck` | Non | Hint qualité → contrôles code |
| `prefill` | Non | Récap champs masqués ; `submit_allowed=false` |
| `refuse` | Non | Intentions illégales / dangereuses |

### Skills / capacités à rechercher pour v4

| Capacité | Type | Notes |
|----------|------|-------|
| Allowlist in-scope (anti–faux-refus) | SFT + prompt (+ éventuellement règles router) | Carte grise, urgences, APL… |
| Refus finance/bourse multilang | Safety + router `_REFUSE` | ES/AR aujourd’hui KO |
| Explication checks docs | SFT | Aligné messages `rules.py` |
| Extraction champs → JSON | SFT / VL | Validation **toujours** code |
| Tool-calling `dossier_state` | SFT JSON | Pro / multi-pièces |
| Prefill / checklist multilingue | Code + SFT glossaire | Messages FR/EN/AR/ES |
| precheck multi-langue | Code messages + SFT | Même verdict, langue adaptée |

**Règle :** tout ce qui décide « conforme / non conforme » reste **déterministe**.

---

## 5. Buckets dataset — delta v4 (à trouver)

Ne pas redemander comme « nouvelles » les sources déjà dans [`RAPPORT-DEEPRESEARCH-V3-QUALITE.md`](RAPPORT-DEEPRESEARCH-V3-QUALITE.md) (SRC-01→32) sauf **sous-exploitation** claire.

| Bucket | Priorité | Usage | Exemples de besoins |
|--------|----------|-------|---------------------|
| Multilang admin AR (+ ES) | P0 | SFT / RAG | Paires Q/R admin FR↔AR, glossaires UE/IATE échantillon |
| Anti–faux-refus + in-scope | P0 | SFT | Variantes carte grise, urgences, APL, AME EN |
| Vrais refus finance | P0 | Safety | Bourse/trading/levier ×4 langues |
| ANTS / carte grise / immatriculation | P0 | RAG + SFT grounded | Fiches officielles, CERFA véhicule |
| Docs / DocVQA / CERFA-Typst | P1 | VL / SFT | Synth ≥ 3k ; schemas betagouv/document-ia |
| Explication précheck | P1 | SFT | Aligné gold docs + `dossier_state.jsonl` |
| Anti-sur-refus (xstest-like) | P1 | Eval + SFT | Éviter refus sur admin légitime |
| Grounded citation | P1 | SFT | Renforcer follow-RAG sans mémoriser montants |
| Pro tool-calling | P2 | SFT | OpenAPI déjà listé v3 — delta si manquant |

Pour chaque source trouvée : **URL · licence · volume · format · usage (RAG/SFT/VL/eval) · P0–P3 · AIPD · intégration**.

---

## 6. Contraintes AIPD & licences

**Interdit**

- Pièces d’identité / dossiers usagers réels
- Forums ©, doctrine GISTI/Cimade en texte intégral
- Datasets gated sans alternative ouverte
- Jurisprudence non anonymisée en train prod

**OK**

- Licence Ouverte / Apache / MIT / CC-BY (selon usage commercial)
- Synth Typst / CERFA / Faker
- Eval-only pour licences NC (BSARD, FQuAD variants, etc.)

Serving usager : **aucun** LLM cloud obligatoire.

---

## 7. Déjà couvert (ne pas rediscourir)

Voir SRC-01→32 dans le rapport v3 qualité, notamment :

- AgentPublic / yssf-io service-public, DILA, CESEDA, legalkit  
- Aya (filtré), PIAF, FQuAD, Aegis, WildGuard (gated)  
- IATE, OpenAPI Entreprise/RNE, CERFA/Typst (cible ≥ 3k)  
- Gold IADAF, `quality_kb_patches`, `safety_refusals_v3`, `dossier_state`

La recherche v4 doit produire un **delta** actionnable (nouvelles cartes HF, sous-sets AR admin, ANTS, anti-sur-refus, DocVQA).

---

## 8. Critères de succès de la *recherche* (Phase 1)

Un bon rapport Gemini v4 contient :

1. Tableau maître **delta** (≥ 15 sources nouvelles ou sous-exploitées) avec licences  
2. Mapping explicite **upgrade P1–P4 → sources → bucket SFT**  
3. Recette **mix SFT v4** chiffrée (ordre de grandeur réaliste QLoRA 8B / 16 Go)  
4. Liste skills : déterministe vs LoRA  
5. Plan d’intégration ordonné jusqu’au train `lora_v4` + gates P4  
6. Zéro recommandation de pièces usagers réelles  

---

## 9. Suite après DeepResearch (Phase 2 — hors ce brief)

1. Remplir [`RAPPORT-DEEPRESEARCH-V4.md`](RAPPORT-DEEPRESEARCH-V4.md)  
2. `download_v4` / builders → `instruct_train_v4`  
3. Skills/règles code si retenus  
4. Train QLoRA (`configs/model_v4.yaml`, `lora_v4`) + export GGUF/NVFP4  
5. Eval : `run_quality`, `run_docs`, `run_multilang`, `run_skills`, scénarios — gates P4  
6. Fix ops RAG eval (`sentence_transformers`) si besoin  

Relance eval multilang :

```powershell
python ml/eval/run_multilang.py
python ml/eval/run_multilang.py --include-gold
```
