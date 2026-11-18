# Comparatif **V5A (8B)** vs **V5B (14B)**

Même mix `instruct_train_v5.jsonl`, même evals. Remplir après benches sur **le même hardware**.

## Matrice de décision

| Critère | Seuil | V5A (mesuré) | V5B (mesuré) | Gagnant |
|---------|-------|--------------|--------------|---------|
| tok/s / user (chat court) | ≥ 50–60 constant | | | |
| tok/s / user (**avec doc** ~2–4k tokens ctx) | ≥ 50 | | | |
| Users simultanés @ ≥ 50 t/s | max N | | | |
| Qualité gold FR | ≥ 0.90 | | | |
| Docs (`run_docs`) | ≥ 0.85 | | | |
| Skills / tools | ≥ 15/15 | | | |
| Multilang / anti–faux-refus | gates v4 | | | |
| VRAM peak serve | ≤ 16 Go (1 GPU) | | | |

## Règles de choix

1. Si **seul V5A** tient ≥ 50–60 tok/s/user (surtout **avec document**) → **ship V5A**.
2. Si V5B tient le SLA **et** gagne clairement docs/qualité → **ship V5B**.
3. Si V5B gagne qualité mais casse le SLA sur 1 GPU → garder **V5A en prod laptop** ; planifier **V5B sur 2–3 GPU** ([`SCALE-CAPACITY-V5.md`](SCALE-CAPACITY-V5.md)).
4. Ne jamais sacrifier la règle **code-first** docs pour un gain de bench LLM.

## Scale 256 / 512 + engines

Matrice complète : [`../eval/ARCH-SCALE-PLAN-V5.md`](../eval/ARCH-SCALE-PLAN-V5.md).

| Cellule | max_C@50 | max_C@60 | agg@256 | agg@512 | Notes |
|---------|----------|----------|---------|---------|-------|
| v5a × vllm | | | | | |
| v5a × llama.cpp | | | | | |
| v5b × vllm | | | | | |
| v3_1 × trtllm NVFP4 (baseline) | | | | | |

```powershell
$env:OPENAI_BASE_URL = "http://127.0.0.1:8000/v1"
.\ml\eval\run_arch_scale_matrix.ps1 -Track v5a -Engine vllm -Quant fp8
python ml/eval/summarize_arch_scale.py
```

Prod-like QoS : cellule avec meilleur `max_C_sla50` **profil docs**. Burst : meilleur `agg_at_512`.
