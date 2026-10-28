# Sources de datasets IADAF

| Source | Usage | Licence | URL |
|--------|-------|---------|-----|
| KB interne IADAF (`demarches.json`, `faq.json`, `service_public.json`) | SFT instruct + RAG | Projet IADAF | `ai-service/app/data/knowledge_base/` |
| AgentPublic/service-public | RAG / SFT fiches démarches | Licence Ouverte Etalab | https://huggingface.co/datasets/AgentPublic/service-public |
| louisbrulenaudet/code-entree-sejour-etrangers-droit-asile | SFT CESEDA (titre de séjour / asile) | Apache-2.0 | https://huggingface.co/datasets/louisbrulenaudet/code-entree-sejour-etrangers-droit-asile |
| Gold eval maison | Qualité 90 % / 100 Q | Projet IADAF | `ml/eval/gold/questions_v1.jsonl` |
| Labels documents synthétiques | Classif identity/address/bank | Généré localement | `build_doc_labels.py` |

## Règles RGPD / AIPD

- **Interdit** : pièces réelles déposées par les usagers, conversations nominatives sans consentement.
- Les labels documentaires sont **synthétiques** (texte MRZ/IBAN/facture fictifs).
- Les datasets publics ci-dessus sont de l’information administrative / juridique ouverte.

## Téléchargement

```powershell
python ml/datasets/download.py
# Options :
#   --skip-hf          # KB locale seulement
#   --max-sp-rows 2000 # limite AgentPublic/service-public
```
