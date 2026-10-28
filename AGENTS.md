# IADAF — instructions for AI assistants

Read by Codex, Copilot, Cursor, Gemini and Claude Code (through `CLAUDE.md`). It
summarises [CONTRIBUTING.md](CONTRIBUTING.md): when in doubt, CONTRIBUTING wins. Any
change goes through a PR approved by Ismail.

## The project

IADAF helps non-French speakers through French administrative procedures.

```
front Next.js (:3000) → api-gateway (:8080) → user (:8081), demarches (:8082),
                                              document (:8083), analytics (:8085),
                                              ai-service FastAPI (:8086)
discovery-service Eureka (:8761) · PostgreSQL: one schema and one account per service
```

- Java services: Spring Boot, Java 17, Maven, Flyway migrations.
- `ai-service`: Python 3.12, FastAPI, RAG.
- Front: Next.js, strict TypeScript, 4 UI languages (fr, en, ar, es).

## Commands

| What | Command |
|---|---|
| Start the stack | `docker compose up -d --build` |
| Java services | `mvn -B -ntp verify` |
| Front | `cd front && npx tsc --noEmit && npx eslint src && npm run build` |
| AI service | `cd ai-service && pytest -q` |
| End-to-end | `bash tests/e2e/run-all.sh` |

Run the commands for the area you touched before proposing a commit.

## Always

- Write everything in English: code, comments, commits, issues, PRs, docs. Only the
  translated UI texts (`front/src/app/i18n/messages/*.ts`) use other languages.
- Start from an issue; branch `<type>/<issue #>-<short-slug>` from an up-to-date `main`.
- Commit `<type>(<scope>): <imperative subject> (#<issue>)`.
- `git add <path>`, one file at a time.
- A test with every feature and every fix.
- UI texts in the 4 languages.
- The simplest code that works; follow the style of the file you edit.
- Credit the assistant in the commit (`Co-Authored-By:`).

## Never

- Push to `main`, force-push, merge a PR: that is Ismail's role.
- `git add .` or `git add -A`.
- Write a secret anywhere but `.env` (not versioned), or echo it in an answer.
- Edit a merged Flyway migration: add a new one.
- Use `any` in TypeScript; make a blocking call inside an `async` function.
- Put real personal data in a test, an issue or a screenshot.

## Before changing code

Read the code before changing it, and propose a plan when the change spans several
files or an API. For a new feature, an approved diagram first (CONTRIBUTING § 3).
