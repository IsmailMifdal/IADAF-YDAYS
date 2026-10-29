The full instructions live in `AGENTS.md`, at the repository root.

Copilot code review only reads this file; when reviewing a PR, check first:

- no secret and no real personal data in the diff;
- no edit to an already merged Flyway migration;
- a test for every feature or fix;
- no `any` in TypeScript, no blocking call inside an `async` function;
- UI texts present in the 4 languages (fr, en, ar, es);
- code, comments, commits and docs written in English.
