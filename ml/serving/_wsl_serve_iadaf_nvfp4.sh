#!/usr/bin/env bash
# Serve IADAF fine-tune NVFP4 (ModelOpt PTQ) with TRT-LLM scale profile.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_wsl_trtllm_env.sh"

MODEL="${TRTLLM_MODEL:-$ROOT/ml/artifacts/iadaf_qwen3_8b_nvfp4}"
PORT="${TRTLLM_PORT:-8000}"
LOG=/tmp/trtllm-serve-iadaf-nvfp4.log
CFG=/tmp/qwen3_iadaf_nvfp4_scale.yml

if [[ ! -f "$MODEL/hf_quant_config.json" && ! -f "$MODEL/config.json" ]]; then
  echo "Missing quantized model: $MODEL" >&2
  exit 1
fi

MAX_BATCH="${TRTLLM_MAX_BATCH:-4096}"
MAX_SEQ="${TRTLLM_MAX_SEQ:-512}"
MAX_NUM_TOKENS="${TRTLLM_MAX_NUM_TOKENS:-16384}"

cat > "$CFG" <<EOF
disable_overlap_scheduler: false
attn_backend: FLASHINFER
cuda_graph_config:
  enable_padding: true
  batch_sizes: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096]
kv_cache_config:
  free_gpu_memory_fraction: 0.90
EOF

if [[ -f /tmp/trtllm.pid ]]; then kill -9 "$(cat /tmp/trtllm.pid)" 2>/dev/null || true; fi
pkill -9 -x trtllm-serve 2>/dev/null || true
sleep 3

echo "Starting IADAF NVFP4: $MODEL max_batch=$MAX_BATCH max_seq=$MAX_SEQ"
nohup trtllm-serve serve "$MODEL" --host 0.0.0.0 --port "$PORT" --trust_remote_code \
  --config "$CFG" \
  --max_batch_size "$MAX_BATCH" --max_num_tokens "$MAX_NUM_TOKENS" --max_seq_len "$MAX_SEQ" \
  --kv_cache_free_gpu_memory_fraction 0.90 \
  >"$LOG" 2>&1 &
echo $! >/tmp/trtllm.pid

for i in $(seq 1 240); do
  if curl -sf "http://127.0.0.1:${PORT}/v1/models" >/dev/null 2>&1; then
    echo "IADAF_NVFP4_READY http://127.0.0.1:${PORT}/v1"
    curl -s "http://127.0.0.1:${PORT}/v1/models" | head -c 400; echo
    exit 0
  fi
  if ! kill -0 "$(cat /tmp/trtllm.pid)" 2>/dev/null; then
    echo "server died"; tail -80 "$LOG"; exit 1
  fi
  (( i % 6 == 0 )) && { echo "waiting $i…"; tail -5 "$LOG" || true; }
  sleep 5
done
echo timeout; tail -100 "$LOG"; exit 1
