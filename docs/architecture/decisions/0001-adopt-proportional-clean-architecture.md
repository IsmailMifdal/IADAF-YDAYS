# ADR-0001 — Adopt a proportional Clean architecture for the backend

- **Status**: accepted (weights, outcome and the three decisions validated by Ismail on 2026-11-05)
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
   `SecurityExceptionHandler` in four services: 648 lines; plus an 85-line reactive copy in the
   gateway), with five error-body shapes (#145).
4. **`ai-service` already has a pure domain** (`app/documents`: rules, MRZ — machine-readable
   zone — parsing, quality, text; no framework import, a clock injected into the rules) but its
   chat side mixes six concerns in `rag_service.py` and the language model produces a
   completeness verdict in `routes/document.py:20-70`, which contradicts the product rule that
   verdicts are deterministic.
5. **Speculative infrastructure with no consumer**: Resilience4j circuit breakers on no route,
   an unwired `FallbackController`, an `X-Gateway` header nobody reads, Eureka with single
   instances already bypassed by `analytics-service` fixed URLs, five `@Cacheable` annotations
   kept after caching was disabled on purpose (cross-user leak), 8 of 12 `demarches` endpoints
   without a caller. Eureka and the endpoints are kept (decisions 1 and 2).

The project ends in May 2027 with a student team working part-time; a fine-tuned language model
(LLM, large language model) and a vision-based document reader are planned (ISM-111). The LLM
endpoint is already configurable (`OPENAI_BASE_URL`, `OPENAI_MODEL`); what is not cheap today is
the reader swap and the prompt format a fine-tuned chat model needs (role-tagged messages).

## Decision drivers

| Driver | Why it matters here |
|---|---|
| D1 — Business rules testable without mocks | Verdict rules and procedure invariants are the product; they must be unit-tested with plain values. |
| D2 — Migration cost before May 2027 | Three part-time contributors, 1,350 lines slated for deletion (#142, #144); a big-bang restructure would consume the schedule. |
| D3 — Readiness for the fine-tuned model and the vision reader | Swapping the document reader, or moving to role-tagged prompts, must be one adapter, not a rewrite. |
| D4 — Readability for a newcomer | Teammates and school reviewers must find their way without a tour. |
| D5 — Dependency rule enforced | Web and security types never reach the services or the domain; the rule is checked by a test, not only in review. |

## Options considered

### Option A — Keep the current layering (controller / service / repository, FastAPI routers)

No structural rule beyond Spring and FastAPI conventions. Fix defects case by case.

- Pro: zero migration; every teammate knows it.
- Con: nothing stops the next `SecurityContextHolder` read or the next bypassed invariant;
  moving to role-tagged prompts or adding a vision reader edits `llm_service.py`,
  `rag_service.py`, `analyzer.py` and the routes.

### Option B — Proportional Clean architecture

Three rules, no package reshuffle in the Java services:

1. **Dependency rule**: services and domain never import web or security framework types.
   Identity is resolved at the controller (`@AuthenticationPrincipal Jwt` → `String userId`);
   exceptions are domain exceptions mapped to Spring `ProblemDetail` (RFC 9457 error body) at
   the edge. Persistence annotations on entities, Spring Data repositories and `@Transactional`
   are the accepted persistence seam: one persistence technology, no second implementation.
   The rule is checked by a machine: an ArchUnit test in `demarches-service`, `document-service`
   and any Java service that gains a `service` package (no `org.springframework.security..`,
   `org.springframework.web.bind..`, `org.springframework.web.server..` or `jakarta.servlet..`
   import in `service` or `entity`), and an `import-linter` contract in `ai-service`.
2. **Invariants on the entities**: `Demarche.changeStatut()`, `completeStep()`,
   `openPackFolder()`, with `statut` and `dateFin` writable only through them (no Lombok
   `@Data` setters); rules in `ai-service` stay in `app/documents` and consume frozen facts.
3. **A port only on a named trigger**: a second implementation exists or is scheduled, or a
   boundary must be replaced in tests. Today that is three ports in `ai-service` (`ChatModel`,
   `DocumentReader`, optional `Retriever`) and none in the Java services; `DocumentStore` is
   added the day the MinIO migration starts, not before.

- Pro: fixes the five findings with the smallest diff; the reader swap and the prompt format
  change become one adapter each; rules stay reviewable as a checklist.
- Con: "proportional" needs judgement; the trigger list must be kept in this ADR.

### Option C — Hexagonal architecture everywhere

Every service gets `domain / application / infrastructure` packages, ports for persistence,
HTTP clients, clock, LLM, OCR, embeddings, vector store, conversation store.

- Pro: uniform; every boundary mockable.
- Con: nine ports with one implementation each in `ai-service`, repository interfaces over Spring
  Data in four services; moves every file; the team spends the remaining schedule on structure
  rather than on the document completeness feature.

## Decision matrix

Scores 0–5, weights sum to 100, totals out of 500. Weights confirmed by Ismail on 2026-11-05;
the matrix is kept so that a changed weight recomputes the outcome.

| Criterion | Weight | A — current layering | B — proportional Clean | C — hexagonal everywhere |
|---|---:|---:|---:|---:|
| D1 Rules testable without mocks | 25 | 2 — service needs a security context and a mocked repository | 5 — entity methods and pure functions take values | 5 — same, through ports |
| D2 Migration cost before May 2027 | 25 | 5 — none | 4 — seven small PRs, each shipping a fix already filed | 1 — every package moves, no feature value |
| D3 Ready for the model and reader swaps | 20 | 3 — endpoint already configurable; reader and prompt format need four modules edited | 5 — one adapter behind `ChatModel` / `DocumentReader` | 5 — same |
| D4 Readable for a newcomer | 15 | 4 — standard Spring layout | 4 — same layout plus three written rules | 2 — nine interfaces to trace for one call |
| D5 Dependency rule enforced | 15 | 1 — broken in two services, unchecked | 5 — rule written, checked by ArchUnit and import-linter | 5 — enforced by package boundaries plus the same tests |
| **Total** | **100** | **310** | **460** | **355** |

Sensitivity (weights still sum to 100): D1 40 / D2 10 / D3 20 / D4 15 / D5 15 gives B 475,
C 415, A 265; moving D4's weight to D1 (40 / 25 / 20 / 0 / 15) gives B 475, C 400, A 280.
B scores at least as high as C on every criterion (B − C = 3 × D2 + 2 × D4), so C never
overtakes B and only ties when D2 and D4 both weigh 0. A overtakes B only when
D2 > 3 × D1 + 2 × D3 + 4 × D5, that is when migration cost outweighs every other driver together.

## Outcome

**Option B.** The three rules above are the contract every backend PR is reviewed against.

### Migration plan — one pull request per step, aligned with the open issues

| Step | Scope | Issue |
|---|---|---|
| 1 | Delete before refactoring: `user-service`, the analytics aggregator, gateway circuit breaker, fallback, `X-Gateway`, `CorsConfig` (after checking the browser never calls `:8080`), unused cache and `WebClient` beans. With the aggregator go the `services.*.url` properties and the `*_SERVICE_URL` compose variables; any future call between backend services (calls through the gateway excluded) resolves through discovery (`lb://` or a `@LoadBalanced` client), never a fixed URL (decision 1). The 8 `demarches` endpoints without a caller and the overdue query stay (decision 2) | #142, #144, new |
| 2 | Shared `iadaf-security` module (`InternalJwt`, `CurrentUser`), `ProblemDetail` everywhere (domain exceptions replace `ResponseStatusException` in `DocumentService`), delete the dead 401 handlers and the three `ErrorResponse` classes; rule 1 checked by ArchUnit and `import-linter` (rule 1 above); the known violations of `DemarcheService` and `DocumentService` are frozen (ArchUnit `FreezingArchRule`) and step 3 empties the freeze store | #145 |
| 3 | Identity at the controller in `demarches-service` and `document-service`; services take `String userId` | new (audit M1) |
| 4 | Invariants on `Demarche` (`@Data` replaced by getters, status and end date set only through `changeStatut`); every write path goes through the entity; unit tests on the rules. Full scope (decision 2): `POST` and `PUT /{id}` go through `changeStatut()` | #143 |
| 5 | `ai-service`: `ChatModel` port and `OpenAICompatibleChatModel`; messages with roles; `ModelUnavailable` instead of error text; objects built in `lifespan`; one LLM configuration (`LLM_BASE_URL`, `LLM_MODEL`, optional `LLM_API_KEY`) | new |
| 6 | `ai-service`: split `rag_service.py` (prompts, knowledge index, chat use case), typed results, ownership rule as a pure function | new |
| 7 | `ai-service`: `DocumentFacts` and `DocumentReader`; rules consume facts; `/analyze-document` re-scoped so the model explains a rule-based verdict and never produces one (decision 3) | new, with the front team |

Steps 1–4 and 5–7 are independent and can proceed in parallel.

### Decisions (Ismail, 2026-11-05)

1. **Eureka: keep `discovery-service`.** `03c-component-gateway-discovery.md` keeps the
   registry-free option as the documented alternative. Used consistently: the fixed URLs leave
   with the analytics aggregator (step 1), and any future call between backend services (calls
   through the gateway excluded) resolves through discovery like the gateway's routes.
2. **Unused `demarches` endpoints: keep them.** A "my procedures" page is planned. Step 1 no
   longer removes the 8 endpoints or the overdue query; step 4 keeps its full scope.
3. **Verdict ownership: confirmed.** The rules decide; the model explains and never produces a
   verdict. Step 7 goes ahead with the front team, whose `PackWorkspace` computes the missing
   list today.

## Consequences

- Positive: the fine-tuned model lands as a configuration change plus role-tagged prompts and
  an evaluation set; the vision reader is a third `DocumentReader` adapter; procedure rules get
  real unit tests; ~30 % of the Java code disappears before any refactoring.
- Negative: ArchUnit tests and an `import-linter` contract to write and maintain, with a
  freeze store until step 3 (step 2); rules 2 and 3 are still applied in review; the port trigger
  list in this ADR must be updated when a port is added or refused.
- Neutral: Java package names do not change (`ai-service` gains `facts.py`, `prompts.py` and
  an `adapters` module); JPA entities remain the domain model (one persistence technology);
  Spring Data interfaces remain the persistence seam.

## Refused on purpose

A `ConversationRepository` port, a translation port, per-provider LLM adapters, a dependency
injection container in `ai-service`, Strategy classes per rule kind, a shared `ErrorResponse`
class across services. Each has one implementation and no test that needs replacing it.
