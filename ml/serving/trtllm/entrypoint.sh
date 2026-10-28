#!/usr/bin/env bash
# Runs inside the NGC TensorRT-LLM container.
set -euo pipefail

MERGED=/models/merged
OUT=/models/trtllm
ENGINE="$OUT/engine"
DTYPE="${DTYPE:-fp8}"
CONVERT="$OUT/tllm_checkpoint"

if [[ ! -f "$MERGED/config.json" ]]; then
  echo "Mount ml/artifacts/merged (HF) at /models/merged" >&2
  exit 1
fi

mkdir -p "$OUT"

if [[ ! -d "$ENGINE" ]] || [[ -z "$(ls -A "$ENGINE" 2>/dev/null || true)" ]]; then
  echo "Converting checkpoint…"
  CKPT_DTYPE=bfloat16
  EXTRA_BUILD=()
  if [[ "$DTYPE" == "fp8" ]]; then
    EXTRA_BUILD+=(--use_fp8)
  else
    CKPT_DTYPE="$DTYPE"
  fi

  python -m tensorrt_llm.commands.convert_checkpoint \
    --model_dir "$MERGED" \
    --output_dir "$CONVERT" \
    --dtype "$CKPT_DTYPE" \
    --tp_size 1

  trtllm-build \
    --checkpoint_dir "$CONVERT" \
    --output_dir "$ENGINE" \
    --gemm_plugin auto \
    --max_seq_len "${MAX_SEQ_LEN:-8192}" \
    --max_batch_size "${MAX_BATCH:-4}" \
    "${EXTRA_BUILD[@]}"
fi

echo "Starting OpenAI-compatible server on :8000"
if command -v trtllm-serve >/dev/null 2>&1; then
  exec trtllm-serve "$ENGINE" --host 0.0.0.0 --port 8000 --tokenizer "$MERGED"
fi
exec python -m tensorrt_llm.commands.serve \
  --engine_dir "$ENGINE" \
  --host 0.0.0.0 \
  --port 8000 \
  --tokenizer_dir "$MERGED"
