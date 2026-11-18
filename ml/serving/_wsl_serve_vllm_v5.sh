#!/usr/bin/env bash
# Serve IADAF v5A/v5B (Ministral 3) with vLLM — multi-user continuous batching.
# Usage:
#   bash ml/serving/_wsl_serve_vllm_v5.sh v5a
#   bash ml/serving/_wsl_serve_vllm_v5.sh v5b
#   VLLM_MODEL=/path/to/merged bash ml/serving/_wsl_serve_vllm_v5.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TRACK="${1:-v5a}"
PORT="${VLLM_PORT:-8000}"
MAX_LEN="${VLLM_MAX_MODEL_LEN:-8192}"
MAX_SEQS="${VLLM_MAX_NUM_SEQS:-6}"
GPU_UTIL="${VLLM_GPU_MEM_UTIL:-0.90}"
LOG="/tmp/vllm-iadaf-${TRACK}.log"

case "$TRACK" in
  v5a|A|a)
    DEFAULT_MODEL="$ROOT/ml/artifacts/merged_v5a"
    ;;
  v5b|B|b)
    DEFAULT_MODEL="$ROOT/ml/artifacts/merged_v5b"
    ;;
  *)
    DEFAULT_MODEL="$TRACK"
    TRACK="custom"
    ;;
esac
MODEL="${VLLM_MODEL:-$DEFAULT_MODEL}"

if [[ ! -d "$MODEL" ]] && [[ ! -f "$MODEL/config.json" ]]; then
  echo "Model HF manquant: $MODEL" >&2
  echo "Merge LoRA d'abord (export_gguf.py --merge-only ou train sans SkipExport)." >&2
  exit 1
fi

if ! command -v vllm >/dev/null 2>&1; then
  echo "vllm introuvable dans le PATH WSL." >&2
  echo "Install ex.: pip install -U vllm  (CUDA matching your torch)" >&2
  exit 1
fi

if [[ -f /tmp/vllm-iadaf.pid ]]; then
  kill -9 "$(cat /tmp/vllm-iadaf.pid)" 2>/dev/null || true
fi
pkill -9 -f 'vllm serve' 2>/dev/null || true
sleep 2

echo "Starting vLLM IADAF $TRACK: $MODEL max_len=$MAX_LEN max_seqs=$MAX_SEQS port=$PORT"

# Ministral / Mistral3: tokenizer_mode + tool parser
# Après SFT merge HF classique, mistral flags aident si config mistral3 ;
# sinon vLLM détecte souvent tout seul — on garde les flags utiles tools.
nohup vllm serve "$MODEL" \
  --host 0.0.0.0 \
  --port "$PORT" \
  --trust-remote-code \
  --max-model-len "$MAX_LEN" \
  --max-num-seqs "$MAX_SEQS" \
  --gpu-memory-utilization "$GPU_UTIL" \
  --enable-auto-tool-choice \
  --tool-call-parser mistral \
  --served-model-name "iadaf-${TRACK}" \
  >"$LOG" 2>&1 &
echo $! >/tmp/vllm-iadaf.pid

for i in $(seq 1 180); do
  if curl -sf "http://127.0.0.1:${PORT}/v1/models" >/dev/null 2>&1; then
    echo "VLLM_IADAF_READY http://127.0.0.1:${PORT}/v1  track=$TRACK"
    curl -s "http://127.0.0.1:${PORT}/v1/models" | head -c 500; echo
    exit 0
  fi
  if ! kill -0 "$(cat /tmp/vllm-iadaf.pid)" 2>/dev/null; then
    echo "vllm died"; tail -80 "$LOG"; exit 1
  fi
  (( i % 6 == 0 )) && { echo "waiting $i…"; tail -5 "$LOG" || true; }
  sleep 5
done
echo timeout; tail -100 "$LOG"; exit 1
