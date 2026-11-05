# Component diagram — architecture — ai-service, before and after ADR-0001

> **Feature**: architecture — Linear ISM-116 (under ISM-111)
> **Related ADRs**: ADR-0001
> **Realises**: no use case yet (style decision) · **See also**:
> `03a-component-demarches-service.md`, `03c-component-gateway-discovery.md`

## Context

Where the three justified ports of ADR-0001 rule 3 sit in `ai-service`, and which modules keep
a plain dependency. Component level inside one container; arrows are compile-time dependencies
pointing to the supplier; `runtime:` edges are network calls. Not covered: the chat and
document HTTP contracts, `users.py` (GDPR erasure) and `health.py`, the knowledge-base
ingestion script, the Eureka registration (see `03c`).

## Diagram — today (dev_v1 f3e7328)

```mermaid
---
title: cmp — ai-service today (component level)
---
flowchart LR
  subgraph Routes ["api/routes"]
    RChat["chat.py"]
    RDoc["document.py — LLM produces missing_info"]
    RDocA["document_analysis.py — inline httpx fetch"]
    RTr["translate.py"]
  end
  subgraph Services ["services (module singletons)"]
    Chat["chat_service.py — SQLAlchemy inside"]
    Rag["rag_service.py — KB loading, embeddings, Chroma, prompts, LLM call"]
    Llm["llm_service.py — Ollama probe, OpenAI client, errors as text"]
    Tr["translation_service.py"]
  end
  subgraph DocsPure ["documents (pure)"]
    Rules["rules.py, mrz.py, quality.py, text.py"]
  end
  subgraph DocsIO ["documents (I/O)"]
    An["analyzer.py — pypdf + OCR inside orchestration"]
    Ocr["ocr.py"]
    Stats["stats.py"]
  end
  DB["models/database.py (SQLAlchemy engine)"]
  RChat --> Chat
  RChat --> DB
  RDoc --> Llm
  RDocA --> An
  RDocA --> Stats
  RTr --> Tr
  Chat --> Rag
  Chat --> Llm
  Chat --> DB
  Rag --> Llm
  Tr --> Llm
  An --> Rules
  An --> Ocr
  Stats --> An
  Llm -.->|"runtime: HTTPS"| LLMApi["LLM provider (OpenAI-compatible)"]
  Ocr -.->|"runtime: HTTPS"| OcrApi["OCR provider"]
  Rag -.->|"runtime: local files"| Chroma[("ChromaDB")]
  DB -.->|"runtime: SQL, schema ai"| Pg[("PostgreSQL")]
  RDocA -.->|"runtime: HTTP via gateway"| DocSvc["document-service"]
  Stats -.->|"runtime: HTTP via gateway"| AnaSvc["analytics-service"]
```

## Diagram — target (ADR-0001, after steps 5 to 7)

```mermaid
---
title: cmp — ai-service target (component level)
---
flowchart LR
  subgraph Routes ["api/routes (thin)"]
    RChat["chat.py"]
    RDoc["document.py — pre-check and explanation, merges document_analysis.py"]
    RTr["translate.py"]
  end
  subgraph UseCases ["application services (built in lifespan, injected with Depends)"]
    UChat["chat — composes Retriever + ChatModel"]
    UPre["document pre-check — fetch, read, rules, explain, record stats"]
    UTr["translate"]
    Prompts["prompts.py"]
  end
  subgraph Ports ["ports (typing.Protocol)"]
    PChat(("ChatModel"))
    PRead(("DocumentReader"))
    PRet(("Retriever — optional"))
  end
  subgraph Docs ["documents (pure)"]
    Facts["facts.py — frozen DocumentFacts"]
    Rules["rules.py — consumes facts only"]
  end
  subgraph Adapters ["adapters"]
    AChat["OpenAICompatibleChatModel"]
    APdf["PdfTextReader — pypdf, text.py, mrz.py"]
    AOcr["OcrReader — OCR provider, quality.py, mrz.py"]
    AVis["VisionReader (planned)"]
    AIdx["ChromaKnowledgeIndex"]
    AConv["conversation store (SQLAlchemy, no port)"]
  end
  RChat --> UChat
  RDoc --> UPre
  RTr --> UTr
  UChat --> PChat
  UChat --> PRet
  UChat --> Prompts
  UChat --> AConv
  UPre --> PRead
  UPre --> PChat
  UPre --> Prompts
  UPre --> Rules
  UTr --> PChat
  Rules --> Facts
  AChat ==>|"«realize»"| PChat
  APdf ==>|"«realize»"| PRead
  AOcr ==>|"«realize»"| PRead
  AVis ==>|"«realize»"| PRead
  AIdx ==>|"«realize»"| PRet
  APdf --> Facts
  AOcr --> Facts
  AChat -.->|"runtime: HTTPS — hosted, vLLM or Ollama by configuration"| LLMApi["LLM provider (OpenAI-compatible)"]
  AOcr -.->|"runtime: HTTPS"| OcrApi["OCR provider"]
  AIdx -.->|"runtime: local files"| Chroma[("ChromaDB")]
  AConv -.->|"runtime: SQL, schema ai"| Pg[("PostgreSQL")]
  UPre -.->|"runtime: HTTP via gateway (plain function, no port)"| DocSvc["document-service"]
  UPre -.->|"runtime: HTTP via gateway"| AnaSvc["analytics-service"]
```

## Notes

- Three ports, each with a named trigger: `ChatModel` (fine-tuned model with role-tagged
  prompts, ISM-111), `DocumentReader` (vision reader planned; two adapters already exist),
  `Retriever` (RAG is optional at runtime, tests run without ChromaDB).
- `rules.py → facts.py` replaces today's `analyzer.py → pypdf / OCR`: the rules never see raw
  text or a library type. The text, MRZ and quality parsers move beside the readers that
  produce `DocumentFacts`, where raw text and image bytes belong. A detected kind that differs
  from the declared pack label becomes a deterministic "type mismatch" rule, not a model opinion.
- `document_analysis.py` and its document-service fetch merge into the pre-check application
  service: the fetch is a plain function, the stats call keeps its single egress point.
- The conversation store keeps a plain dependency: one database, and the ownership rule
  (`may_resume`) becomes a pure function tested with values.
- Not drawn, on purpose: an embeddings port, a vector-store port, a translation port, a
  `DocumentSource` protocol for the httpx fetch.
