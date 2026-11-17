# Release IADAF chat v3.1 — qualité / perf max (local)

Date : **2026-11-12** (upgrade Hit@3 100 % + bancs engines)

## Artefacts

| Élément | Chemin |
|---------|--------|
| GGUF Q4_K_M (servi) | `ml/artifacts/gguf/iadaf-qwen3-8b-v3_1-Q4_K_M.gguf` |
| NVFP4 TRT (prod multi-user) | `ml/artifacts/iadaf_qwen3_8b_nvfp4/` |
| LoRA final | `ml/artifacts/lora_v3_1/` |
| Index RAG ML | `ml/artifacts/rag_v3/` (~41 246 passages, hybrid BM25+dense) |
| KB patches | `ai-service/app/data/knowledge_base/quality_v3_patches.json` |
| Résultats courants | `ml/artifacts/results/current/` |
| Archive engines | `ml/artifacts/results/archive/` |

## Stack

1. **llama.cpp** CUDA — GGUF v3.1, `:8080`
2. **PostgreSQL embarqué** (`serving/keep_pgserver.py` → `ml/.tools/pg_uri.txt`)
3. **ai-service** uvicorn `:8086` — Chroma 1311 docs, FAQ overlay, hybrid retrieve

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\ml\serving\start-local-v3_1.ps1
```

## Bancs qualité (remeasured 2026-11-12 — GGUF IADAF v3.1)

| Banc | Score | Seuil | Statut |
|------|-------|-------|--------|
| Qualité **`--target ai-service`** | **100 %** (108/108) | ≥ 90 % | OK |
| Qualité prodlike (LLM+RAG local) | **97,2 %** (105/108) | — | OK |
| Scénarios réels | **20/20** | ≥ 18 | OK |
| Hit@3 RAG | **100 %** (102/102) | ≥ 90 % | OK |
| Skills | **15/15** | 100 % | OK |
| Docs / VL règles | **91,7 %** (11/12) | ≥ 85 % | OK |
| Smoke ai-service | **3/3** | — | OK |

**ai-service → TRT IADAF NVFP4** (LoRA mergé + PTQ) : qualité gold **100 %** (108/108), scénarios **20/20**.

### Upgrade qualité → Hit@3 100 %

- Retrieval ML : **dense + BM25 + RRF** (`ml/eval/rag_local.py`) + force exact-title patches
- ai-service : pool dense élargi + boost lexical / digits / titres (`rag_service.py`)
- Patches KB renforcés (CPAM, APL, SAMU/15, 3646, ANTS, arrival EN/FR, etc.)
- FAQ overlay inchangé pour le gold chat 100 %

## Débit — configs testées (chiffres réels)

Hardware : **RTX 5080 16 Go**, prompt IADAF ~62 tokens in, 128–256 out.

| Config | Mono médian | C=2 /user | C=4 agrégé | Verdict |
|--------|------------:|----------:|-----------:|---------|
| Baseline v3.1 (`-fa on`, parallel 4) | **165,5** | 57,9* | **364,8** | OK mais C2 instable |
| **Prod opt** (`-b 2048 -ub 512 -cb -fa on`) | **162,5** | **145,8** | **361,6** | **Retenu** |
| ngram-simple `--draft 8` | 161,3 | 143,9 | 355,0 | Pas de gain |
| Draft **Qwen3-0.6B** `-md` | **13,7** | 3,4 | 8,0 | **Rejeté** |

\*Variance élevée sur l’ancien banc C=2.

**Capacité produit** : **4 users** simultanés (slots). Au-delà = file.

### Pourquoi le draft a échoué

Log llama.cpp : *« target and draft vocabs are not compatible — tokens will be translated »* + VRAM ~15,7/16 Go → decode ~14 tok/s. Ne pas activer `-md` tant que le draft partage le même tokenizer / merge.

### Engines — rebench + qualité IADAF (2026-11-12)

Mono : llama IADAF **~139** tok/s > TRT NVFP4 **~128** (TRT-LLM **1.4.0rc4** + FLASHINFER ; CUDA JIT = micromamba 13.5).  
Eagle3 toujours **bloqué** (NVRTC/XQA WSL). Scale NVFP4 : C64 **6437** · C256 **15712** · C512 **17292**.

| C | llama IADAF `-np32` | TRT NVFP4 |
|--:|--------------------:|----------:|
| 1 | **139** | 128 |
| 32 | 934 | **3435** |
| 256 | n/a | **15712** |
| 512 | n/a | **17292** |

### Ramp charge continue 1→512 (situation réelle)

Think-time 0,5–3 s, prompts gold, +8 users / 15 s (direct) ou +16 / 10 s (ai-service).

| Cible | Peak | err | p95 @512 | Qualité |
|-------|-----:|----:|---------:|---------|
| TRT direct | **512** | **0** | ~5 s | spot ~24 % |
| ai-service→TRT | **512** | **0** | ~12 s | gold **100 %** · spot ~89 % |

Docs : [`TRTLLM-MONO-SCALE.md`](TRTLLM-MONO-SCALE.md) · `ml/artifacts/results/current/bench_iadaf_nvfp4_summary.json`.  
**Prod multi-user qualité** : ai-service + TRT IADAF NVFP4. **Mono LoRA** : llama.cpp reste valide.

## Config prod retenue

```text
llama-server -m iadaf-qwen3-8b-v3_1-Q4_K_M.gguf
  -c 32768 -np 4 -ngl 99 -b 2048 -ub 512 -fa on -cb
  --api-key iadaf-dev-local-key
```

```env
USE_OPENAI=true
OPENAI_BASE_URL=http://127.0.0.1:8080/v1
OPENAI_API_KEY=iadaf-dev-local-key
OPENAI_MODEL=iadaf-qwen3-8b-v3_1-Q4_K_M.gguf
OPENAI_TEMPERATURE=0.1
INTERNAL_JWT_SECRET=iadaf-local-eval-jwt-secret-32b-min!!
DATABASE_URL=<ml/.tools/pg_uri.txt>
```

Gates : `ml/artifacts/results/current/phase_gates_v3.json` · Burst : `bench_throughput_iadaf_nvfp4_c4096.json`.

## Correctifs livrés (cette passe)

- Hybrid RAG + patches → Hit@3 **91,2 % → 100 %**
- Flags llama `-b/-ub/-cb` → C=2 **~58 → ~146 tok/s/user**
- Draft / ngram mesurés et documentés (draft rejeté)
- Scripts `llama-iadaf.ps1` / `start-local-v3_1.ps1` alignés sur la config opt
- Rebench qualité IADAF + TRT 1.4 NVFP4 (FlashInfer JIT via CUDA 13.5) → C512 **~17k** tok/s

## Suite possible (non faite)

1. Merge LoRA IADAF sous TRT (style génératif hors gold RAG) — optionnel, gate 100 % déjà OK via ai-service
2. Draft aligné tokenizer (même famille merge) si speculative lossless
3. Tuning p95 ai-service @512 (cache RAG, pool HTTP)
