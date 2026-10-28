# Contributing to IADAF

How a contribution travels from an issue to `main`, in a 10-minute read.
Teams, cadence and the definition of done live in
[ORGANISATION.md](docs/equipe/ORGANISATION.md).

```
issue → branch → commits → local checks → PR → review → merge
```

## 1. Get started

```bash
cp .env.example .env          # then fill in the secrets
docker compose up -d --build
bash tests/e2e/run-all.sh     # everything must be green
```

Site: http://localhost:3000 · Trouble: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## 2. Issue first

- Search for an existing issue; otherwise open one from a
  [template](.github/ISSUE_TEMPLATE) and fill in every section.
- Title: `<type>(<scope>): <subject>`, e.g. `fix(db): remove CREATE SCHEMA from V1 migrations`.
- One team label (`equipe:backend`, `equipe:front-web`…), then assign yourself and
  move it to **In progress** on the [Project](https://github.com/users/IsmailMifdal/projects/3).

> **Why?** With ten people and no issue, two of us build the same thing without
> knowing it. The board shows who does what at a glance.

**First time?** Pick a `premiere-issue` issue.

## 3. Design before code

For a **new feature** (screen, API, data flow): a small [Mermaid](https://mermaid.js.org/)
diagram in the issue (who calls what, which data), approved by Ismail or the team
lead, **then** the code.

> **Why?** Fixing a diagram takes 5 minutes; rewriting a PR takes 2 days. A one-line
> fix needs no diagram.

## 4. Branches and commits

```
Branch: <type>/<issue #>-<short-slug>        fix/1-flyway-create-schema
Commit: <type>(<scope>): <subject> (#n)      fix(db): remove CREATE SCHEMA from V1 (#1)
```

| Type | For | | Type | For |
|---|---|---|---|---|
| `feat` | feature | | `test` | tests only |
| `fix` | bug fix | | `refactor` | restructuring, no behaviour change |
| `docs` | documentation | | `build` / `ci` | dependencies, Docker, CI |
| `perf` | performance | | `chore` | maintenance |

Everything in English, imperative mood, no final period. Stage files one by one
(`git add <path>`), never `git add .`.

> **Why?** The issue number ties every line of code to its reason; the type makes the
> history readable at a glance. `git add .` is the #1 way to commit a `.env` by
> accident.

## 5. Check before pushing

| Area | Command |
|---|---|
| Front | `cd front && npm ci && npx tsc --noEmit && npx eslint src && npm run build` |
| Java services | `mvn -B -ntp verify` |
| AI service | `cd ai-service && pytest -q` |
| Everything | `bash tests/e2e/run-all.sh` |

Then **review your own diff** (`git diff origin/main...HEAD`), alone or with an AI
assistant. A bug or a missing test? Fix it before pushing.

> **Why?** A red CI blocks everyone, and your own mistakes are faster to fix before a
> reviewer finds them.

## 6. The pull request

- **Small**: reviewable in 20 minutes, otherwise split it.
- Title in the commit format, [template](.github/pull_request_template.md) filled in,
  `Closes #<issue>` at the end.
- Right after, a **plain-language comment** that mentions the people concerned: what
  changes, and why.

> **Why?** A big PR never really gets reviewed. The heads-up comment keeps the whole
> team, marketing included, informed without reading code.

## 7. Review and merge

- **Ismail reviews every PR**, helped by **Copilot and Codex** (they comment, never
  approve).
- **Every comment gets a reply** in its thread: fixed, deferred (with an issue) or
  disputed (with the argument).
- **Check a remark against the code** before applying it: bots are sometimes wrong.
- **Merge** by Ismail, squashed, once CI is green, comments are handled and the PR is
  approved. Then delete your branch.

> **Why?** One gatekeeper keeps `main` consistent. Squashing gives one commit per
> feature: the history stays readable and easy to revert.

## 8. Security

- **No secret in the code**: everything goes in `.env`, which is not versioned.
- **Committed a secret?** Tell Ismail and **revoke it** right away.
- **No real personal data** in tests, issues or screenshots.
- **Found a vulnerability?** Report it privately to Ismail, not in a public issue.
- Touching authentication, payment or documents: ask for a security review.

> **Why?** The repository is public: a pushed secret is read by bots within minutes,
> and deleting it is not enough, the history keeps it. IADAF handles identity
> documents: GDPR is unforgiving.

## 9. Writing code

- **The simplest thing that works**: no "just in case" code.
- **Tests** for every feature and every fix; mock the network, the database and the
  LLM, not our own logic.
- **Java**: constructor injection; a merged Flyway migration is never edited, add a new
  one.
- **TypeScript**: no `any`, UI texts in the 4 languages.
- **Python**: no blocking call inside an `async` function.
- **Language**: code, comments, commits, issues, PRs and docs in English. Only the
  product's translated UI texts are in other languages.

> **Why?** Simple code reads fast and can be picked up by anyone, even from another
> team. One language for the repository keeps it searchable and consistent.

## 10. AI assistants

Allowed, and welcome. Whoever pushes stays the author: they read, understood and
tested every line. Credit the assistant (`Co-Authored-By:` in the commit).

> **Why?** Transparency tells reviewers where to look harder.
