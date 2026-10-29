# Rapport Deep Research — Datasets IA-DAF ML v3

> Source : Gemini Deep Research (prompt [`GEMINI-DEEPRESEARCH-V3.md`](GEMINI-DEEPRESEARCH-V3.md)).  
> Intégré au dépôt pour pilotage du train v3. **Vérifier chaque URL + licence avant ingest.**

Aligné sur [`VISION-PRODUIT.md`](../../docs/VISION-PRODUIT.md) · inventaire opérationnel : [`SOURCES.md`](SOURCES.md)

---

## A. Synthèse exécutive

Le moteur IA-DAF v3 (Qwen3-8B SFT/RAG + Qwen3-VL-4B, 16 Go VRAM) exige une acquisition de données rigoureuse et juridiquement propre.

- **25 sources qualifiées** retenues (licences ouvertes / Etalab / Apache / MIT / CC-BY…).
- **Armature Public** : DILA / AgentPublic / service-public.
- **Armature Pro** : schémas API (INPI, URSSAF, Sirene) pour états de dossier JSON et tool calling.
- **Gap critique** : aucun corpus de pièces admin FR réelles libre de droits → **génération synthétique obligatoire** (Typst / PDF CERFA vierges + données factices) pour le VL.
- **Safety** : adaptation multilingue de corpus type WildGuardMix pour refus de conseil juridique.

Top 10 à intégrer en premier : S01, S02, S03, S05, S06, S08, S11, S12, S14, S20.

---

## B. Tableau maître (S01–S25)

| ID | Nom | Hébergeur | Licence | Format | Langues | Usage | Domaines | Vol. approx. | AIPD | Prio | Notes IADAF |
|----|-----|-----------|---------|--------|---------|-------|----------|--------------|------|------|-------------|
| S01 | AgentPublic / service-public | HF | Etalab 2.0 | Parquet | FR | RAG / SFT / classif | Tous Public | ~36k | Nul | P0 | Pré-chunké ; maj hebdo |
| S02 | DILA Formulaires (CERFA) | data.gouv | Etalab 2.0 | PDF / XML | FR | VL (synth) | CERFA | ~1.5k | Nul | P0 | Calques vierges + inject données factices |
| S03 | CohereLabs / aya_dataset | HF | Apache-2.0 | Text | FR EN AR ES | SFT multi | Multilingue | ~204k Q/A | Nul | P0 | Alignement 4 langues |
| S04 | API Sirene Open Data | data.gouv | Etalab 2.0 | API / Parquet | FR | SFT / VL synth | Création, URSSAF | >30M | Faible (pub.) | P2 | SIRET/NAF pour faux Kbis |
| S05 | Typst Business Templates | GitHub | MIT | Typst | FR EN | VL synth | URSSAF, factures, domicile | N/A | Nul | P0 | Rendu déterministe PDF |
| S06 | louisbrulenaudet / legalkit | HF | MIT / Etalab | Parquet | FR | RAG / SFT | Séjour CESEDA, civil | ~53k | Nul | P1 | Filtrer CESEDA pour ANEF |
| S07 | API Tierce Déclaration URSSAF | data.gouv | Etalab 2.0 | OpenAPI | FR | SFT JSON state | URSSAF / micro | N/A | Nul | P2 | Schéma sortie dossier |
| S08 | AgentPublic / travail-emploi | HF | Etalab 2.0 | Parquet | FR | RAG / SFT | RH, embauche | ~5.7k | Nul | P2 | Parcours Pro salariés |
| S09 | AgentPublic / dole | HF | Etalab 2.0 | Parquet | FR | RAG | Réf. juridiques | ~4.3k | Nul | P1 | Textes législatifs |
| S10 | API Actes et Bilans INPI | data.gouv | Etalab 2.0 | API / JSON | FR | SFT contexte | Création entreprise | ~17k | Nul | P2 | Scénarios TPE |
| S11 | allenai / wildguardmix | HF | ODC-BY / Apache | JSON | EN→trad | SFT safety | Refus conseil juridique | ~86k | Nul | P3 | Traduire / adapter FR |
| S12 | PIAF-v1.2 | HF | Etalab 2.0 | JSON | FR | SFT extractif | Grounded QA | ~9.2k | Nul | P3 | Répondre uniquement depuis contexte |
| S13 | FQuAD | HF | CC-BY-SA 4.0 | JSON | FR | SFT unanswerable | Anti-hallu | ~80k | Nul | P4 | Questions sans réponse |
| S14 | betagouv / document-ia | GitHub | MIT | Code | FR | VL hybride | Valid. docs | N/A | Nul | P2 | Heuristiques IBAN/MRZ post-VL |
| S15 | Annuaire Entreprises (DINUM) | data.gouv | Etalab 2.0 | CSV | FR | SFT JSON | URSSAF, création | ~49k éch. | Faible | P2 | Schéma entités légales |
| S16 | Jours fériés France (Etalab) | GitHub | MIT | JSON | FR | RAG / SFT | Délais / échéances | 20 ans | Nul | P3 | Dates de recours |
| S17 | AgentPublic / camembert-toxic | HF | MIT | Text | FR | SFT safety | Modération ton | Faible | Nul | P3 | Désamorcer agressivité |
| S18 | pierreguillou / DocLayNet-base | HF | CDLA-Perm. | Image/JSON | Multi | VL spatial | Layout docs | ~8k | Nul | P3 | Paragraphes / tableaux |
| S19 | Ethosoft / TR-DocVQA-Synth | HF | CC-BY 4.0 | Image/Q&A | Multi | VL méthodo | Forms | N/A | Nul | P3 | Méthode à appliquer aux CERFA |
| S20 | doc.albert-api | GitHub | MIT | Markdown | FR | SFT tools | Tool calling | N/A | Nul | P2 | Specs API État |
| S21 | qwant / squad_fr | HF | CC-BY 4.0 | Parquet | FR | SFT FR | Fluidité | ~90k | Nul | P3 | Avec parcimonie |
| S22 | HFforLegal / french-datasets | HF | Divers ouvertes | Parquet | FR | SFT ton | Lexique légal Pro | Var. | Nul | P1 | Vérifier licence fichier par fichier |
| S23 | maastrichtlawtech / bsard | HF | CC-BY 4.0 | CSV/Text | FR | **Eval** RAG | Retrieval légal | 100k+ | Nul | P4 | Banc retrieval |
| S24 | maastrichtlawtech / lleqa | HF | DUA académique | Text | FR | **Eval only** | QA juridique | ~29.8k | Nul | P4 | Pas de train commercial sans relecture licence |
| S25 | facebook / flores (Flores-200) | HF | CC-BY-SA 4.0 | Text | FR EN AR ES | **Eval** multi | Traduction | ~3k | Nul | P3 | Non-régression multi |

**Action** : compléter les URL exactes HF/data.gouv dans [`SOURCES.md`](SOURCES.md) au moment de brancher `download.py`.

---

## C. Mapping chemin produit → datasets

### Public

| Chemin | Sources | Manque → synthèse |
|--------|---------|-------------------|
| **Séjour / ANEF** | S01 (étrangers), S06 CESEDA, S09 | Titres/passeports réels interdits → CERFA vierges (S02) + MRZ OACI factice + PyMuPDF/ReportLab |
| **Ameli / CAF** | S01 fiches sociales | RIB / justificatifs domicile → IBAN valides mathématiquement + codes banque fictifs ; factures Typst (S05) + adresses BAN |
| **Impôts / DGFiP** | S01, DILA | Avis d’impôt → maquette visuelle + RFR cohérent (brut, abattement 10 %) |
| **Permis / carte grise ANTS** | S02 CERFA 13750/13754 | Carte grise dense → générateur SVG paramétrique (champs A–Z.4, plaque SIV) |

### Pro

| Chemin | Sources | Manque → synthèse |
|--------|---------|-------------------|
| **URSSAF / micro / TVA** | S07 OpenAPI, S01 entreprises | Dialogues tool-calling depuis schémas Swagger → JSON paiement / déclaration |
| **Création / INPI** | S04 Sirene, S10 INPI, S15 Annuaire | Faux Kbis PDF + extraction SIRET 14 chiffres (VL) |
| **RH / embauche** | S08 travail-emploi | SFT multi-dossiers : synthèse pièces manquantes pour N salariés, ton analytique |

Principe VL inchangé : **VL extrait**, **code valide** (IBAN, MRZ, dates) — cf. S14.

---

## D. Recette pipeline dataset v3

### Matériel / QLoRA (rappel)

- 4-bit NF4 + gradient checkpointing, un gros poids à la fois.
- Target modules : `q/k/v/o_proj` + `gate/up/down_proj`.
- Config dépôt actuelle : `lora.r=16`, `alpha=32` (`configs/model.yaml`). Le rapport Gemini suggère `r=64` / `alpha=16` — **à trancher après un run pilote**, ne pas changer sans mesure VRAM.

### RAG

- Chunks **512–1024** tokens, overlap **15–20 %**.
- Normaliser titres DILA en Markdown (`#` / `##`).
- Métadonnées obligatoires : `url`, `date_maj`, `chemin_id` (ex. `sejour_anef`).
- Recherche hybride dense/sparse recommandée.

### Mix SFT (cible 15k–25k tours, ChatML)

| Catégorie | % | Objectif | Sources |
|-----------|---|--------|---------|
| Guidage Public | 40 % | Multi-tours, arbres Service-Public | S01 |
| Aide Pro + tool calling | 20 % | JSON état dossier / API | S07 S10 S15 S20 |
| Multilingue | 15 % | FR EN AR ES admin | S03 |
| Grounded QA | 15 % | Anti-hallu, contexte only | S12 S13 |
| Alignement / safety | 10 % | Refus conseil juridique | S11 S17 + curated |

### VL synthétique (Qwen3-VL-4B)

Pour chaque doc : **PNG dégradé** (bruit, rotation, ombre) + **JSON ground truth**.

Exemple de schéma cible :

```json
{
  "document_type": "justificatif_domicile",
  "emetteur": "Energie-Factice SA",
  "titulaire": { "nom": "DUPONT", "prenom": "Jean" },
  "adresse": "12 rue de la Paix, 75000 Paris",
  "date_emission": "2026-09-12",
  "conformite_duree": true
}
```

Outils : Typst (S05), CERFA DILA (S02), OpenCV pour dégradation ; validation métier hors LLM (S14).

### Gold eval (isolé du train)

| Banc | Volume cible | Contenu |
|------|--------------|---------|
| Multi-chemins | ~100 requêtes | Routage (ex. auto-entrepreneur + enfant + déménagement → URSSAF + ANEF + CAF) |
| Docs synth inédits | ~50 | Templates jamais vus à l’entraînement |
| Jailbreaks juridiques | ~25 | Extorquer un conseil ; refus + orientation médiation |

Seuils YDAYS inchangés tant que les scripts gold ne sont pas migrés (`eval/thresholds.yaml`).

---

## E. Sources rejetées

| Source | Motif |
|--------|--------|
| Reddit r/conseiljuridique, Doctissimo, Droit-Finances | RGPD, ToS anti-scraping, conseils erronés |
| Guides GISTI / Cimade / Droits Quotidiens (texte intégral) | © restrictif — **liens d’orientation uniquement** |
| Jurisprudence brute non caviardée | Risque réidentification |
| Leaks / scans pièces d’identité | Ligne rouge AIPD / CNIL |

---

## F. Veille trimestrielle

| Nœud | URL / cible | Pourquoi |
|------|-------------|----------|
| AgentPublic (HF) | https://huggingface.co/AgentPublic | dole, travail-emploi, service-public… |
| legalkit | https://huggingface.co/datasets/louisbrulenaudet/legalkit | CESEDA, codes |
| data.gouv API Entreprise | api-recherche-entreprises, api-tierce-declaration | Régénérer SFT tool-calling si schémas changent |

Mots-clés veille : `DocVQA French`, `CERFA dataset`, `French LegalBench`, `LLeQA`, `BSARD`, `Document-IA betagouv`, `doc.albert-api DINUM`, WildGuard / PolygloToxicityPrompts.

---

## Prochaines étapes dépôt

1. Brancher les P0 (S01–S03, S05, S02) dans `download.py` / builders.
2. Étendre `build_vl_synth.py` (CERFA, RIB, domicile, carte grise, Kbis).
3. Ajouter `build_pro_instruct.py` (JSON state + multi-dossiers).
4. Enrichir `eval/gold/` (multi-chemins, docs, jailbreaks).
5. Revalider licence **S22** fichier par fichier et **S24** (DUA) avant tout usage hors eval interne.
