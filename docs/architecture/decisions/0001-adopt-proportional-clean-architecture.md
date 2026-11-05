# ADR-0001 — Adopt a proportional Clean architecture for the backend

- **Status**: proposed (weights and outcome to be validated by Ismail and the backend team)
- **Date**: 2026-11-05
- **Deciders**: Ismail (product owner, tech lead), Corentin, Benoît
- **Linear**: ISM-116 (under ISM-111)
- **Diagrams**: `../diagrams/architecture/03a-component-demarches-service.md`,
  `03b-component-ai-service.md`, `03c-component-gateway-discovery.md`

One decision: which architectural style the backend services follow from now on, so that every
refactoring issue (#142–#145 and the `ai-service` series) applies the same rules instead of each
reviewer's taste.

## Context

Two read-only audits of `dev_v1` at `f3e7328` (Java services, 4,270 main lines, 77 classes;
`ai-service`, 2,365 lines, 31 files) found no shared architectural rule and no written decision.
The findings that motivate this record:

1. **The dependency rule is broken in two services.** `DemarcheService` and `DocumentService`
   read `SecurityContextHolder` to learn who the user is, so a business method cannot be called
   without a web security context (`demarches-service/.../DemarcheService.java:47-54`,
   `document-service/.../DocumentService.java:151-158`).
2. **Business invariants live outside the entities and are bypassed.** The rule "a procedure set
   to `TERMINEE` gets `dateFin` stamped" sits in the service, and both `DemarcheMapper` write
   paths skip it (`:65` on create, `:87` on update; #143).
3. **The security contract is copied five times** (`InternalJwt`, `SecurityConfig`,
   `SecurityExceptionHandler` in four services, a fifth reactive copy in the gateway: 648 lines),
   with five error-body shapes (#145).
4. **`ai-service` already has a pure domain** (`app/documents`: rules, MRZ, quality, text — no
   framework import, injected clock) but its chat side mixes six concerns in `rag_service.py`
   and the language model produces a completeness verdict in `routes/document.py:20-70`, which
   contradicts the product rule that verdicts are deterministic.
5. **Speculative infrastructure with no consumer**: Resilience4j circuit breakers on no route,
   an unwired `FallbackController`, an `X-Gateway` header nobody reads, Eureka with single
   instances already bypassed by `analytics-service` fixed URLs, `@Cacheable` without
   `@EnableCaching`, 8 of 12 `demarches` endpoints without a caller.

The project ends in May 2027 with a student team working part-time; a fine-tuned language model
and a vision-based document reader are planned (ISM-111). The architecture must make those two
swaps cheap without reorganising every package first.

## Decision drivers

| Driver | Why it matters here |
|---|---|
| D1 — Business rules testable without mocks | Verdict rules and procedure invariants are the product; they must be unit-tested with plain values. |
| D2 — Migration cost before May 2027 | Three part-time contributors, 1,350 lines slated for deletion (#142, #144); a big-bang restructure would consume the schedule. |
| D3 — Readiness for the fine-tuned model and the vision reader | Swapping the LLM or the document reader must be configuration plus an adapter, not a rewrite. |
| D4 — Readability for a newcomer | Teammates and school reviewers must find their way without a tour. |
| D5 — Dependency rule enforced | Web, security and persistence types never reach the domain; the rule is checkable in review. |

## Options considered

### Option A — Keep the current layering (controller / service / repository, FastAPI routers)

No structural rule beyond Spring and FastAPI conventions. Fix defects case by case.

- Pro: zero migration; every teammate knows it.
- Con: nothing stops the next `SecurityContextHolder` read or the next bypassed invariant; the
  LLM swap stays a search-and-replace across `llm_service.py`, `rag_service.py` and the routes.

### Option B — Proportional Clean architecture

Three rules, no package reshuffle:

1. **Dependency rule**: services and domain never import web, security or persistence
   framework types. Identity is resolved at the controller (`@AuthenticationPrincipal Jwt` →
   `String userId`); exceptions are domain exceptions mapped to `ProblemDetail` at the edge.
2. **Invariants on the entities**: `Demarche.changeStatut()`, `completeStep()`,
   `openPackFolder()`; rules in `ai-service` stay in `app/documents` and consume frozen facts.
3. **A port only on a named trigger**: a second implementation exists or is scheduled, or a
   boundary must be replaced in tests. Today that is three ports in `ai-service` (`ChatModel`,
   `DocumentReader`, optional `Retriever`) and none in the Java services; `DocumentStore` is
   added the day the MinIO migration starts, not before.

- Pro: fixes the five findings with the smallest diff; the two planned swaps become one adapter
  each; rules stay reviewable as a checklist.
- Con: "proportional" needs judgement; the trigger list must be kept in this ADR.

### Option C — Hexagonal architecture everywhere

Every service gets `domain / application / infrastructure` packages, ports for persistence,
HTTP clients, clock, LLM, OCR, embeddings, vector store, conversation store.

- Pro: uniform; every boundary mockable.
- Con: nine ports with one implementation each in `ai-service`, repository interfaces over Spring
  Data in four services; moves every file; the team spends the remaining schedule on structure
  rather than on the document completeness feature.

## Decision matrix

Scores 0–5, weights sum to 100, totals out of 500. Weights are a proposal for Ismail to confirm
or change; the matrix is kept so that a changed weight recomputes the outcome.

| Criterion | Weight | A — current layering | B — proportional Clean | C — hexagonal everywhere |
|---|---:|---:|---:|---:|
| D1 Rules testable without mocks | 25 | 2 — service needs a security context and a mocked repository | 5 — entity methods and pure functions take values | 5 — same, through ports |
| D2 Migration cost before May 2027 | 25 | 5 — none | 4 — six small PRs, each shipping a fix already filed | 1 — every package moves, no feature value |
| D3 Ready for the model and reader swaps | 20 | 2 — three modules to edit per swap | 5 — one adapter behind `ChatModel` / `DocumentReader` | 5 — same |
| D4 Readable for a newcomer | 15 | 4 — standard Spring layout | 4 — same layout plus three written rules | 2 — nine interfaces to trace for one call |
| D5 Dependency rule enforced | 15 | 1 — broken in two services, unchecked | 5 — rule written, checked in review | 5 — enforced by package boundaries |
| **Total** | **100** | **295** | **455** | **355** |

Sensitivity: B stays first when D2 drops to 10 and D1 rises to 40 (B 470, C 410, A 275), and
when D4 is removed (B 395, C 325, A 235). C overtakes B only if D2 is weighted 0 and D4 ≤ 5,
which contradicts the May 2027 deadline.

## Outcome

**Option B.** The three rules above are the contract every backend PR is reviewed against.

### Migration plan — one pull request per step, aligned with the open issues

| Step | Scope | Issue |
|---|---|---|
| 1 | Delete before refactoring: `user-service`, the analytics aggregator, unused `demarches` endpoints (pending the question below), gateway circuit breaker, fallback, `X-Gateway`, unused cache and `WebClient` beans | #142, #144, new |
| 2 | Shared `iadaf-security` module (`InternalJwt`, `CurrentUser`), `ProblemDetail` everywhere, delete the dead 401 handlers and the three `ErrorResponse` classes | #145 |
| 3 | Identity at the controller in `demarches-service` and `document-service`; services take `String userId` | new (audit M1) |
| 4 | Invariants on `Demarche`; both write paths go through the entity; unit tests on the rules | #143 |
| 5 | `ai-service`: `ChatModel` port and `OpenAICompatibleChatModel`; messages with roles; `ModelUnavailable` instead of error text; objects built in `lifespan`; one LLM configuration (`LLM_BASE_URL`, `LLM_MODEL`, optional `LLM_API_KEY`) | new |
| 6 | `ai-service`: split `rag_service.py` (prompts, knowledge index, chat use case), typed results, ownership rule as a pure function | new |
| 7 | `ai-service`: `DocumentFacts` and `DocumentReader`; rules consume facts; `/analyze-document` re-scoped so the model explains a rule-based verdict and never produces one | new, with the front team |

Steps 1–4 and 5–7 are independent and can proceed in parallel.

### Questions for Ismail, to settle in this record

1. **Eureka**: keep `discovery-service` (school requirement, or a planned second instance), or
   replace `lb://` by compose DNS names as `analytics-service` already does? See
   `03c-component-gateway-discovery.md`.
2. **Unused `demarches` endpoints**: is a "my procedures" page planned? If not, step 1 removes
   the 8 endpoints and the JPQL "overdue" rule with them.
3. **Verdict ownership**: confirm the product rule "the model explains, the rules decide"
   before step 7, since the front's `PackWorkspace` already computes the missing list.

## Consequences

- Positive: the fine-tuned model lands as a configuration change plus an evaluation set; the
  vision reader is a second `DocumentReader` adapter; procedure rules get real unit tests;
  ~30 % of the Java code disappears before any refactoring.
- Negative: reviewers must apply three rules by hand (no ArchUnit or import-linter yet; add one
  if a violation slips through twice); the port trigger list in this ADR must be updated when a
  port is added or refused.
- Neutral: package names do not change; JPA entities remain the domain model (one persistence
  technology); Spring Data interfaces remain the persistence seam.

## Refused on purpose

A `ConversationRepository` port, a translation port, per-provider LLM adapters, a dependency
injection container in `ai-service`, Strategy classes per rule kind, a shared `ErrorResponse`
class across services. Each has one implementation and no test that needs replacing it.
