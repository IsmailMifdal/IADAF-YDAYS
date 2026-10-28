#!/usr/bin/env bash
# OpenAI-compatible serve for the TensorRT-LLM engine.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="${TRT_ENGINE:-$ROOT/artifacts/trtllm/engine}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"
MODEL_NAME="${OPENAI_MODEL:-iadaf-qwen25-7b-fp8}"
API_KEY="${OPENAI_API_KEY:-${STRATA_API_KEY:-iadaf-dev-local-key}}"

if [[ ! -d "$ENGINE" ]]; then
  echo "Engine missing: $ENGINE — run build_engine.sh first." >&2
  exit 1
fi

export OPENAI_API_KEY="$API_KEY"
echo "Serving $MODEL_NAME on http://${HOST}:${PORT}/v1 (engine=$ENGINE)"

if command -v trtllm-serve >/dev/null 2>&1; then
  exec trtllm-serve "$ENGINE" \
    --host "$HOST" \
    --port "$PORT" \
    --tokenizer "${MERGED:-$ROOT/artifacts/merged}"
fi

# Fallback: openai-compatible entrypoints shipped with some TRT-LLM versions
python -m tensorrt_llm.commands.serve \
  --engine_dir "$ENGINE" \
  --host "$HOST" \
  --port "$PORT" \
  --tokenizer_dir "${MERGED:-$ROOT/artifacts/merged}"
