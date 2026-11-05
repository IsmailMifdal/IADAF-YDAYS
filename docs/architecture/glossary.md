# Glossary

Every term used in the diagrams and decision records, defined once. English headword; the French
word used in the code or the UI follows in parentheses when it differs.

| Term | Definition | Source |
|---|---|---|
| Adapter | A class at the edge of a service that implements a port with one concrete technology (an HTTP client, a database, a library). Replaceable without touching the application services. | ADR-0001 |
| Application service | A thin orchestration of one user goal: resolve inputs, call the domain, call the ports, return a typed result. Holds no business rule. Called "use case module" in `ai-service`; distinct from a UML use case. | ADR-0001 |
| ArchUnit | A Java library that turns architecture rules into unit tests (for example: no Spring Security import in a `service` package). Checks rule 1 in the Java services. | ADR-0001 |
| ChatModel | The port of `ai-service` through which application services send a list of role-tagged messages to a language model and receive a completion or a stream. One adapter: the OpenAI-compatible client. | `03b-component-ai-service.md` |
| Circuit breaker | A proxy that stops calling a failing dependency for a while instead of piling up timeouts (Resilience4j in the gateway). Was configured, used by no route; removed by ADR-0001 step 1 (ISM-109). | `03c-component-gateway-discovery.md` |
| Composition root | The one place where a service builds its concrete objects and wires them together: `main.py` (`lifespan`) in `ai-service`, Spring's application context in the Java services. | ADR-0001 |
| Conversation store | The `ai-service` persistence of chat conversations and messages in PostgreSQL (schema `ai`). Plain dependency, no port. | `03b-component-ai-service.md` |
| CurrentUser | The helper of the shared `iadaf-security` module that reads the user id from a verified internal JWT at the controller. | ADR-0001 |
| Dependency rule | Source code dependencies point inward only: web and security code may depend on the application services and the domain, never the reverse. A service class that reads the HTTP security context breaks it. Persistence annotations and Spring Data repositories are the accepted seam. | ADR-0001 |
| Document facts (`DocumentFacts`) | The frozen, technology-free record a document reader produces from a file: detected kind, dates, identifiers, source. Rules consume facts, never raw text. | `03b-component-ai-service.md` |
| DocumentReader | The port of `ai-service` that turns file bytes into document facts. Adapters: PDF text extraction, OCR; a vision model is planned. | `03b-component-ai-service.md` |
| Domain | The code that expresses IADAF's business rules with no web or security framework import: the JPA entities and enums of a Java service, `app/documents/{rules,facts}` in `ai-service`. | ADR-0001 |
| Entity invariant | A rule an entity enforces itself on every write path, for example "a procedure moved to TERMINEE gets its end date stamped". Requires that the fields it protects have no public setter. | ADR-0001 |
| iadaf-security | The shared Maven module planned by #145: `InternalJwt` (token verification) and `CurrentUser`. Each service keeps its own filter chain. | ADR-0001 |
| import-linter | A Python tool that fails the build when a module imports a package a contract forbids. Checks rule 1 in `ai-service`. | ADR-0001 |
| Internal JWT | The signed token (JSON Web Token) the front issues for each request and every backend service verifies; its subject is the user id. | `api-gateway/.../SecurityConfig.java` |
| Knowledge index | The `ai-service` adapter that embeds the knowledge base and answers `Retriever` searches from ChromaDB. | `03b-component-ai-service.md` |
| LLM | Large language model: the text-generation model behind the chat, the translation and the verdict explanations. | ADR-0001 |
| MRZ | Machine-readable zone: the two or three bottom lines of an identity document, parsed by `mrz.py`. | ADR-0001 |
| OCR | Optical character recognition: turns an image into text. An external provider today. | `03b-component-ai-service.md` |
| Pack (pack de démarche) | A guided set of steps and expected documents for one administrative procedure (for example a residence permit renewal), identified by a slug. | `demarches-service` |
| Port | An interface the application services declare and the adapters implement, introduced only on a named trigger (a second implementation, or a boundary that tests must replace). | ADR-0001 |
| ProblemDetail | Spring's implementation of the RFC 9457 error body; the one error shape every service returns once #145 lands. | ADR-0001 |
| Procedure (démarche) | A user's instance of a pack: status, priority, steps, comments. The aggregate of `demarches-service`. | `demarches-service` |
| RAG | Retrieval-augmented generation: passages found by the `Retriever` are added to the prompt before the LLM answers. | `03b-component-ai-service.md` |
| Retriever | The optional port of `ai-service` that returns knowledge-base passages relevant to a question. One adapter: the knowledge index. | `03b-component-ai-service.md` |
| Rule-based verdict | The completeness, validity or expiry status (`ok`, `warning`, `error`, `unknown`) that deterministic rules compute from document facts. The language model explains a verdict; it never produces one. | ADR-0001 |
| Service discovery | A registry (Eureka) where services announce themselves so that clients resolve them by name. Compose DNS gives the same resolution without a registry when each service has one instance. | `03c-component-gateway-discovery.md` |
