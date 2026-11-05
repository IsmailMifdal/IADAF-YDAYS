# Component diagram — architecture — demarches-service, before and after ADR-0001

> **Feature**: architecture — Linear ISM-116 (under ISM-111)
> **Related ADRs**: ADR-0001
> **Realises**: no use case yet (style decision) · **See also**: `03b-component-ai-service.md`,
> `03c-component-gateway-discovery.md`

## Context

What `demarches-service` depends on today and what it depends on once ADR-0001 rules 1 and 2
apply (identity at the edge, invariants on the entity). Component level inside one container;
arrows are compile-time dependencies pointing to the supplier. Not covered: the other Java
services (same shape, same fix), the HTTP routes, the lifecycle of a procedure.

## Diagram — today (dev_v1 f3e7328)

```mermaid
---
title: cmp — demarches-service today (component level)
---
flowchart LR
  subgraph Web ["web edge"]
    Ctrl["DemarcheController"]
    Sec["config/SecurityConfig + InternalJwt (copy 1 of 5)"]
    ExH["exception/GlobalExceptionHandler + SecurityExceptionHandler"]
  end
  subgraph App ["application"]
    Svc["service/DemarcheService"]
    Map["mapper/DemarcheMapper"]
  end
  subgraph Dom ["domain (anemic)"]
    Ent["entity/Demarche, EtapeDemarche, CommentaireDemarche"]
    Enum["enums/StatutDemarche, PrioriteDemarche, TypeDemarche"]
  end
  subgraph Infra ["persistence"]
    Repo["repository/DemarcheRepository (Spring Data)"]
  end
  SCH["SecurityContextHolder (Spring Security)"]
  Ctrl --> Svc
  Svc --> Map
  Svc --> Repo
  Svc -->|"defect: identity read in every method"| SCH
  Map -->|"defect: writes statut and dateFin, bypasses the rule"| Ent
  Svc --> Ent
  Ent --> Enum
  Repo --> Ent
  Repo -.->|"runtime: SQL, schema demarches"| Pg[("PostgreSQL")]
```

## Diagram — target (ADR-0001, after steps 2 to 4)

```mermaid
---
title: cmp — demarches-service target (component level)
---
flowchart LR
  subgraph Web ["web edge"]
    Ctrl["DemarcheController — resolves userId from the Jwt"]
    ExH["GlobalExceptionHandler — maps domain exceptions to ProblemDetail"]
  end
  subgraph Shared ["iadaf-security (shared Maven module)"]
    Jwt["InternalJwt + CurrentUser"]
  end
  subgraph App ["application"]
    Svc["service/DemarcheService(userId, …) — thin orchestration"]
  end
  subgraph Dom ["domain"]
    Ent["entity/Demarche — changeStatut, completeStep, openPackFolder; no public setter on statut and dateFin"]
    Enum["enums"]
    Exc["exception/ResourceNotFoundException, UnauthorizedAccessException"]
  end
  subgraph Infra ["persistence (accepted seam)"]
    Repo["repository/DemarcheRepository (Spring Data)"]
  end
  Ctrl --> Jwt
  Ctrl --> Svc
  ExH --> Exc
  Svc --> Repo
  Svc --> Ent
  Svc --> Exc
  Ent --> Enum
  Repo --> Ent
  Repo -.->|"runtime: SQL, schema demarches"| Pg[("PostgreSQL")]
```

## Notes

- Three edges disappear (`service → SecurityContextHolder`, `service → mapper`,
  `mapper → entity`) and the shared module appears; nothing else moves. `DemarcheDTO.of(entity)`
  (a static factory, as `document-service` does) replaces the mapper bean. The exception
  handler is not an edge from the controller: Spring wires it at runtime.
- No port on the repository: Spring Data's interface is already the seam, and there is one
  persistence technology. The ADR names the trigger that would add one.
- `document-service` has the same shape and the same identity defect
  (`DocumentService.java:151-158`); it also throws `ResponseStatusException` from the service,
  which rule 1 moves to the edge. Not drawn twice.
- Open question carried by ADR-0001: 8 of the 12 endpoints have no caller; removing them
  (step 1) shrinks `DemarcheService` before step 3 touches it.
