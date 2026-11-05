# Component diagram — architecture — gateway and service discovery, two options

> **Feature**: architecture — Linear ISM-116 (under ISM-111)
> **Related ADRs**: ADR-0001 (decision 1: keep Eureka)
> **Realises**: no use case yet (style decision) · **See also**:
> `03a-component-demarches-service.md`, `03b-component-ai-service.md`

## Context

How a request reaches a service today, and the registry-free alternative that was not
chosen. Container level (one box per deployable); solid arrows are compile-time dependencies,
`runtime:` edges are network calls. ADR-0001 decision 1 keeps Eureka; the second diagram stays
as the documented alternative. Not covered: TLS termination (Caddy), the front's own routes,
the JWT contract itself. Inside the gateway box the security filter chain and the routes are
wired by Spring at runtime, so no compile-time edge joins them.

## Diagram — today (dev_v1 f3e7328)

```mermaid
---
title: cmp — gateway and discovery today (container level)
---
flowchart LR
  Front["front (Next.js)"]
  subgraph GW ["api-gateway (WebFlux)"]
    Routes["GatewayConfig — 5 routes, lb://NAME"]
    Sec["SecurityConfig + UserIdentityFilter — verifies the internal JWT, sets X-User-Id"]
    CB["Resilience4j + FallbackController — configured, no route uses them"]
    Cors["CorsConfig — probably unused (browser talks to the front)"]
  end
  Eureka["discovery-service (Eureka, 1 instance)"]
  User["user-service"]
  Dem["demarches-service"]
  Doc["document-service"]
  Ana["analytics-service"]
  Ai["ai-service"]
  Front -.->|"runtime: HTTP /api/**, internal JWT"| GW
  GW -.->|"runtime: register + fetch registry"| Eureka
  User -.->|"runtime: register"| Eureka
  Dem -.->|"runtime: register"| Eureka
  Doc -.->|"runtime: register"| Eureka
  Ana -.->|"runtime: register"| Eureka
  Ai -.->|"runtime: register (py_eureka_client)"| Eureka
  Routes -.->|"runtime: HTTP, instance resolved from the registry"| User
  Routes -.->|"runtime: HTTP"| Dem
  Routes -.->|"runtime: HTTP"| Doc
  Routes -.->|"runtime: HTTP"| Ana
  Routes -.->|"runtime: HTTP, 90 s timeout"| Ai
  Ana -.->|"runtime: HTTP, fixed URLs from compose, bypasses Eureka"| Dem
  Ana -.->|"runtime: HTTP, fixed URL"| User
```

## Diagram — option without a registry (compose DNS)

```mermaid
---
title: cmp — gateway without discovery (container level)
---
flowchart LR
  Front["front (Next.js)"]
  subgraph GW ["api-gateway (WebFlux)"]
    Routes["GatewayConfig — 5 routes, http://service-name:port"]
    Sec["SecurityConfig + UserIdentityFilter"]
  end
  User["user-service — slated for deletion (#142)"]
  Dem["demarches-service"]
  Doc["document-service"]
  Ana["analytics-service"]
  Ai["ai-service"]
  Front -.->|"runtime: HTTP /api/**, internal JWT"| GW
  Routes -.->|"runtime: HTTP, name resolved by compose DNS"| User
  Routes -.->|"runtime: HTTP"| Dem
  Routes -.->|"runtime: HTTP"| Doc
  Routes -.->|"runtime: HTTP"| Ana
  Routes -.->|"runtime: HTTP, 90 s timeout"| Ai
  Ana -.->|"runtime: HTTP, same fixed URLs as today"| Dem
  Ana -.->|"runtime: HTTP, same fixed URL as today"| User
```

## Notes

- What Eureka buys at runtime today: nothing observable. Every service runs as one container with a
  fixed compose name; `analytics-service` already addresses its peers by those names and the
  gateway's discovery locator is disabled on purpose. What it costs: a container and its
  healthcheck on the critical startup path, a client library in six services (including a
  Python one that fails silently when the registry is down), and the two-peer cluster profile
  that no environment uses.
- Decision (ADR-0001, decision 1): keep `discovery-service`, a school requirement to
  demonstrate service discovery, and use it consistently. The two `Ana` fixed-URL edges of the
  first diagram leave with the analytics aggregator (step 1, #144); any future call between
  backend services (calls through the gateway excluded) resolves through the registry like the
  gateway's routes.
- The registry-free option stays documented in case the school requirement goes away.
- Independent of the Eureka decision, step 1 of ADR-0001 deletes the circuit-breaker
  configuration, the fallback controller, the `X-Gateway` header and, after one check that the
  browser never calls `:8080` directly, `CorsConfig`.
- The gateway's JWT verification is the fifth copy of the contract; step 2 (`iadaf-security`)
  shares `InternalJwt` while each service keeps its own filter chain (WebFlux here, servlet
  elsewhere).
