# Prompt Gemini Deep Research — V3 qualité max (post-échec v2)

À coller tel quel dans **Gemini → Deep Research**.

**Rapport intégré** : [`RAPPORT-DEEPRESEARCH-V3-QUALITE.md`](RAPPORT-DEEPRESEARCH-V3-QUALITE.md)

Contexte dépôt : v2 mesurée **62 %** qualité / **50 %** docs (seuil 90 % / 85 %).  
Perf OK (~1 s). Inférence **100 % locale** (GGUF / llama.cpp), **pas d’API cloud** en prod.

---

```text
# Mission — Deep Research datasets + stratégie data pour IADAF ML v3 « qualité max »

Tu es chercheur data/ML + architecte RAG. Produis un rapport ACTIONNABLE (pas un essai).

## Diagnostic v2 (faits mesurés — à prendre comme contrainte)

- Modèle : Qwen3-8B QLoRA → GGUF Q4_K_M, servi en local (RTX 5080 16 Go).
- Train : ~800 steps, ~6,4k exemples SFT instruct, VL quasi vide (29 images synth, LoRA VL non multimodal réel).
- Eval gold 100 Q démarches : **62 %** (seuil 90 %) — KO.
- Eval docs/dossier : **50 %** (seuil 85 %) — KO.
- Perf : OK (~1 s p95).
- Échecs typiques observés (hallucinations / confusions) :
  - ANEF pris pour un service électoral
  - AME confondu avec PMA / procréation
  - VLS-TS mal défini
  - Délais CAF inventés (« 4 mois »)
  - Montants / CERFA inventés
  - Refus de conseil hors-périmètre parfois raté
  - Réponses génériques qui ratent les mots-clés gold
- Interprétation : le LoRA n’a PAS mémorisé assez de faits admin fiables ; le modèle « parle bien » mais se trompe. La V3 ne doit PAS juste « plus de LoRA sur les mêmes 6k lignes ».

## Objectif produit (non négociable)

Assistant démarches FR utilisable et utile :
- Public (particuliers, 4 langues FR/EN/AR/ES) + préparation Pro (asso/TPE).
- Chemins : séjour/ANEF, Ameli, CAF, impôts, permis/carte grise, + Pro URSSAF/création/RH.
- **Serving 100 % local** (llama.cpp / GGUF ou équivalent) — **interdit** : dépendre d’OpenAI/Anthropic/Mistral cloud pour l’inférence usager.
- Data **safe AIPD** : licences ouvertes uniquement ; **aucune** pièce d’identité / dossier usager réel ; pas de scraping forums © ; GISTI/Cimade = liens seulement.
- Cible qualité : ≥ 90 % gold démarches, ≥ 85 % docs, en gardant p95 < 15 s sur 16 Go.

## Ce que tu dois trouver / proposer

### A. Plus de DATA (priorité absolue)

Cherche et classe des sources pour :

1. **RAG corpus massif & à jour** (DILA, service-public particuliers + entreprises, AgentPublic, yssf-io/service-public, CERFA, codes filtrés CESEDA/travail/impôts) — chunkables, licence claire, date de maj.
2. **SFT grounded** (question → réponse **uniquement** à partir d’un passage cité + URL) — PIAF, FQuAD, datasets « answerable/unanswerable », paires générées depuis fiches officielles.
3. **SFT anti-hallu / glossaire** : définitions correctes ANEF, OFII, VLS-TS, AME, PUMa, APL, RFR, récépissé, titre de séjour, timbre fiscal (sans inventer les montants — apprendre à RENVOYER à la fiche).
4. **Multilingue admin** FR↔EN/AR/ES (Aya filtré, glossaires UE/officiel, traductions de fiches — licence OK).
5. **Safety / refus** : WildGuard/Aegis/équivalents **ouverts ou téléchargeables** ; refus conseil juridique/financier ; hors-périmètre.
6. **Pro** : schémas API URSSAF/INPI/Sirene → dialogues tool-calling / JSON `dossier_state` (pas besoin du dump 30M Sirene entier).
7. **VL documents** : uniquement synthétique / calques CERFA / Typst / DocVQA open — **zéro** scan usager.
8. **Hard negatives** : questions piège qui ressemblent à l’admin mais demandent conseil illégal / juridique / montants inventés.

Pour chaque source : URL, licence, volume, format, usage (RAG/SFT/VL/eval), priorité P0–P3, risque AIPD, comment l’intégrer dans un train local Qwen3-8B QLoRA.

### B. Recette dataset V3 « qualité » (pas seulement volume)

Propose un plan chiffré :

| Bucket | Volume cible | % du mix | Exemples de sources | Règle de qualité |
|--------|--------------|----------|---------------------|------------------|
| Gold upsamplé (questions_v1 + variants) | ? | ? | … | chaque gold ≥ N fois |
| Grounded QA (contexte → réponse + URL) | ? | ? | … | refus si hors contexte |
| Fiches → instruct (DILA) | ? | ? | … | citation source obligatoire |
| Glossaire / anti-confusion termes | ? | ? | … | ANEF/AME/VLS-TS… |
| Multilingue | ? | ? | … | |
| Safety / refus | ? | ? | … | |
| Pro JSON / tool-calling | ? | ? | … | |
| VL synth | ? | ? | … | |

Volume SFT total recommandé pour viser 90 %+ sur 100 Q gold avec Qwen3-8B QLoRA 16 Go (ordre de grandeur réaliste : 30k / 80k / 150k ?).

### C. Architecture data+modèle (local-only) — critique après échec v2

Ne recommande PAS « fine-tune plus gros pour tout mémoriser ».

Exige une stratégie :

1. **RAG-first à l’inférence** (Chroma/local embeddings) + SFT qui apprend à UTILISER le contexte.
2. SFT qui apprend : « je ne connais pas le montant → lien officiel ».
3. Séparer **chat** (faits + orientation) et **règles code** (IBAN, MRZ, dates).
4. VL : collator multimodal réel ou reporter le VL ; ne pas faire semblant avec 29 samples.
5. Eval : gold keywords + banc « zero hallucination » (montants/CERFA) + jailbreaks juridiques.
6. Hyperparams réalistes 16 Go (QLoRA r, epochs, upsample gold) — sans pousser un 14B.

Dis clairement ce qui doit être dans les **poids** vs ce qui doit rester dans le **RAG / code**.

### D. Sources déjà connues (compléter, ne pas rediscourir)

Déjà en place ou listées : AgentPublic/service-public, DILA vosdroits XML, CESEDA, document-ia, Aya (filtré), legalkit, travail-emploi, dole, PIAF, FQuAD, Aegis refusals, BSARD (eval), curated quality_fixes, VL synth maison, yssf-io/service-public (à confirmer).

### E. Sources à REJETER

Forums (Reddit, Droit-Finances), doctrine © GISTI texte intégral, leaks pièces d’identité, datasets gated sans alternative, jurisprudence non caviardée.

## Format de sortie OBLIGATOIRE

### 1. Executive summary (15 lignes max)
Pourquoi v2 a échoué en une phrase data ; top 10 sources à ajouter ; volume SFT cible ; 3 changements pipeline non négociables pour V3.

### 2. Tableau maître sources (≥ 30 lignes si possible)
Colonnes : ID | Nom | URL | Licence | Format | Usage | Domaine | Volume | Priorité | AIPD | Intégration IADAF | Nouveau? (oui/non)

### 3. Plan de mix SFT + RAG V3 (table + commandes conceptuelles)
Inclure upsample du gold 100 Q et construction de Q/R depuis fiches Markdown (yssf-io / DILA).

### 4. Glossaire anti-hallu (liste de 40+ termes)
ANEF, OFII, VLS-TS, AME, PUMa, APL, ALS, ALF, RFR, récépissé, titre, CERFA, timbres (renvoi), etc. — pour chaque terme : 1 phrase correcte + « ne pas confondre avec ».

### 5. Pipeline VL safe
Types de docs + générateur (Typst/CERFA) + schéma JSON + volume mini pour être utile.

### 6. Checklist « modèle utilisable en local »
Critères go/no-go avant de re-tuner : taille corpus, % grounded, couverture gold, banc refus, smoke RAG.

### 7. Rejets + veille

## Critères de succès du rapport

- ≥ 25 sources **nouvelles ou sous-exploitées** avec URL + licence.
- Plan mix qui explique comment passer de ~6k à un corpus capable de viser 90 %.
- Stratégie **RAG-first local** explicite (pas cloud).
- Zéro recommandation d’utiliser des pièces usagers réelles.
- Section glossaire anti-confusion (échecs v2 adressés).

Commence la recherche maintenant.
```

---

## Notes IADAF (hors prompt)

Échecs v2 à traiter **avant** un gros re-train :

1. **Upsample gold** `questions_v1.jsonl` + `quality_fixes` dans le SFT (beaucoup plus que 1×).
2. **Grounded SFT** : chaque réponse cite un chunk / URL (sinon refus).
3. **RAG à l’eval** : mesurer qualité *avec* retrieval, pas seulement le GGUF nu.
4. **VL** : vrai collator pixels ou reporter — 29 samples = inutile.
5. Nouveau corpus prioritaire à brancher : `yssf-io/service-public` (fiches Markdown complètes, Licence Ouverte).
