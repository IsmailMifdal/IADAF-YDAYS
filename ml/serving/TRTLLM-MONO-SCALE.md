# TRT-LLM — mono / scale IADAF NVFP4

Date : **2026-11-12** · GPU : **RTX 5080 16 Go** · TRT-LLM **1.4.0rc4** · attn **FLASHINFER** · CUDA JIT **micromamba 13.5**

## Serve

```bash
source ml/serving/_wsl_trtllm_env.sh
bash ml/serving/_wsl_serve_iadaf_nvfp4.sh   # max_batch=4096 max_seq=512
```

ai-service : `OPENAI_BASE_URL=http://127.0.0.1:8000/v1` · `OPENAI_MODEL=iadaf_qwen3_8b_nvfp4`.

## Export / rebuild NVFP4

LoRA `lora_v3_1` → merge BF16 (temporaire) → ModelOpt NVFP4.

```powershell
python ml/serving/export_iadaf_nvfp4.py          # merge si besoin
wsl -d Ubuntu-24.04 -- bash ml/serving/_wsl_export_iadaf_nvfp4.sh
```

Artefact servi : `ml/artifacts/iadaf_qwen3_8b_nvfp4/` (~6,4 Go).

## Bancs IADAF NVFP4

| Banc | Score |
|------|------:|
| Qualité ai-service | **108/108** |
| Scénarios / Hit@3 / Skills / Smoke | **20/20** · **100 %** · **15/15** · **3/3** |
| Mono médian | **~102–129** tok/s |
| Peak agg (`max_batch=4096`) | **~13,7k** tok/s @C512 |
| Tok/s/user @1 → @1024 → @2048 → @4096 | **129 → 16 → 10 → 10** |
| Burst C1024 / C2048 / C4096 | **1024/1024** · **1995/2048** · **1989/4096** (plafond ~**2000**) |
| Ramp 1→512 direct / ai-service | **0** err · spot ~42 % / ~88 % |

Détail : `ml/artifacts/results/current/bench_throughput_iadaf_nvfp4_c4096.json` · courbe `bench_tps_per_user_curve_iadaf_nvfp4.png` · `bench_iadaf_nvfp4_summary.json`.

## Charge progressive

```powershell
python ml/eval/bench_load_ramp.py --target openai --max-users 512
python ml/eval/bench_load_ramp.py --target ai-service --max-users 512
```

Eagle3 : bloqué (XQA/NVRTC WSL) — non retenu.
