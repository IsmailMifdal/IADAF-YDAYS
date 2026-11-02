# Contributing to IADAF

How a contribution travels from a task to `dev_v1`, in a 10-minute read.
Teams, cadence and the definition of done live in
[ORGANISATION.md](docs/equipe/ORGANISATION.md).

```
Linear task → branch from dev_v1 → commits → local checks → PR → two reviews → merge
```

## 1. Get started

```bash
cp .env.example .env                  # then fill in the secrets
docker compose up -d --build --wait   # returns once every health check passes
cd front && npm ci && cd ..           # Node 24, as in CI: the E2E scripts sign tokens with it
bash tests/e2e/run-all.sh             # everything must be green
```

Site: http://localhost:3000 · Trouble: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
(E2E failing locally: `python` missing, 401 everywhere, no OpenAI key, container
name already in use).

## 2. Task first

- Every piece of work starts from a **task in [Linear](https://linear.app/ismailmifdal)**.
  Each task also exists as a GitHub issue, synced both ways; **Linear is the
  reference**.
- Search for an existing task; otherwise create one, or open a GitHub issue from a
  [template](.github/ISSUE_TEMPLATE) and fill in every section.
- Title: `<type>(<scope>): <subject>`, e.g. `fix(db): remove CREATE SCHEMA from V1 migrations`.
- One team label (`team:backend`, `team:front-web`…), then assign yourself.
- Statuses, as in the Linear document
  [Circuit de validation des tâches](https://linear.app/ismailmifdal/document/circuit-de-validation-des-taches-4ef6b5f90303):

  | Status | Set by |
  |---|---|
  | Backlog, Todo | Ismail or the team lead |
  | In Progress | you, or automatically when the PR opens |
  | In Review | automatically when a review is requested; by hand for a task without code |
  | Done | automatically when the PR merges (Ismail's approval is required); **Ismail only** for a task without code |

  **Nobody but Ismail sets Done by hand.**

> **Why?** With ten people and no task, two of us build the same thing without
> knowing it. The board shows who does what at a glance, and Ismail checks every task.

**First time?** Pick a `first-issue` task.

## 3. Design before code

For a **new feature** (screen, API, data flow): a small [Mermaid](https://mermaid.js.org/)
diagram in the task (who calls what, which data), approved by Ismail or the team
lead, **then** the code.

> **Why?** Fixing a diagram takes 5 minutes; rewriting a PR takes 2 days. A one-line
> fix needs no diagram.

## 4. Branches and commits

Work branches start from an up-to-date `dev_v1`; a `hotfix` starts from `main`.

```
Branch:   <type>/ism-<n>-<short-slug>   (a few words)
          fix/ism-23-revoke-create-on-database
PR title: <type>(<scope>): <subject> (ISM-<n>)
          fix(db): revoke CREATE ON DATABASE from service roles (ISM-23)
Commit:   <type>(<scope>): <subject>   ((ISM-<n>) optional)
```

PRs are squash-merged, so the PR title becomes the commit on `dev_v1`: the
`(ISM-<n>)` suffix is required there and optional in intermediate commits.
Branches opened before Linear keep their names.

| Type | For | | Type | For |
|---|---|---|---|---|
| `feat` | feature | | `test` | tests only |
| `fix` | bug fix | | `refactor` | restructuring, no behaviour change |
| `docs` | documentation | | `build` / `ci` | dependencies, Docker, CI |
| `perf` | performance | | `chore` | maintenance |
| `hotfix` | urgent production fix, from `main` | | | |

Everything in English, imperative mood, no final period. Stage files one by one
(`git add <path>`), never `git add .`.

> **Why?** The task ID ties every line of code to its reason; the type makes the
> history readable at a glance. `git add .` is the #1 way to commit a `.env` by
> accident.

## 5. Check before pushing

| Area | Command |
|---|---|
| Front | `cd front && npm ci && npx tsc --noEmit && npx eslint src && npm run build` |
| Java services | `mvn -B -ntp verify` |
| AI service | `cd ai-service && python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt && pytest -q` (Python 3.12, as in CI) |
| Everything | `bash tests/e2e/run-all.sh` |

Then **review your own diff** (`git diff origin/dev_v1...HEAD`), alone or with an AI
assistant. A bug or a missing test? Fix it before pushing.

> **Why?** A red CI blocks everyone, and your own mistakes are faster to fix before a
> reviewer finds them.

## 6. The pull request

- **Small**: reviewable in 20 minutes, otherwise split it.
- **Targets `dev_v1`**. A `hotfix` targets `main`; `main` is then merged back into
  `develop` and `dev_v1`.
- Title in the commit format, ending with `(ISM-<n>)`, [template](.github/pull_request_template.md) filled in,
  `Fixes ISM-<n>` at the end: it links the PR to the Linear task, which moves to Done
  when the PR merges.
- Right after, a **plain-language comment** that mentions the people concerned: what
  changes, and why.

> **Why?** A big PR never really gets reviewed. The heads-up comment keeps the whole
> team, marketing included, informed without reading code.

## 7. Review and merge

- **Two approvals per PR into `dev_v1`**, enforced by GitHub:
  1. **A teammate** reviews the code: the team lead, or a team member when the lead
     is the author (cross-review).
  2. **Ismail approves**: the final go, after the teammate's review. He is the only
     code owner ([CODEOWNERS](.github/CODEOWNERS) lists his handle alone), so no PR
     merges without him.

  `develop` and `main` need Ismail's approval. Bot reviewers (Copilot, Codex)
  comment, never approve.

  | Team | Lead | Cross-review |
  |---|---|---|
  | Backend | @benoit-bremaud | @benoit-bremaud ⇄ @CorentinBL |
  | Front web | @SoulSkunk | within the team |
  | Mobile | @vitalikevin | Ismail alone until a second member joins |
  | AI | @Sqwado | @Sqwado ⇄ @UgoAmeslantt |

- **Every comment gets a reply** in its thread: fixed, deferred (with a task) or
  disputed (with the argument).
- **Check a remark against the code** before applying it: reviewers, human or bot,
  are sometimes wrong.
- **Merge** by Ismail into `dev_v1`, squashed, once CI is green, comments are handled
  and both reviewers approved.
- **After the merge**: `git checkout dev_v1 && git pull`, delete your branch
  (`git branch -d <branch>`, `git remote prune origin`), and start the next task from
  this fresh `dev_v1`.

> **Why?** Nobody reviews their own code, and a teammate knows it best; Ismail checks
> every task and keeps the branches consistent across teams. Squashing gives one
> commit per feature: the history stays readable and easy to revert.

### Releases

`dev_v1` (integration) → `develop` (staging) → `main` (production). At the end of a
sprint, a lead or Ismail merges `dev_v1` into `develop`; only Ismail merges `develop`
into `main`, then tags the release. Details in [DEPLOYMENT.md § 8](DEPLOYMENT.md).

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
- **Language**: code, comments, commits, issues, PRs and docs in English. Two
  exceptions: the product's translated UI texts, and the legal and GDPR documents
  (`docs/rgpd`, the DPIA, the legal pages), which stay in French.

> **Why?** Simple code reads fast and can be picked up by anyone, even from another
> team. One language for the repository keeps it searchable and consistent; legal
> documents are written for French authorities and users.

## 10. AI assistants

Allowed, and welcome. Whoever pushes stays the author: they read, understood and
tested every line. Credit the assistant (`Co-Authored-By:` in the commit).

> **Why?** Transparency tells reviewers where to look harder.
