# Prompt Gemini Deep Research — datasets ML v3

À coller tel quel dans **Gemini → Deep Research**.

**Rapport produit** (intégré au dépôt) : [`RAPPORT-DEEPRESEARCH-V3.md`](RAPPORT-DEEPRESEARCH-V3.md)

Voir aussi : [`SOURCES.md`](SOURCES.md) · [`../README.md`](../README.md) · [`../../docs/VISION-PRODUIT.md`](../../docs/VISION-PRODUIT.md)

---

```text
# Mission — Deep Research datasets pour fine-tuning IADAF ML v3

Tu es un chercheur data/ML. Produis un rapport actionnable (pas un essai) pour constituer les datasets d’entraînement d’un assistant de démarches administratives françaises.

## Contexte produit
Projet IADAF (IA-DAF) :
- 2 produits, 1 moteur : **IA-DAF Public** (particuliers) et **IA-DAF Pro** (associations, TPE, RH, partenaires).
- Promesse : plusieurs **chemins** (parcours guidés) + aide automatisée (chat RAG, checklists, dépôt/pré-vérif de pièces, suivi, rappels).
- Langues : FR, EN, AR, ES.
- Chemins Public (priorité) : titre de séjour/ANEF, Ameli/CPAM, CAF/logement, impôts/DGFiP, permis & carte grise/ANTS, puis extension.
- Chemins Pro (préparation) : URSSAF/micro/TVA, création d’entreprise, embauche / titre de séjour salarié, accompagnement multi-dossiers.
- Stack ML cible : fine-tune **Qwen3-8B** (chat/SFT) + **Qwen3-VL-4B** (lecture de pièces), GPU 16 Go VRAM (QLoRA), serving local OpenAI-compatible.
- Pipeline : SFT instruct + chunks RAG + labels docs + VL synthétique. Les règles code (IBAN, MRZ, dates, complétude) valident ; le VL extrait ; le chat oriente.

## Objectif de la recherche
Trouver et classer des **sources de datasets / corpus ouverts** utilisables pour :
1. SFT chat (Q/R démarches, orientation vers un chemin, état de dossier JSON).
2. RAG (fiches officielles chunkables, à jour, avec licence claire).
3. Vision/document (extraction champs sur pièces : identité, domicile, bancaire, permis, véhicule, CERFA) — **sans données personnelles réelles**.
4. Classif / routage de chemin (`chemin_id`).
5. Ton Pro (synthèse pour accompagnant, multi-dossiers) + refus (« pas de conseil juridique », hors périmètre).
6. Multilingue admin FR↔EN/AR/ES.

## Contraintes non négociables (AIPD / légal)
- Licences **ouvertes uniquement** : Licence Ouverte 2.0 / Etalab, Apache-2.0, MIT, CC-BY, etc. Exclure tout © restrictif non autorisé à la copie.
- **Interdit** : pièces d’identité / dossiers usagers réels ; tickets support perso ; copie intégrale de contenus associatifs type GISTI/Cimade (liens d’orientation OK, pas le texte intégral).
- Préférer : data.gouv.fr, DILA/service-public, Légifrance (réf.), Hugging Face, GitHub betagouv/DINUM, corpus synthétiques documentaires.
- Indiquer clairement si une source est « réf. juridique seulement » (pas pour train verbatim) vs « OK SFT/RAG ».

## Sources déjà connues (ne pas rediscourir ; compléter autour)
- DILA Service-Public XML (vosdroits) — Licence Ouverte 2.0 — data.gouv / lecomarquage
- Hugging Face : AgentPublic/service-public
- Hugging Face : louisbrulenaudet CESEDA / droit entrée séjour asile
- betagouv/document-ia ; betagouv/doc.albert-api
- Portails curated ANEF/OFII/CERFA (liens officiels)
- Synthétique maison pour VL (PIL) et labels identity/address/bank

## Domaines à couvrir (priorité décroissante)
P0 : DILA/service-public (tous chemins), ANTS permis, carte grise/SIV, CERFA, checklists pièces.
P1 : approfondir Ameli, CAF, DGFiP, séjour/ANEF.
P2 : Pro — URSSAF, micro-entreprise, TVA, création entreprise (INPI/guichet unique), RH embauche étranger.
P3 : DocVQA/OCR forms FR open/synth, instruction-following FR, refusal/safety admin, glossaires/traductions admin FR-EN-AR-ES.
P4 : benchmarks Q/A admin/legal FR open pour évaluation.

## Méthode de recherche exigée
1. Explorer systématiquement : data.gouv.fr, huggingface.co/datasets, github.com (betagouv, dinum, etalab), documentation officielle ANTS/Ameli/CAF/URSSAF/DGFiP/INPI, paperswithcode / corpus DocVQA si licence OK.
2. Pour chaque candidat, vérifier la licence sur la page source (pas seulement le titre).
3. Écarter ou marquer « usage limité » si licence floue, scraping ToS interdit, ou données perso.
4. Proposer aussi des **stratégies de génération synthétique** quand l’open data manque (surtout VL et dossier_state), sans contrefaire documents officiels protégés.

## Format de sortie OBLIGATOIRE

### A. Executive summary (10–15 lignes)
Combien de sources retenues, gaps critiques, top 10 à intégrer en premier pour un train v3.

### B. Tableau maître (une ligne par source)
Colonnes :
| ID | Nom | URL | Hébergeur | Licence | Format | Langues | Usage (SFT/RAG/VL/classif/eval) | Domaines/chemins | Volume approximatif | Qualité/fraîcheur | Risque AIPD | Priorité (P0–P3) | Notes d’intégration IADAF |

### C. Mapping « chemin produit → datasets »
Pour chaque chemin : séjour, ameli, caf, impots, permis, carte_grise, urssaf_micro, creation_entreprise, rh_embauche — lister les IDs de sources + ce qu’il manque.

### D. Recette dataset v3 (pipeline)
Proposer un plan concret :
- mix SFT (ratios / % par domaine Public vs Pro vs safety)
- construction RAG chunks (taille, métadonnées source/date/URL)
- VL : types de pièces à synthétiser + schémas JSON de sortie
- gold d’éval : nb questions multi-chemins, docs, scénarios Pro
Compatible QLoRA Qwen3-8B + Qwen3-VL-4B 16 Go.

### E. Sources rejetées ou douteuses
Liste courte avec motif (licence, perso, ToS, hors sujet).

### F. Requêtes / URLs de suivi
Liste des pages data.gouv / HF à re-vérifier dans 3 mois + mots-clés de veille.

## Critères de succès du rapport
- Au moins 20 sources **retenues** avec URL + licence vérifiable.
- Au moins 5 sources utiles **Pro**.
- Au moins 5 pistes **VL/documents** sans données perso réelles.
- Gaps explicitement nommés (ex. « pas de dataset open permis prêt à l’emploi → synthétique + fiches DILA »).
- Aucune recommandation d’utiliser des scans de vrais usagers.

Commence la recherche maintenant et livre le rapport structuré A→F.
```
