# Engines multi-user v5 (Ministral 3) — RTX 5080 16 Go

Objectif : **flux ≥ 50–60 tok/s / user** avec continuous batching (docs en contexte inclus).

## Reco (ordre)

| Rang | Engine | Pourquoi | Ministral 3 8B/14B |
|------|--------|----------|--------------------|
| **1** | **vLLM** (OpenAI `/v1`) | Continuous batching, FP8 natif Mistral, tools/JSON, scale multi-req | **Support officiel NVIDIA/Mistral** |
| **2** | **TRT-LLM `trtllm-serve` + NVFP4** | Déjà prouvé chez vous sur **Qwen3-8B** (peak agg élevé) | **Pas dans la matrice NVIDIA** pour Ministral 3 dense — essai ModelOpt **expérimental** |
| 3 | llama.cpp `llama-server` | Dev / smoke / offline simple | OK Q4 ; **faible** multi-user vs vLLM/TRT |

Source matrice frameworks (NVIDIA, Mistral 3) : **vLLM ✔** · **TensorRT-LLM ✗** sur Ministral-3-{3,8,14}B · TRT ✔ surtout **Large 3 MoE**.

→ Pour **scaler le multi-user sur v5A/v5B**, partir sur **vLLM**, pas recopier aveuglément le pipeline TRT Qwen.

## Profils IADAF

### A — Prod multi-user laptop (recommandé v5)

```bash
# WSL, après merge LoRA → HF (ou checkpoint FP8 + adapter)
bash ml/serving/_wsl_serve_vllm_v5.sh v5a   # ou v5b
```

ai-service : `OPENAI_BASE_URL=http://127.0.0.1:8000/v1`.

Knobs SLA 50–60 tok/s/user :

- `--max-model-len` **8192** (docs chunkés ; pas 256k)
- `--gpu-memory-utilization 0.90`
- `--max-num-seqs` 4–8 puis bench
- quant : checkpoint **FP8** officiel si base seule ; après SFT → merge BF16 puis FP8/AWQ via llm-compressor **ou** servir BF16 QLoRA-merged en 4-bit bitsandbytes (moins idéal)

### B — Garder TRT (seulement si smoke Ministral OK)

Même stack que v3.1 :

```bash
# Export ModelOpt NVFP4 du merge v5a/v5b (peut échouer sur arch mistral3)
IADAF_BASE=mistralai/Ministral-3-8B-Instruct-2512-BF16 \
IADAF_ADAPTER=ml/artifacts/lora_v5a \
IADAF_NVFP4=ml/artifacts/iadaf_ministral3_8b_v5a_nvfp4 \
  python ml/serving/export_iadaf_nvfp4.py

TRTLLM_MODEL=ml/artifacts/iadaf_ministral3_8b_v5a_nvfp4 \
  bash ml/serving/_wsl_serve_iadaf_nvfp4.sh
```

Si load/arch KO → **ne pas bloquer v5** : rester sur vLLM.

### C — Dev local

`llama-iadaf.ps1` GGUF Q4 (déjà documenté `LOCAL-V5.md`).

## Scale 2–3 GPU

Préférer **réplicas vLLM** (1 processus / GPU + LB ai-service) plutôt que tensor-parallel sur 14B pour du chat multi-user à iso-SLA tok/s/user. Voir [`../datasets/SCALE-CAPACITY-V5.md`](../datasets/SCALE-CAPACITY-V5.md).

## Gate avant choix d’engine

Plan formalisé (C jusqu’à **256 / 512**) : [`../eval/ARCH-SCALE-PLAN-V5.md`](../eval/ARCH-SCALE-PLAN-V5.md).

```powershell
# Serveur déjà up (ex. vLLM :8000)
$env:OPENAI_BASE_URL = "http://127.0.0.1:8000/v1"
.\ml\eval\run_arch_scale_matrix.ps1 -Track v5a -Engine vllm -Quant fp8
# Puis autre cellule (trtllm / llama.cpp / v5b) → summarize automatique
python ml/eval/summarize_arch_scale.py
```

Métriques clés : `max_C_sla50` / `max_C_sla60` (QoS) + `agg_at_256` / `agg_at_512` (burst).  
Remplir [`../datasets/COMPARE-V5A-V5B.md`](../datasets/COMPARE-V5A-V5B.md) avec le gagnant.
