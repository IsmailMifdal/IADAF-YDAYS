#!/usr/bin/env bash
# Merge is assumed done → convert HF checkpoint to TensorRT-LLM engine (FP8 default).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MERGED="${MERGED:-$ROOT/artifacts/merged}"
OUT="${TRT_OUT:-$ROOT/artifacts/trtllm}"
DTYPE="${DTYPE:-fp8}"          # fp8 | bfloat16 | float16
TP="${TP_SIZE:-1}"
MAX_LEN="${MAX_SEQ_LEN:-8192}"

if [[ ! -d "$MERGED" ]]; then
  echo "Merged HF model missing: $MERGED" >&2
  echo "Run: python ml/training/export_gguf.py --merge-only" >&2
  exit 1
fi

mkdir -p "$OUT"
echo "Building TRT-LLM engine dtype=$DTYPE from $MERGED → $OUT"

# Official convert + build (TensorRT-LLM install / container required).
# See https://github.com/NVIDIA/TensorRT-LLM
if ! command -v trtllm-build >/dev/null 2>&1 && ! command -v python >/dev/null; then
  echo "trtllm-build / python not found — use docker compose instead." >&2
  exit 1
fi

CONVERT_CKPT="${OUT}/tllm_checkpoint"
python -m tensorrt_llm.commands.convert_checkpoint \
  --model_dir "$MERGED" \
  --output_dir "$CONVERT_CKPT" \
  --dtype "${DTYPE/fp8/bfloat16}" \
  --tp_size "$TP" \
  ${DTYPE:+ } || true

# Prefer high-level trtllm-bench/build helpers when available
if command -v trtllm-build >/dev/null 2>&1; then
  EXTRA=()
  if [[ "$DTYPE" == "fp8" ]]; then
    EXTRA+=(--use_fp8)
  fi
  trtllm-build \
    --checkpoint_dir "$CONVERT_CKPT" \
    --output_dir "$OUT/engine" \
    --gemm_plugin auto \
    --max_seq_len "$MAX_LEN" \
    --max_batch_size "${MAX_BATCH:-4}" \
    "${EXTRA[@]}"
else
  echo "Install TensorRT-LLM or run via docker compose (nvcr.io tensorrt-llm image)." >&2
  echo "Placeholder: place engine under $OUT/engine when built." >&2
  exit 2
fi

echo "Engine ready: $OUT/engine"
echo "Next: bash ml/serving/trtllm/serve.sh"
