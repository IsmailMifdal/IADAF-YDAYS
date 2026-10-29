# Rapport — IADAF ML v3 « Qualité Max » (post-échec v2)

> Source : Gemini Deep Research ([`GEMINI-DEEPRESEARCH-V3-QUALITE.md`](GEMINI-DEEPRESEARCH-V3-QUALITE.md)).  
> **Vérifier URL + licence avant ingest.** Serving usager = **100 % local** (pas d’API cloud).

Contexte mesuré v2 : qualité **62 %** · docs **50 %** · perf OK · ~6,4k SFT · VL 29 samples.

---

## 1. Executive summary

L’échec v2 vient d’une **mémorisation paramétrique** insuffisante (8B Q4, SFT trop petit) **sans ancrage contextuel**.  

V3 = **RAG-First** + SFT grounded + faits volatils hors poids + VL 100 % synthétique.

| Cible | Valeur |
|-------|--------|
| Qualité gold | ≥ 90 % |
| Docs | ≥ 85 % |
| Volume SFT | **~50 000** instructions |
| Inférence | Local GGUF / llama.cpp, &lt; 12 Go VRAM |
| Citation | Obligatoire `[Source: URL]` |

**3 non-négociables**

1. RAG-First + citation URL  
2. Montants / délais / CERFA → RAG ou code, **jamais inventés dans les poids**  
3. VL = Typst/CERFA synth uniquement + contrôle sur-refus (xstest)

**Top sources P0** : SRC-01 yssf-io/service-public · SRC-02 AgentPublic/service-public · SRC-10 evalap France Services · SRC-11 guillaumetell SFT · SRC-12 DILA-Vectors · SRC-23/24 OpenAPI Entreprise/RNE · SRC-25 IATE · SRC-26/27/28/29 safety · SRC-32 CERFA/Typst

---

## 2. Tableau maître (SRC-01 → SRC-32)

| ID | Nom | Usage | Domaine | Vol. approx. | Prio | Nouveau? | Notes |
|----|-----|-------|---------|--------------|------|----------|-------|
| SRC-01 | yssf-io/service-public | RAG / SFT | Admin particuliers | 5,5k fiches | P0 | Oui | Markdown complet, `has_content` |
| SRC-02 | AgentPublic/service-public | RAG | Admin | ~36k chunks | P0 | Non | Déjà partiel |
| SRC-03 | AgentPublic/legi | RAG | Codes | ~2,2M | P1 | Non | Hybride dense/sparse |
| SRC-04 | AgentPublic/travail-emploi | RAG | RH / travail | ~5,7k | P1 | Non | raw/v3 OK |
| SRC-05 | AgentPublic/dole | RAG | Législatif | ~4,4k | P2 | Non | raw/v3 OK |
| SRC-06 | AgentPublic/constit | RAG | Constit. | ~47k | P2 | Oui | |
| SRC-07 | AgentPublic/cnil | RAG / safety | RGPD | ~64k | P1 | Oui | |
| SRC-08 | local-administrations-directory | RAG / tools | Annuaires | ~86k | P1 | Oui | Tool-calling |
| SRC-09 | state-administrations-directory | RAG / tools | État | ~8k | P1 | Oui | |
| SRC-10 | evalap-mfs_tooling_v7-50 | SFT / eval | France Services | 50 Q | P0 | Oui | Calibration gold |
| SRC-11 | guillaumetell-7b (dataset pairs) | SFT grounded | Chat + citation | ~8,9k | P0 | Oui | Vérifier artefact exact HF |
| SRC-12 | AgentPublic/DILA-Vectors | RAG embed | BGE-M3 | ~2,5M | P0 | Oui | LanceDB local |
| SRC-13 | data-gouv-datasets-catalog | RAG meta | Catalogues | ~109k | P2 | Oui | |
| SRC-14 | albert-spp-8b | Bench | Comparatif | modèle | P2 | Oui | Eval, pas train obligatoire |
| SRC-15 | VinceGx33/legi-french-law-2025 | RAG | Légi 2025 | ~252 Mo | P1 | Oui | |
| SRC-16 | louisbrulenaudet/legalkit | SFT / RAG | Droit | ~53k | P2 | Non | raw/v3 |
| SRC-17 | bsard | **Eval** | Legal retrieval | ~137k | P1 | Non | ⚠ licence NC possible |
| SRC-18 | lleqa | SFT / eval | QA long | ~30k | P1 | Oui | ⚠ revalider licence usage |
| SRC-19 | HFforLegal/laws | RAG | UE | ~163k | P2 | Oui | |
| SRC-20 | HFforLegal/case-law | RAG | Jurisprudence | ~534k | P3 | Oui | Anonymisation / volumétrie |
| SRC-21 | PIAF | SFT | Extractive QA | ~3,8k | P1 | Non | |
| SRC-22 | FQuAD | SFT | Reading | ~25k | P1 | Non | ⚠ CC-BY-NC → usage commercial? |
| SRC-23 | API Entreprise OpenAPI | Tool-calling | Pro | OpenAPI | P0 | Oui | |
| SRC-24 | API RNE INPI | Tool-calling | Pro | Schemas | P0 | Oui | `dossier_state` |
| SRC-25 | IATE EU | Glossaire / SFT | Multi | 7M+ termes | P0 | Oui | FR/EN/AR/ES |
| SRC-26 | wildguardmix | Safety | Refusal | ~88k | P0 | Oui | gated sans HF token |
| SRC-27 | Aegis 2.0 | Safety | Refusal | ~50k | P0 | Non | raw/v3 aegis OK |
| SRC-28 | content-safety-guard-small | Safety | Anti sur-refus | ~60k | P0 | Oui | |
| SRC-29 | xstest-response | Eval safety | Sur-refus | 895 | P0 | Oui | |
| SRC-30 | aya_dataset | Multi SFT | Conversational | subsample | P1 | Non | raw/v3 filtré |
| SRC-31 | multilingual_safety_survey2025 | Eval multi | Safety | &lt;1k | P1 | Oui | |
| SRC-32 | CERFA + Typst | VL synth | Formulaires | 882+ | P0 | Oui | 0 PII usager |

URLs détaillées : rapport Gemini d’origine / cartes HF listées dans le prompt.

### Alertes licence (avant prod commerciale)

- **SRC-17 BSARD**, **SRC-22 FQuAD** : variantes NC → **eval / recherche** tant que non clarifié.  
- **SRC-18 LLeQA** : revalider conditions.  
- **SRC-26 WildGuard** : token HF + acceptation carte (fallback SRC-27 déjà en place).

---

## 3. Architecture local-only

```
[ Requête ]
    → Code (IBAN, SIRET, MRZ, dates)
    → RAG local (Chroma / LanceDB + BGE-M3)
    → Qwen3-8B QLoRA (raisonne + cite [Source: URL])
```

| Couche | Responsabilité |
|--------|----------------|
| **Poids** | Style, follow context, JSON/tools, refus, multi |
| **RAG** | Fiches, codes, annuaires, faits à jour |
| **Code** | IBAN/MRZ/SIRET, calendriers, liens timbres |

### Mix SFT cible (~50k)

| Bucket | Vol | % | Règle |
|--------|-----|---|--------|
| Gold upsamplé + paraphrases | 2 500 | 5 % | ≥ 25× / question gold |
| Grounded QA + URL | 20 000 | 40 % | Citation obligatoire ; refus hors contexte |
| Fiches → instruct | 10 000 | 20 % | Pas d’invention de délai |
| Glossaire anti-confusion | 5 000 | 10 % | IATE + termes §4 |
| Multilingue | 4 500 | 9 % | Termes FR non traduits (ANEF, CERFA…) |
| Safety + anti-sur-refus | 4 000 | 8 % | WildGuard/Aegis/xstest |
| Pro JSON / tools | 2 500 | 5 % | OpenAPI Entreprise / RNE |
| VL synth | 1 500–3 000 | 3 %+ | Typst/CERFA, schéma `dossier_state` |

### Hyperparams suggérés (rapport) vs dépôt actuel

| Param | Rapport Gemini | Config actuelle (`model.yaml`) | Action |
|-------|----------------|--------------------------------|--------|
| LoRA r | 64 | 16 | Essayer **32** puis 64 après pilote |
| alpha | 128 | 32 | Aligner avec r (ratio ~2) |
| max_seq | 4096 | 2048 | Monter si VRAM OK |
| epochs | 3 sur 50k | 2 | Après corpus prêt |
| LR | 1.5e-4 | 2e-4 | OK proche |

Ne pas changer `r` pendant un train en cours ; trancher après premier mix v3.

### Génération grounded (principe)

System : répondre **strictement** au contexte + `[Source: URL]` ; sinon renvoyer vers la fiche.  
Hard negatives : « prix du timbre pour X ? » → **jamais un chiffre inventé**, lien officiel.

---

## 4. Glossaire anti-hallu (extrait critique v2)

| Terme | Définition courte | Ne pas confondre |
|-------|-------------------|------------------|
| ANEF | Admin. numérique des étrangers (séjour) | ANTS / listes électorales |
| OFII | Immigration & intégration | OFPRA / préfecture |
| VLS-TS | Visa long séjour valant titre | Visa Schengen C |
| AME | Aide médicale État (irréguliers) | **PMA** / PUMa |
| PUMa | Protection universelle maladie | AME / C2S |
| APL / ALS / ALF | Aides logement (types distincts) | Les mélanger |
| RFR | Revenu fiscal de référence | Net imposable |
| Récépissé / API séjour / APS | Preuves / attestations distinctes | API informatique |
| CERFA | Formulaire n° officiel | Inventer un n° |
| Timbre fiscal | Taxe titre | **Inventer un montant** |
| ANTS | Titres sécurisés (CNI, permis…) | ANEF |
| CAF / CPAM / URSSAF | Organismes distincts | Délais inventés |
| SIREN / SIRET / RNE / INPI | Identifiants / registres | Confusion RCS |

Liste complète (42 termes) : conserver dans `curated/glossary_v3.jsonl` (à générer au build).

---

## 5. VL safe

- **0** scan usager ; Typst + CERFA vierges + Faker FR.  
- Cible **≥ 3 000** paires image/JSON.  
- Schéma `dossier_state` : `document_type`, `cerfa_number`, `extracted_fields`, `anomalies_detected`.  
- Validation IBAN/MRZ/SIRET **hors** LLM.

---

## 6. Checklist go/no-go avant re-train « release »

- [ ] ≥ 50k chunks RAG indexés (sans doublons critiques)  
- [ ] ≥ 80 % SFT avec `[Source: URL]`  
- [ ] Gold 100 Q × ≥ 25 paraphrases dans le SFT  
- [ ] ≥ 98 % sur 500 pièges montants/conseil/sur-refus  
- [ ] Retriever Hit@3 ≥ 95 % sur gold (smoke)  
- [ ] Inférence GGUF Q4 &lt; 12 Go, ctx 4k, p95 &lt; 15 s  
- [ ] Eval **avec RAG branché** (pas GGUF nu seul)

---

## 7. Rejets & AIPD

**Rejeté** : forums, doctrine GISTI/Cimade texte intégral, pièces réelles, juris non anonymisée, licences NC en prod commerciale sans revue.

**OK** : Licence Ouverte / Apache / MIT / CC-BY (selon usage) ; citation traçable ; pas de DCP en train.

---

## Prochaines étapes dépôt

1. Étendre `download_v3.py` : SRC-01, SRC-10, SRC-11, SRC-08/09, SRC-25 (échantillon IATE), SRC-29.  
2. `build_grounded_sft.py` (yssf-io → ChatML + hard negatives montants).  
3. `build_glossary_sft.py` depuis §4.  
4. Upsample gold ×25 + brancher RAG dans `run_quality.py` (mode `--with-rag`).  
5. VL : collator pixels réel + Typst (≥ 3k) **ou** reporter VL hors chemin critique chat.  
6. Mettre à jour `eval/gold` + banc anti-hallu 500 Q.
