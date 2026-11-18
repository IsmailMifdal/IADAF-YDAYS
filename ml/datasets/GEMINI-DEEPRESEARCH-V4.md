# Prompt Gemini Deep Research — IADAF ML **v4** (fine-tune)

À coller tel quel dans **Gemini → Deep Research**.

**Brief contexte :** [`BRIEF-RECHERCHE-V4.md`](BRIEF-RECHERCHE-V4.md)  
**Rapport à remplir ensuite :** [`RAPPORT-DEEPRESEARCH-V4.md`](RAPPORT-DEEPRESEARCH-V4.md)  
**Ne pas rediscourir** le catalogue SRC-01→32 déjà dans [`RAPPORT-DEEPRESEARCH-V3-QUALITE.md`](RAPPORT-DEEPRESEARCH-V3-QUALITE.md) — chercher le **delta** v4.

Contexte dépôt : v3.1 **forte en FR** (qualité 108/108, Hit@3 100 %, skills 15/15) mais **matrice multilang 69/92 (75 %)** — AR fragile, carte-grise 0/4, faux refus.  
Inférence **100 % locale** (GGUF / TRT NVFP4), RTX 5080 16 Go. Fine-tune cible : **Qwen3-8B QLoRA → lora_v4**.

---

```text
# Mission — Deep Research datasets + skills pour IADAF fine-tune v4

Tu es chercheur data/ML + architecte RAG/skills. Produis un rapport ACTIONNABLE (pas un essai).
Cherche en priorité sur Hugging Face (datasets), GitHub open, data.gouv / sites officiels FR, glossaires UE.

## Diagnostic v3.1 (faits mesurés — contraintes)

- Modèle : Qwen3-8B QLoRA v3.1 → GGUF Q4_K_M + NVFP4 TRT-LLM, local, RTX 5080 16 Go.
- Qualité gold ai-service : **108/108** ; Hit@3 RAG **100 %** ; skills déterministes **15/15** ; scénarios **20/20**.
- Docs gold : **11/12** (1 KO expiration titre / ANEF-récépissé).
- Matrice multilang packs×FR/EN/AR/ES : **69/92 (75 %)**.
  - EN 20/23 · FR 19/23 · ES 17/23 · **AR 13/23**
  - Pack **carte-grise 0/4** ; documents 10/12 ; titre-sejour 12/16
- Échecs comportementaux réels (pas juste scoring) :
  1. **Faux refus** : carte grise (FR/EN/AR), urgences FR, APL FR/AR — template « hors périmètre / illégal » sur sujets IN-SCOPE.
  2. **Vrais refus ratés** : refuse_bourse ES/AR → le modèle parle trading/levier au lieu de refuser.
  3. **AR fragile** : travail étudiant (répond « non » au lieu de 964 h/~60 %), langues IADAF, ANEF vs ANTS, CPAM, impôts.
  4. **Contenu** : AME EN parfois « not in context » ; carte grise ES pointe préfecture au lieu d’ANTS immatriculation.
  5. Docs : scan flou EN/AR mal expliqué.
- Architecture figée : RAG-First + **code valide** (IBAN/MRZ/dates/checklist) ; LLM = chat grounded + explication ; VL/OCR = extraction seulement.
- Skills runtime actuels : qa (LLM), checklist, precheck, prefill, refuse (déterministes).
- Interprétation : la v4 ne doit PAS « re-apprendre le gold FR » ; elle doit corriger **multilang, faux refus, ANTS/carte grise, explication docs**, sans régression FR.

## Objectif produit v4 (non négociable)

Assistant démarches FR :
- Public 4 langues FR/EN/AR/ES + préparation Pro.
- Chemins : séjour/ANEF, Ameli/CPAM/AME, CAF/APL, impôts, permis ANTS, **carte grise ANTS**, docs/précheck.
- Serving **100 % local** — interdit de dépendre d’API cloud pour l’inférence usager.
- AIPD : licences ouvertes ; **zéro** pièce d’identité / dossier usager réel ; pas de forums © ; GISTI/Cimade = liens seulement.
- Gates cibles v4 :
  - Matrice multilang ≥ **90 %**
  - carte-grise **4/4** · AR ≥ **18/23**
  - Qualité FR ≥ **90 %** (garder ~100 % si possible)
  - Docs ≥ **85 %** (gold élargi)
  - Skills ≥ **15/15**
  - Pas de régression Hit@3 / scénarios

## Upgrades à adresser (P1 → P4) — ta recherche DOIT s’y mapper

### P1 Comportement
- Anti–faux-refus (allowlist in-scope : carte grise/ANTS, urgences 15/17/18/112, APL/CAF, CPAM/AME, permis)
- Vrais refus finance (bourse/trading/levier) FR/EN/ES/AR
- AR admin grounded (pas chat générique seul)
- Corpus ANTS / immatriculation.ants.gouv.fr

### P2 Docs & pré-vérification
- SFT « expliquer les checks » (expiration→ANEF/récépissé, flou→rephoto, Vitale≠domicile)
- Code-first inchangé pour validation
- VL/OCR **synth** Typst/CERFA / document-ia ; ≥ 3k avant VL critique
- Élargir gold docs (MRZ, IBAN, multi-chemins)

### P3 Data / archi
- RAG-First : montants/délais/CERFA hors poids
- Mix SFT v4 = delta (KO matrice + multilang + safety + grounded)
- Ne PAS rediscourir SRC-01→32 déjà listés en v3 qualité sauf sous-exploitation

### P4 Gates
- Voir cibles ci-dessus

### Hors scope (ne pas proposer comme levier principal)
- VL live prod avant volume synth
- Fine-tune pour valider IBAN/MRZ
- Chasser le débit tok/s agrégé pour « améliorer la qualité admin »

## Ce que tu dois trouver

### A. Datasets (delta v4) — Hugging Face en priorité

Pour chaque source : ID | Nom | URL | Licence | Format | Usage (RAG/SFT/VL/eval) | Domaine | Volume | Priorité P0–P3 | AIPD | Intégration IADAF | Nouveau?

Cherche explicitement :

1. Multilang **admin** FR↔EN/AR/ES — **AR prioritaire** (glossaires, traductions fiches, QA admin ; Aya seul ne suffit pas).
2. Anti–faux-refus / anti-sur-refus (xstest-like, benign over-refusal) — questions admin légitimes qui ne doivent PAS être refusées.
3. Safety refus **finance** (bourse, trading, leverage) multilang + jailbreaks juridiques.
4. ANTS / carte grise / certificat d’immatriculation / permis — fiches, CERFA, grounded QA.
5. Documents : DocVQA open, OCR synth, CERFA/Typst, schemas justificatifs (ex. betagouv/document-ia déjà connu — compléter).
6. Grounded SFT citation URL (answerable/unanswerable) adapté admin FR.
7. Tool-calling / JSON dossier_state (OpenAPI déjà partiel v3 — delta utile seulement).

### B. Skills à intégrer (pas seulement data)

Pour chaque skill proposé : nom | déterministe vs LoRA | entrée/sortie | lien upgrade P1/P2 | risque | effort.

Couvrir :
- Extensions refuse (finance) + allowlist anti–faux-refus
- Explication checks precheck / dossier_state multilang
- Extraction champs → JSON (validation code séparée)
- Checklist / prefill messages AR/ES
- Ce qui DOIT rester code-only

### C. Recette mix SFT v4 (chiffrée)

Propose un tableau :

| Bucket | Volume cible | % | Sources | Règle qualité | Upgrade P# |
|--------|--------------|---|---------|---------------|------------|

Volume total réaliste pour Qwen3-8B QLoRA sur 16 Go (ordre : 20k / 40k / 60k ?).  
Inclure upsample des **KO matrice** (liste : carte_grise×4, urgences_fr, apl_fr/ar, ame_en, sejour_etudiant ES/AR, refuse_bourse ES/AR, scan_flou EN/AR, langues_iadaf AR/ES, anef_vs_ants_ar, etc.).

### D. Plan d’intégration jusqu’au train v4

Étapes ordonnées :
1. Download / licence check
2. Builders → instruct_train_v4.jsonl
3. Patches KB + rebuild RAG
4. Skills code si besoin
5. QLoRA (r/α/epochs suggérés vs v3.1 r=32 α=64)
6. Export GGUF + NVFP4
7. Gates eval (commandes conceptuelles : run_multilang, run_quality, run_docs, run_skills)

### E. Sources déjà connues — COMPLÉTER, ne pas rediscourir

Déjà couverts / listés v3 : AgentPublic/service-public, yssf-io/service-public, DILA vosdroits, CESEDA, legalkit, Aya filtré, PIAF, FQuAD, Aegis, WildGuard (gated), IATE, OpenAPI Entreprise/RNE, CERFA/Typst cible, document-ia, quality_kb_patches IADAF, safety_refusals_v3, gold questions_v1 + documents_v2, dossier_state curated.

### F. Sources à REJETER

Forums, doctrine © intégrale, pièces d’identité réelles, datasets gated sans alternative, juris non caviardée, licences NC en train prod commerciale (eval only OK si signalé).

## Format de sortie OBLIGATOIRE

### 1. Executive summary (≤ 20 lignes)
Écart v3.1→v4 en une phrase ; top 10 sources **delta** ; volume SFT v4 ; 3 changements non négociables ; mapping P1–P4.

### 2. Tableau maître sources delta (≥ 15 lignes nouvelles ou sous-exploitées)
Colonnes : ID | Nom | URL | Licence | Format | Usage | Domaine | Volume | Priorité | AIPD | Intégration | Nouveau?

### 3. Mapping upgrades → sources → skills
Table : Upgrade P# | Sources | Skills | Gate mesurable

### 4. Mix SFT v4 (table chiffrée) + hyperparams QLoRA 16 Go

### 5. Skills blueprint (déterministe vs LoRA)

### 6. Pipeline docs safe (synth only) + volume mini utile

### 7. Checklist go/no-go avant train release v4

### 8. Rejets + alertes licence

## Critères de succès du rapport

- ≥ 15 sources **delta** avec URL + licence vérifiable
- Mapping explicite vers faux refus / AR / carte-grise / docs
- Mix SFT qui explique comment passer de 75 % → ≥ 90 % multilang **sans** casser le gold FR
- Stratégie RAG-First + code-first explicite
- Zéro pièce usager réelle
- Skills : frontière claire code vs LoRA

Commence la recherche maintenant (Hugging Face datasets en premier).
```

---

## Notes IADAF (hors prompt)

Après Gemini :

1. Coller / synthétiser dans [`RAPPORT-DEEPRESEARCH-V4.md`](RAPPORT-DEEPRESEARCH-V4.md).
2. Vérifier **chaque URL + licence** avant ingest.
3. Mettre à jour [`SOURCES.md`](SOURCES.md) avec le delta retenu.
4. Puis Phase 2 : download → builders → skills → train `lora_v4` → eval gates.

Relance banc multilang (référence) :

```powershell
python ml/eval/run_multilang.py
python ml/eval/run_multilang.py --include-gold
```
