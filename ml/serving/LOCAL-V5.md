# Stack locale IADAF — **v5A / v5B** (Ministral 3)

Brief : [`../datasets/BRIEF-V5.md`](../datasets/BRIEF-V5.md) · Comparatif : [`../datasets/COMPARE-V5A-V5B.md`](../datasets/COMPARE-V5A-V5B.md) · Engines : [`ENGINES-V5.md`](ENGINES-V5.md)

## Multi-user (recommandé) — **vLLM**

TRT-LLM NVFP4 reste excellent sur **Qwen v3.1**, mais **n’est pas le chemin officiel** pour Ministral 3 dense. Pour scaler v5 :

```bash
# WSL — après merge HF (merged_v5a / merged_v5b)
wsl -d Ubuntu-26.04 -- bash ml/serving/_wsl_serve_vllm_v5.sh v5a
# ai-service → http://127.0.0.1:8000/v1
```

Détail knobs / fallback TRT expérimental : [`ENGINES-V5.md`](ENGINES-V5.md).

## Train

```powershell
python ml/datasets/download_v5.py
.\ml\training\run_train_v5.ps1 -Variant A          # 8B vitesse
.\ml\training\run_train_v5.ps1 -Variant B          # 14B qualité
# Smoke : -MaxSteps 20 -SkipExport -AllowLowHit
```

## Serve GGUF

**V5A — viser multi-user + docs :**

```powershell
.\ml\serving\llama-iadaf.ps1 `
  -ModelPath "ml\artifacts\gguf\iadaf-ministral3-8b-v5a-Q4_K_M.gguf" `
  -Parallel 3 -CtxSize 32768 -Batch 2048 -UBatch 512
```

**V5B — qualité, ctx plus serré :**

```powershell
.\ml\serving\llama-iadaf.ps1 `
  -ModelPath "ml\artifacts\gguf\iadaf-ministral3-14b-v5b-Q4_K_M.gguf" `
  -Parallel 2 -CtxSize 24576 -Batch 1024 -UBatch 256
```

Prod multi-user : **TRT NVFP4** (même pattern v3.1). Gate : **≥ 50–60 tok/s par user** en flux, y compris requête avec extrait document.

## Docs en contexte (runtime)

1. ai-service : OCR / extract → JSON  
2. `precheck_validate` (code) → `{valid, errors[]}`  
3. Prompt chat : extrait + JSON contrôle + question usager  
4. Modèle : Q&A + **PRÊT / NON PRÊT** (sans inventer les contrôles)

Ne pas servir un second modèle VL lourd sur le même 16 Go en parallèle du chat multi-user.

## Eval smoke

```powershell
$env:OPENAI_BASE_URL = "http://127.0.0.1:8080/v1"
$env:OPENAI_API_KEY = "iadaf-dev-local-key"
python ml/eval/run_docs.py
python ml/eval/run_skills.py
python ml/eval/bench_throughput.py --levels 1,2,3
```
