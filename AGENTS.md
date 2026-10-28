# IADAF — consignes pour les assistants IA

Ce fichier est lu par Codex, Copilot, Cursor, Gemini et Claude Code (via
`CLAUDE.md`). Il résume [CONTRIBUTING.md](CONTRIBUTING.md) : en cas de doute, c'est
CONTRIBUTING qui fait foi. Toute modification passe par une PR, validée par Ismail.

## Le projet

IADAF aide une personne non francophone à mener ses démarches administratives.

```
front Next.js (:3000) → api-gateway (:8080) → user (:8081), demarches (:8082),
                                              document (:8083), analytics (:8085),
                                              ai-service FastAPI (:8086)
discovery-service Eureka (:8761) · PostgreSQL : un schéma et un compte par service
```

- Services Java : Spring Boot, Java 17, Maven, migrations Flyway.
- `ai-service` : Python 3.12, FastAPI, RAG.
- Front : Next.js, TypeScript strict, 4 langues (fr, en, ar, es).

## Commandes

| Quoi | Commande |
|---|---|
| Lancer la stack | `docker compose up -d --build` |
| Services Java | `mvn -B -ntp verify` |
| Front | `cd front && npx tsc --noEmit && npx eslint src && npm run build` |
| AI service | `cd ai-service && pytest -q` |
| Bout en bout | `bash tests/e2e/run-all.sh` |

Lance les commandes de la partie touchée avant de proposer un commit.

## Toujours

- Partir d'une issue ; branche `<type>/<n° issue>-<descriptif>` depuis `main` à jour.
- Commit `<type>(<périmètre>): <sujet en français, à l'impératif> (#<issue>)`.
- `git add <chemin>`, fichier par fichier.
- Un test avec chaque fonctionnalité et chaque correction.
- Les textes du front dans les 4 langues (`front/src/app/i18n/messages/*.ts`).
- Le code le plus simple qui marche ; suivre le style du fichier modifié.
- Mentionner l'assistant dans le commit (`Co-Authored-By:`).

## Jamais

- Pousser sur `main`, forcer un push, fusionner une PR : c'est le rôle d'Ismail.
- `git add .` ou `git add -A`.
- Écrire un secret ailleurs que dans `.env` (non versionné), ni le recopier dans une
  réponse.
- Modifier une migration Flyway déjà fusionnée : en ajouter une nouvelle.
- Utiliser `any` en TypeScript ; appeler du code bloquant dans une fonction `async`.
- Mettre de vraies données personnelles dans un test, une issue ou une capture.

## Avant de modifier

Lis le code concerné avant de le changer, et propose un plan quand le changement
touche plusieurs fichiers ou une API. Pour une nouvelle fonctionnalité, un schéma
validé d'abord (CONTRIBUTING § 3).
