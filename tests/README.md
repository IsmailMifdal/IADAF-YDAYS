# 🧪 IA-DAF — Tests

| Niveau | Où | Lancer |
|--------|----|--------|
| Unitaires Java (JUnit, MockMvc, jetons réels) | `*-service/src/test` | `mvn verify` |
| Unitaires Python (pytest) | `ai-service/tests` | `cd ai-service && pip install -r requirements-dev.txt && pytest` |
| Python sur PostgreSQL | `ai-service/tests/test_conversations_pg.py` | idem, avec `TEST_DATABASE_URL=postgresql+asyncpg://…` |
| Frontend (types, lint, build) | `front/` | `npx tsc --noEmit && npx eslint src && npm run build` |
| **De bout en bout** | `tests/e2e/` | stack lancée, puis `bash tests/e2e/run-all.sh` |
| Santé rapide | `tests/health-checks/` | `bash tests/health-checks/check-all-services.sh` |
| Fichiers de déploiement (shellcheck, compose de production, Caddyfile) | `deploy/`, `docker-compose.prod.yml` | job `deploy` de la CI |
| **Après un déploiement** | `deploy/smoke-test.sh` | `deploy/smoke-test.sh <domaine>` — sans écriture, sûr en production |
| Restauration d'une sauvegarde | `deploy/restore-test.sh` | voir [DEPLOYMENT.md](../DEPLOYMENT.md), étape 6 |

La CI (`.github/workflows/ci.yml`) joue les quatre premiers niveaux et les
contrôles des fichiers de déploiement à chaque PR ; la suite de bout en bout tourne chaque nuit et à la demande
(`.github/workflows/e2e.yml`).

## Suite de bout en bout

Contre une stack de **développement** (avec `docker-compose.override.yml`,
qui publie les ports sur `127.0.0.1` et ajoute Mailpit) :

```bash
docker compose up -d --build
bash tests/e2e/run-all.sh          # code de sortie = nombre de scripts en échec
```

| Script | Ce qu'il vérifie |
|--------|------------------|
| `security.sh` | Rien ne répond sans jeton interne : gateway, chaque service en direct, `X-User-Id` forgé, jeton signé avec une autre clé, effacement sans scope |
| `accounts.sh` | Inscription, connexion, mot de passe oublié via Mailpit (un seul e-mail, lien à usage unique, jeton haché), consentement aux e-mails, limitation de débit, suppression |
| `documents.sh` | Dossier créé par pack, dépôt et retrait de pièces, étape cochée, faux PDF refusé, cloisonnement, chiffrement en base, effacement RGPD sur tous les services |
| `precheck.sh` | Pré-vérification : titre expiré, justificatif récent, cloisonnement, statistiques anonymes et leur lecture réservée |

Configuration par variables d'environnement (voir `tests/e2e/lib.sh`) :
`BASE_URL`, `GATEWAY_URL`, `MAILPIT_URL`, `ENV_FILE`, `PG_CONTAINER`, et
`E2E_SKIP_LLM=1` pour sauter les contrôles qui appellent le LLM.

> ⚠️ Les scripts créent des comptes, simulent des achats en écrivant
> directement en base et vident les compteurs de limitation de débit : **à ne
> jamais lancer contre une base de production.**

Prérequis : Bash, `curl`, Python 3, Node (pour signer les jetons de test avec
`front/scripts/dev-token.mjs`, donc `npm ci` dans `front/`), Docker.
