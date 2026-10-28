# Serving TensorRT-LLM (FP8) — IADAF

Voie **perf** : garder le fine-tune QLoRA, remplacer GGUF/llama.cpp/Strata
par un engine TensorRT-LLM (FP8) exposé en API OpenAI-compatible.

## Flux

```
artifacts/lora  →  merge HF  →  convert TRT-LLM  →  build engine FP8  →  trtllm-serve
                                                              ↓
                                              ai-service OPENAI_BASE_URL=:8000/v1
```

1. **Ne pas** re-finetuner : réutiliser `ml/artifacts/lora` + merge existant
   (`ml/artifacts/merged` ou `python ml/training/export_gguf.py --merge-only`).
2. **Build engine** (Linux + GPU NVIDIA recommandé ; Docker NVIDIA) :
   ```bash
   bash ml/serving/trtllm/build_engine.sh
   ```
3. **Serve** :
   ```bash
   bash ml/serving/trtllm/serve.sh
   # ou : docker compose -f ml/serving/trtllm/docker-compose.yml up
   ```
4. **Brancher ai-service** :
   ```
   OPENAI_BASE_URL=http://127.0.0.1:8000/v1
   OPENAI_API_KEY=iadaf-dev-local-key
   OPENAI_MODEL=iadaf-qwen25-7b-fp8
   ```
5. **Évals** :
   ```bash
   python ml/eval/run_perf.py
   python ml/eval/run_quality.py
   python ml/eval/run_coherence.py
   ```

## Gain attendu

Environ **+20–100 % de throughput** (surtout multi-users / context long) vs GGUF.
Latence IADAF déjà ~1–2 s : gain utilisateur souvent **modeste**.

## Prérequis

- NVIDIA driver + CUDA ; image `nvcr.io/nvidia/tensorrt-llm` (ou install pip `tensorrt_llm`)
- GPU avec support FP8 (Ada / Hopper / Blackwell selon build TRT-LLM)
- **RTX 5080 Laptop** : vérifier la version TensorRT-LLM compatible sm_120 ;
  si FP8 indisponible, builder en **BF16 / FP16** (`DTYPE=bfloat16`)

## Alternative sans quitter GGUF

```powershell
.\ml\serving\llama-iadaf.ps1 -Parallel 4 -CtxSize 4096
```

Monter `parallel`, baisser le context si OOM, profil max TGP — **moins de gain**,
zéro refonte pipeline.
