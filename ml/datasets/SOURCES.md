# Sources de datasets IADAF (v3)

Aligné sur [`docs/VISION-PRODUIT.md`](../../docs/VISION-PRODUIT.md) :
chemins **Public** élargis + préparation **Pro**, toujours sous licences ouvertes / synthétique (AIPD).

**Rapport Deep Research (S01–S25, mapping chemins, recette pipeline)** :
[`RAPPORT-DEEPRESEARCH-V3.md`](RAPPORT-DEEPRESEARCH-V3.md)

**Prompts Gemini** :
- Inventaire initial : [`GEMINI-DEEPRESEARCH-V3.md`](GEMINI-DEEPRESEARCH-V3.md)
- **Post-échec v2 — qualité max / local-only** : [`GEMINI-DEEPRESEARCH-V3-QUALITE.md`](GEMINI-DEEPRESEARCH-V3-QUALITE.md)

**Rapport Qualité Max (SRC-01→32, mix 50k, RAG-First)** :
[`RAPPORT-DEEPRESEARCH-V3-QUALITE.md`](RAPPORT-DEEPRESEARCH-V3-QUALITE.md)

---

## Sources déjà en place (héritage v2)

| Source | Usage | Licence | URL |
|--------|-------|---------|-----|
| KB interne IADAF | SFT instruct + RAG | Projet IADAF | `ai-service/app/data/knowledge_base/` |
| **DILA Service-Public XML** | SFT + RAG fiches / CERFA | Licence Ouverte 2.0 | [data.gouv](https://www.data.gouv.fr/datasets/fiches-pratiques-et-ressources-de-service-public-gouv-fr-particuliers) |
| AgentPublic/service-public (**S01**) | RAG / SFT (HF) | Licence Ouverte Etalab | https://huggingface.co/datasets/AgentPublic/service-public |
| louisbrulenaudet/CESEDA | SFT séjour / asile | Apache-2.0 | https://huggingface.co/datasets/louisbrulenaudet/code-entree-sejour-etrangers-droit-asile |
| CESEDA Légifrance | Réf. juridique | Droit français | https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006070158/ |
| ANEF / OFII / CERFA | Portails (curated) | Sites officiels | `curated/portals_official.json` |
| betagouv/document-ia (**S14**) | Schémas justificatifs | MIT | https://github.com/betagouv/document-ia |
| betagouv/doc.albert-api (**S20**) | Réf. IA documentaire | Voir dépôt | https://github.com/betagouv/doc.albert-api |
| GISTI / Cimade | Orientation **sans** copie | © associations | liens curated |
| Gold démarches | Qualité ≥ 90 % | Projet IADAF | `ml/eval/gold/questions_v1.jsonl` |
| Gold documents v2 | État dossier / pièces | Projet IADAF | `ml/eval/gold/documents_v2.jsonl` |
| Quality fixes + dossier_state | Anti-hallu / refus / pièces | Projet IADAF | `ml/datasets/curated/` |
| **VL synth** | Images + JSON (SFT VL) | Synthétique maison | `build_vl_synth.py` → `processed/vl_train.jsonl` |
| Labels docs texte | Classif identity/address/bank | Synthétique | `build_doc_labels.py` |

---

## Cibles v3 — statut après Deep Research

Détail S01–S25 + recette : [`RAPPORT-DEEPRESEARCH-V3.md`](RAPPORT-DEEPRESEARCH-V3.md).  
**Vérifier URL exacte + licence avant tout ingest.**

| Domaine | Sources rapport | Statut intégration code |
|---------|-----------------|-------------------------|
| Permis / ANTS | S01 + S02 CERFA + SVG synth carte grise | À brancher |
| Carte grise / véhicule | S02 + générateur SVG | À brancher |
| Impôts / DGFiP | S01 + maquette avis synth | Partiel KB ; VL à faire |
| CAF / logement | S01 + Typst domicile (S05) | Partiel KB ; VL à faire |
| Ameli / PUMa | S01 + RIB synth | Partiel KB ; VL à faire |
| Séjour / ANEF | S01 + S06 legalkit/CESEDA + CERFA/MRZ synth | Partiel ; élargir |
| **Pro** URSSAF / micro | S07 OpenAPI → SFT tool-calling | À brancher |
| **Pro** création entreprise | S04 Sirene, S10 INPI, S15 Annuaire | À brancher |
| **Pro** RH / embauche | S08 travail-emploi + SFT multi-dossiers | À brancher |
| Multilingue admin | S03 Aya (+ S25 Flores eval) | À brancher |
| DocVQA / OCR admin | S02 S05 S18 S19 + pipeline Typst | Étendre `build_vl_synth.py` |
| Instruction-following FR | S12 PIAF, S13 FQuAD, S21 squad_fr | À brancher (parcimonie) |
| Refusal / safety | S11 WildGuardMix (trad.), S17 toxic, curated | À brancher |
| Eval légal / RAG | S23 BSARD ; S24 LLeQA (**eval only**, DUA) | Eval seulement |

### Priorité d’ingest — Qualité Max (P0 d’abord)

Voir [`RAPPORT-DEEPRESEARCH-V3-QUALITE.md`](RAPPORT-DEEPRESEARCH-V3-QUALITE.md).

1. **SRC-01** yssf-io/service-public (fiches Markdown) → grounded SFT  
2. **SRC-02** AgentPublic/service-public (chunks RAG)  
3. Upsample **gold** ×25 + quality_fixes + glossaire anti-hallu  
4. **SRC-10 / SRC-11** evalap + guillaumetell (SFT citation)  
5. **SRC-12** DILA-Vectors / BGE-M3 local (ou ré-embed maison)  
6. **SRC-23 / SRC-24** OpenAPI Entreprise + RNE (tool-calling)  
7. **SRC-25** IATE (échantillon multi)  
8. Safety : Aegis (OK) + WildGuard si HF token + **xstest** anti-sur-refus  
9. **SRC-32** CERFA/Typst VL ≥ 3k (ou reporter VL)  
10. Puis P1 : legi, cnil, annuaires, travail-emploi (déjà partiel)  

⚠ BSARD / FQuAD / LLeQA : licences parfois NC → eval only tant que non clarifié.

### Téléchargement v3 lancé (`download_v3.py` → `raw/v3/`)

| ID | Statut local | Notes |
|----|--------------|-------|
| reuse v2 (S01/S02/S14/CESEDA/KB) | OK pointeurs | `raw/v3/from_v2/REUSE.json` |
| S03 Aya | OK ~11k | FR/EN/ES/AR (+ dialectes) filtrés |
| S06 legalkit | OK 15k | |
| S08 travail-emploi | OK 5k | dernier shard |
| S09 dole | OK ~4.4k | dernier shard |
| S11 WildGuard | **401 gated** | besoin `HF_TOKEN` + acceptation carte |
| S11b Aegis refusals | OK 4k | fallback public NVIDIA |
| curated safety FR | OK | `curated/safety_refusals_v3.jsonl` |
| S12 PIAF | OK ~3.8k | |
| S13 FQuAD | OK 800 | |
| S20 doc.albert-api | OK README | |
| S23 BSARD | OK 222 | eval |
| S25 Flores | **401 gated** | multi couvert via Aya pour l’instant |
| S05 Typst / S07 URSSAF API | pas encore | builders / synth ensuite |

Manifeste : `ml/datasets/raw/v3/MANIFEST.json` (gitignored sous `raw/`).

---

## Attribution DILA

- Paternité : **Service-Public.gouv.fr / DILA**
- Zip : `https://lecomarquage.service-public.gouv.fr/vdd/3.5/part/zip/vosdroits-latest.zip`

## AIPD

- **Interdit** : pièces usagers réelles ; copie intégrale GISTI/Cimade ; données Pro clients réelles ; forums (Reddit, Doctissimo…) ; leaks.
- Images VL = Typst / CERFA vierges + données factices / datasets **explicitement ouverts** uniquement.
- Pas d’entraînement sur tickets support contenant des données personnelles.
- S24 (LLeQA) : licence académique → **évaluation interne uniquement** tant que non revalidé.

## Pipeline

```powershell
# v2
python ml/datasets/download.py
python ml/datasets/build_instruct.py
…

# v3 — CPU only, parallèle au train GPU v2 → raw/v3/
python ml/datasets/download_v3.py
# (S03 Aya, S06 legalkit, S08 travail-emploi, S09 dole, S11 wildguard,
#  S12 piaf, S13 fquad, S20 albert docs, S23 bsard sample, S25 flores,
#  + pointeurs reuse v2 dans raw/v3/from_v2/REUSE.json)
# python ml/datasets/build_paths_v3.py
# python ml/datasets/build_pro_instruct.py
```

Mix SFT cible (rapport) : Public 40 % · Pro/tools 20 % · multi 15 % · grounded 15 % · safety 10 %  
(15k–25k tours). Détail : [rapport § D](RAPPORT-DEEPRESEARCH-V3.md#d-recette-pipeline-dataset-v3).

## Après intégration d’une source

1. Noter l’URL définitive dans le tableau héritage ou une ligne `curated/`.
2. Étendre `download.py` / builders.
3. Enrichir `eval/gold/` : ~100 Q multi-chemins, ~50 docs synth, ~25 jailbreaks juridiques.
4. Recalibrer `eval/thresholds.yaml` si besoin (garder qualité ≥ 90 %).
