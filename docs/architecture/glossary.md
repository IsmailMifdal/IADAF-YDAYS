# Glossary

Every term used in the diagrams and decision records, defined once. English headword; the French
word used in the code or the UI follows in parentheses when it differs.

| Term | Definition | Source |
|---|---|---|
| Adapter | A class at the edge of a service that implements a port with one concrete technology (an HTTP client, a database, a library). Replaceable without touching the use cases. | ADR-0001 |
| ChatModel | The port of `ai-service` through which use cases send a list of role-tagged messages to a language model and receive a completion or a stream. One adapter: the OpenAI-compatible client. | `03b-component-ai-service.md` |
| Composition root | The one place where a service builds its concrete objects and wires them together: `main.py` (`lifespan`) in `ai-service`, Spring's application context in the Java services. | ADR-0001 |
| Dependency rule | Source code dependencies point inward only: web, security and persistence code may depend on the domain, never the reverse. A service class that reads the HTTP security context breaks it. | ADR-0001 |
| Document facts (`DocumentFacts`) | The frozen, technology-free record a document reader produces from a file: detected kind, dates, identifiers, source. Rules consume facts, never raw text. | `03b-component-ai-service.md` |
| DocumentReader | The port of `ai-service` that turns file bytes into document facts. Adapters: PDF text extraction, OCR; a vision model is planned. | `03b-component-ai-service.md` |
| Domain | The code that expresses IADAF's business rules with no framework import: the JPA entities and enums of a Java service, `app/documents` in `ai-service`. | ADR-0001 |
| Entity invariant | A rule an entity enforces itself on every write path, for example "a procedure moved to TERMINEE gets its end date stamped". | ADR-0001 |
| Internal JWT | The signed token the front issues for each request and every backend service verifies; its subject is the user id. | `api-gateway/.../SecurityConfig.java` |
| Pack (pack de démarche) | A guided set of steps and expected documents for one administrative procedure (for example a residence permit renewal), identified by a slug. | `demarches-service` |
| Port | An interface the use cases declare and the adapters implement, introduced only on a named trigger (a second implementation, or a boundary that tests must replace). | ADR-0001 |
| Procedure (démarche) | A user's instance of a pack: status, priority, steps, comments. The aggregate of `demarches-service`. | `demarches-service` |
| Retriever | The optional port of `ai-service` that returns knowledge-base passages relevant to a question. One adapter: the ChromaDB index. | `03b-component-ai-service.md` |
| Rule-based verdict | The completeness, validity or expiry status (`ok`, `warning`, `error`, `unknown`) that deterministic rules compute from document facts. The language model explains a verdict; it never produces one. | ADR-0001 |
| Service discovery | A registry (Eureka) where services announce themselves so that clients resolve them by name. Compose DNS gives the same resolution without a registry when each service has one instance. | `03c-component-gateway-discovery.md` |
| Use case (application layer) | A thin orchestration of one user goal: resolve inputs, call the domain, call the ports, return a typed result. Holds no business rule. | ADR-0001 |
