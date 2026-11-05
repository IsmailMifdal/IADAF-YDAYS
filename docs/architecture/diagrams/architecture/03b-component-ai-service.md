# Component diagram — architecture — ai-service, before and after ADR-0001

> **Feature**: architecture — Linear ISM-116 (under ISM-111)
> **Related ADRs**: ADR-0001
> **Realises**: no use case yet (style decision) · **See also**:
> `03a-component-demarches-service.md`, `03c-component-gateway-discovery.md`

## Context

Where the three justified ports of ADR-0001 rule 3 sit in `ai-service`, and which modules keep
a plain dependency. Component level inside one container; arrows are compile-time dependencies
pointing to the supplier; `runtime:` edges are network calls. Not covered: the chat and
document HTTP contracts, the knowledge-base ingestion script, the Eureka registration (see
`03c`).

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
  subgraph Docs ["documents (pure domain)"]
    Rules["rules.py, mrz.py, quality.py, text.py"]
    An["analyzer.py — pypdf + OCR inside orchestration"]
    Ocr["ocr.py"]
  end
  DB["models/database.py (SQLAlchemy engine)"]
  RChat --> Chat
  RDoc --> Llm
  RDocA --> An
  RTr --> Tr
  Chat --> Rag
  Chat --> DB
  Rag --> Llm
  Tr --> Llm
  An --> Rules
  An --> Ocr
  Llm -.->|"runtime: HTTPS"| LLMApi["LLM provider (OpenAI-compatible)"]
  Ocr -.->|"runtime: HTTPS"| OcrApi["OCR provider"]
  Rag -.->|"runtime: local files"| Chroma[("ChromaDB")]
  DB -.->|"runtime: SQL, schema ai"| Pg[("PostgreSQL")]
  RDocA -.->|"runtime: HTTP via gateway"| DocSvc["document-service"]
```

## Diagram — target (ADR-0001, after steps 5 to 7)

```mermaid
---
title: cmp — ai-service target (component level)
---
flowchart LR
  subgraph Routes ["api/routes (thin)"]
    RChat["chat.py"]
    RDoc["document.py — explains a rule-based verdict"]
    RTr["translate.py"]
  end
  subgraph UseCases ["use cases (built in lifespan, injected with Depends)"]
    UChat["chat — composes Retriever + ChatModel"]
    UPre["document pre-check — reader, rules, explanation"]
    UTr["translate"]
    Prompts["prompts.py"]
  end
  subgraph Ports ["ports (typing.Protocol)"]
    PChat(("ChatModel"))
    PRead(("DocumentReader"))
    PRet(("Retriever — optional"))
  end
  subgraph Docs ["documents (pure domain)"]
    Facts["facts.py — frozen DocumentFacts"]
    Rules["rules.py, mrz.py, quality.py, text.py — consume facts"]
  end
  subgraph Adapters ["adapters"]
    AChat["OpenAICompatibleChatModel"]
    APdf["PdfTextReader (pypdf)"]
    AOcr["OcrReader"]
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
```

## Notes

- Three ports, each with a named trigger: `ChatModel` (fine-tuned model, ISM-111), `DocumentReader`
  (vision reader planned; two adapters already exist), `Retriever` (RAG is optional at runtime,
  tests run without ChromaDB).
- The domain arrow `rules → facts` replaces today's `analyzer → pypdf/OCR`: rules never see raw
  text or a library type. A detected kind that differs from the declared pack label becomes a
  deterministic "type mismatch" rule, not a model opinion.
- The conversation store keeps a plain dependency: one database, and the ownership rule
  (`may_resume`) becomes a pure function tested with values.
- Not drawn, on purpose: an embeddings port, a vector-store port, a translation port, a
  `DocumentSource` protocol for the httpx fetch (a function is enough).
