# Contribuer à IADAF

Le chemin d'une contribution, de l'issue à `main`, en 10 minutes de lecture.
Les équipes, le rythme et la définition de « terminé » sont dans
[ORGANISATION.md](docs/equipe/ORGANISATION.md).

```
issue → branche → commits → vérifs locales → PR → relecture → fusion
```

## 1. Démarrer

```bash
cp .env.example .env          # puis renseigner les secrets
docker compose up -d --build
bash tests/e2e/run-all.sh     # tout doit être vert
```

Site : http://localhost:3000 · Problème : [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## 2. Une issue d'abord

- Cherchez si elle existe ; sinon, créez-la avec un [modèle](.github/ISSUE_TEMPLATE)
  et remplissez toutes ses sections.
- Titre : `<type>(<périmètre>): <sujet>`, par exemple `fix(db): retirer CREATE SCHEMA des migrations V1`.
- Une étiquette d'équipe (`equipe:backend`, `equipe:front-web`…), puis assignez-vous
  et passez-la en **En cours** dans le [Project](https://github.com/users/IsmailMifdal/projects/3).

> **Pourquoi ?** À dix, sans issue, deux personnes codent la même chose sans le
> savoir. Le tableau montre qui fait quoi, en un coup d'œil.

**Première fois ?** Prenez une issue `premiere-issue`.

## 3. Concevoir avant de coder

Pour une **nouvelle fonctionnalité** (écran, API, flux de données) : un petit schéma
[Mermaid](https://mermaid.js.org/) dans l'issue (qui appelle quoi, quelles données),
validé par Ismail ou le référent, **puis** le code.

> **Pourquoi ?** Corriger un schéma prend 5 minutes, réécrire une PR prend 2 jours.
> Une correction d'une ligne, elle, n'a besoin d'aucun schéma.

## 4. Branche et commits

```
Branche : <type>/<n° issue>-<descriptif>     fix/1-flyway-create-schema
Commit  : <type>(<périmètre>): <sujet> (#n)  fix(db): retirer CREATE SCHEMA des V1 (#1)
```

| Type | Pour | | Type | Pour |
|---|---|---|---|---|
| `feat` | fonctionnalité | | `test` | tests seuls |
| `fix` | correction | | `refactor` | réorganisation sans changement |
| `docs` | documentation | | `build` / `ci` | dépendances, Docker, CI |
| `perf` | performance | | `chore` | maintenance |

Sujet en français, à l'impératif, sans point final. Ajoutez vos fichiers un par un
(`git add <chemin>`), jamais `git add .`.

> **Pourquoi ?** Le numéro relie chaque ligne de code à son issue ; le type permet de
> lire l'historique d'un coup d'œil. `git add .` est la façon n° 1 de commiter un
> `.env` par accident.

## 5. Vérifier avant de pousser

| Partie touchée | Commande |
|---|---|
| Front | `cd front && npm ci && npx tsc --noEmit && npx eslint src && npm run build` |
| Services Java | `mvn -B -ntp verify` |
| AI service | `cd ai-service && pytest -q` |
| Tout | `bash tests/e2e/run-all.sh` |

Puis **relisez votre propre diff** (`git diff origin/main...HEAD`), seul ou avec un
assistant IA. Un bug ou un test manquant ? On corrige avant de pousser.

> **Pourquoi ?** Une CI rouge bloque tout le monde ; vos propres erreurs sont plus
> rapides à corriger avant qu'un relecteur ne les trouve.

## 6. La pull request

- **Petite** : relisible en 20 minutes, sinon découpez-la.
- Titre au format des commits, [modèle](.github/pull_request_template.md) rempli,
  `Closes #<issue>` à la fin.
- Juste après, un **commentaire d'info en français simple** qui mentionne les
  personnes concernées : ce qui change, et pourquoi.

> **Pourquoi ?** Une grosse PR n'est jamais vraiment relue. Le commentaire d'info
> tient au courant toute l'équipe, marketing compris, sans lire le code.

## 7. Relecture et fusion

- **Ismail relit toutes les PR**, aidé par **Copilot et Codex** (qui commentent, sans
  approuver).
- **Chaque commentaire reçoit une réponse** dans son fil : corrigé, reporté (avec une
  issue) ou contesté (avec l'argument).
- **Vérifiez une remarque dans le code** avant de l'appliquer : les robots se trompent
  parfois.
- **Fusion** par Ismail, en squash, quand la CI est verte, les commentaires traités et
  la PR approuvée. Supprimez ensuite votre branche.

> **Pourquoi ?** Un seul gardien de `main` garde le code cohérent. Le squash donne un
> commit par fonctionnalité : l'historique reste lisible, et on annule facilement.

## 8. Sécurité

- **Aucun secret dans le code** : tout va dans `.env`, qui n'est pas versionné.
- **Un secret commité ?** Prévenez Ismail et **révoquez-le** tout de suite.
- **Pas de vraies données personnelles** dans les tests, les issues ou les captures.
- **Une faille ?** Signalez-la en privé à Ismail, pas dans une issue publique.
- Authentification, paiement ou documents touchés : demandez une relecture sécurité.

> **Pourquoi ?** Le dépôt est public : un secret poussé est lu par des robots en
> quelques minutes, et le supprimer ne suffit pas, l'historique le garde. IADAF
> manipule des pièces d'identité : le RGPD ne pardonne pas.

## 9. Écrire du code

- **Le plus simple qui marche** : pas de code « au cas où ».
- **Des tests** pour toute fonctionnalité et toute correction ; on simule le réseau,
  la base et le LLM, pas notre propre logique.
- **Java** : injection par constructeur ; une migration Flyway fusionnée ne se modifie
  plus, on en ajoute une.
- **TypeScript** : pas de `any`, textes dans les 4 langues.
- **Python** : pas d'appel bloquant dans une fonction `async`.

> **Pourquoi ?** Du code simple se relit vite et se reprend facilement, même par
> quelqu'un d'une autre équipe.

## 10. Assistants IA

Permis, et bienvenus. Celui qui pousse reste l'auteur : il a relu, compris et testé
chaque ligne. Mentionnez l'assistant (`Co-Authored-By:` dans le commit).

> **Pourquoi ?** La transparence aide les relecteurs à savoir où regarder.
