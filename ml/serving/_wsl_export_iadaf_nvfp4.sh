#!/usr/bin/env bash
# Quantize merged IADAF HF → NVFP4 for TRT-LLM (Blackwell).
# Prerequisite: LoRA ml/artifacts/lora_v3_1 (merge BF16 créé à la volée si absent)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
sed -i 's/\r$//' "$SCRIPT_DIR/_wsl_trtllm_env.sh" "$SCRIPT_DIR/export_iadaf_nvfp4.py" || true
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_wsl_trtllm_env.sh"

# free GPU
if [[ -f /tmp/trtllm.pid ]]; then kill -9 "$(cat /tmp/trtllm.pid)" 2>/dev/null || true; fi
pkill -9 -x trtllm-serve 2>/dev/null || true
sleep 2

export IADAF_ADAPTER="${IADAF_ADAPTER:-$ROOT/ml/artifacts/lora_v3_1}"
export IADAF_MERGED="${IADAF_MERGED:-$ROOT/ml/artifacts/merged_iadaf_v3_1}"
export IADAF_NVFP4="${IADAF_NVFP4:-$ROOT/ml/artifacts/iadaf_qwen3_8b_nvfp4}"
export NVFP4_CFG="${NVFP4_CFG:-NVFP4_DEFAULT_CFG}"
export CALIB_SIZE="${CALIB_SIZE:-128}"
export SKIP_MERGE="${SKIP_MERGE:-1}"
export SKIP_QUANT="${SKIP_QUANT:-0}"

if [[ ! -f "$IADAF_MERGED/config.json" ]]; then
  echo "Merged missing — running merge in WSL (CPU, slow on /mnt/c)…"
  export SKIP_MERGE=0
fi

echo "=== IADAF NVFP4 export ==="
echo "merged=$IADAF_MERGED"
echo "out=$IADAF_NVFP4 cfg=$NVFP4_CFG"
python "$SCRIPT_DIR/export_iadaf_nvfp4.py"
echo "DONE — serve with:"
echo "  bash $SCRIPT_DIR/_wsl_serve_iadaf_nvfp4.sh"
