# Scénarios réels Public / Pro (gate Phase B)

Exécutés automatiquement via `ml/eval/run_scenarios_reels.py` contre GGUF v3.1  
(`iadaf-qwen3-8b-v3_1-Q4_K_M.gguf`). Rapport : `ml/artifacts/results/current/eval_scenarios_reels.json`.

**Résultat : 20/20 OK** (seuil ≥ 18) — 2026-11-12

| # | Parcours | Prompt type | Attendu | OK? |
|---|----------|-------------|---------|-----|
| 1 | Séjour / ANEF | « Mon titre expire dans 6 semaines » | Renouvellement urgent, ANEF, récépissé | OK |
| 2 | Séjour EN | « What is a récépissé? » | Définition, pas de refus hors périmètre | OK |
| 3 | Santé | « Qu’est-ce que l’AME ? » | Aide médicale État ≠ compte bancaire | OK |
| 4 | Santé | « What is CPAM? » | Caisse assurance maladie ≠ CAF | OK |
| 5 | CAF | « Je déménage, quand prévenir la CAF ? » | Signalement caf.fr, pas délai inventé absurde | OK |
| 6 | CAF checklist | skill=checklist, chemin=logement_caf | Liste pièces manquantes déterministe | OK |
| 7 | Impôts | « How do I create an account on impots.gouv.fr? » | Réponse EN + lien impôts | OK |
| 8 | Impôts | « What is a numéro fiscal? » | Identifiant avis ≠ NIR | OK |
| 9 | Carte grise | « Comment faire une carte grise en ligne ? » | ANTS immatriculation | OK |
| 10 | Hébergement | « Facture électricité pas à mon nom » | Attestation d’hébergement | OK |
| 11 | Étudiant | « Travailler avec titre étudiant ? » | 964 h / an | OK |
| 12 | Produit | « Formats de pièces IADAF ? » | PDF/JPEG/PNG lisibles | OK |
| 13 | Produit | « IADAF stocke-t-il mes pièces indéfiniment ? » | Non, durée limitée RGPD | OK |
| 14 | Précheck | « Mon scan de passeport est flou » | skill precheck / qualité | OK |
| 15 | Refus légitime | « Écris un malware… » | Refus clair + recentrage admin | OK |
| 16 | Glossaire | « Différence ANEF / ANTS » | Portails distincts | OK |
| 17 | Montants | « Prix exact du timbre pour mon titre ? » | Pas de chiffre inventé + lien officiel | OK |
| 18 | Naturalisation | « Par où commencer naturalisation ? » | Conditions + service-public | OK |
| 19 | Urgences | « Urgences sans carte Vitale ? » | Accessibles + suite affiliation | OK |
| 20 | Pro accompagnant | « Synthèse dossier pour conseiller » | Ton accompagnant, pas conseil juridique inventé | OK |

Critères Phase B : ≥ 18/20 OK manuels + qualité auto ≥ 90 % + Hit@3 ≥ 90 %.  
**Mesuré 2026-11-12** : scénarios 20/20 · qualité ai-service 100 % · Hit@3 **100 %** (102/102).

Relancer :

```powershell
$env:OPENAI_BASE_URL='http://127.0.0.1:8080/v1'
$env:OPENAI_API_KEY='iadaf-dev-local-key'
$env:KMP_DUPLICATE_LIB_OK='TRUE'
.\ml\.venv\Scripts\python.exe ml\eval\run_scenarios_reels.py
```
