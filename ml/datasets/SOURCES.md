# Sources de datasets IADAF

| Source | Usage | Licence | URL |
|--------|-------|---------|-----|
| KB interne IADAF (`demarches.json`, `faq.json`, `service_public.json`) | SFT instruct + RAG | Projet IADAF | `ai-service/app/data/knowledge_base/` |
| **DILA Service-Public XML** (flux particuliers) | SFT + RAG fiches / CERFA | Licence Ouverte 2.0 | [data.gouv](https://www.data.gouv.fr/datasets/fiches-pratiques-et-ressources-de-service-public-gouv-fr-particuliers) — zip `vosdroits-latest.zip` |
| AgentPublic/service-public | RAG / SFT fiches (HF) | Licence Ouverte Etalab | https://huggingface.co/datasets/AgentPublic/service-public |
| louisbrulenaudet/CESEDA | SFT articles séjour / asile | Apache-2.0 | https://huggingface.co/datasets/louisbrulenaudet/code-entree-sejour-etrangers-droit-asile |
| CESEDA consolidé (Légifrance) | Référence juridique (lien + RAG via HF) | Droit français | https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006070158/ |
| ANEF | Portail dépôt titres (curated) | Site officiel | https://administration-etrangers-en-france.interieur.gouv.fr/ |
| OFII | Accueil / VLS-TS (curated) | Site officiel | https://www.ofii.fr/ |
| Service-Public démarches & CERFA | Index formulaires | Site officiel | https://www.service-public.gouv.fr/particuliers/vosdroits/demarches-et-outils |
| betagouv/document-ia | Schémas justificatifs → labels docs | MIT | https://github.com/betagouv/document-ia |
| betagouv/doc.albert-api | Réf. IA documentaire État (curated) | Voir dépôt | https://github.com/betagouv/doc.albert-api |
| GISTI / Cimade | Orientation complémentaire **sans** copie intégrale | © associations | [GISTI](https://www.gisti.org/spip.php?rubrique42) · [Cimade](https://www.lacimade.org/publication/) |
| Gold eval maison | Qualité 90 % / 100 Q | Projet IADAF | `ml/eval/gold/questions_v1.jsonl` |
| Quality fixes | Anti-hallucination / refus hors-scope | Projet IADAF | `ml/datasets/curated/quality_fixes.jsonl` |
| Labels documents synthétiques | Classif identity/address/bank | Généré localement | `build_doc_labels.py` |

## Attribution DILA (obligatoire)

Pour les fiches issues du flux XML :

- Paternité : **Service-Public.gouv.fr / DILA**
- URL de téléchargement : `https://lecomarquage.service-public.gouv.fr/vdd/3.5/part/zip/vosdroits-latest.zip`
- Nom du fichier + date du zip (voir `raw/service_public_dila/SOURCE.json`)

## Règles RGPD / AIPD

- **Interdit** : pièces réelles déposées par les usagers, conversations nominatives sans consentement.
- **Interdit** : recopier intégralement les guides GISTI / Cimade (droits d’auteur) — liens + orientation seulement.
- Les labels documentaires sont **synthétiques** (texte MRZ/IBAN/facture fictifs).
- Les datasets publics ci-dessus sont de l’information administrative / juridique ouverte.

## Perspectives v2 (datasets)

Voir la roadmap dans [`../README.md`](../README.md#roadmap-v2--documents--aide-renforcée)
(cibles **Qwen3-8B** + **Qwen3-VL-4B**, train et run sur **RTX 5080 16 Go**). À préparer :

- **Corpus VL synthétique** : images générées / maquettes (identité, adresse, banque) + labels JSON alignés document-ia ; variantes qualité (flou, sombre, reflet) — résolution bornée pour QLoRA 16 Go.
- **Parallèles multilingues** : mêmes paires instruct / gold en FR, EN, AR, ES.
- **Gold dossiers** : scénarios multi-pièces (manquant, expiré, type incorrect) pour eval bout-en-bout.
- Aucune pièce usager réelle ; licences ouvertes ou contenu synthétique maison uniquement.

## Téléchargement

```powershell
python ml/datasets/download.py
# Options :
#   --skip-hf            # saute CESEDA / AgentPublic
#   --skip-dila          # saute le flux XML officiel
#   --force-dila         # re-télécharge vosdroits-latest.zip
#   --skip-document-ia
#   --max-sp-rows 2000

python ml/datasets/build_instruct.py
python ml/datasets/build_rag_chunks.py
python ml/datasets/build_doc_labels.py
```
