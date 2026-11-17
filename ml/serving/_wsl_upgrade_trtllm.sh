#!/usr/bin/env bash
# Upgrade TensorRT-LLM to a nightly with Eagle3/Qwen support.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_wsl_trtllm_env.sh"

echo "=== current ==="
python -c "import tensorrt_llm; print(tensorrt_llm.__version__)"

echo "=== list nightlies (top) ==="
pip index versions tensorrt_llm --pre \
  --index-url https://pypi.nvidia.com/trtllm_nightly/ 2>&1 | head -40 || true

# Prefer newest pre-release from NVIDIA nightly index; fall back to --upgrade on pypi+nvidia
echo "=== upgrade ==="
pip uninstall -y nvidia-cutlass-dsl nvidia-cutlass-dsl-libs-base \
  nvidia-cutlass-dsl-libs-core nvidia-cutlass-dsl-libs-cu12 nvidia-cutlass-dsl-libs-cu13 2>/dev/null || true

# Try nightly first (contains newer Eagle3/Qwen). Use --pre.
if pip install -U --pre "tensorrt_llm" \
  --extra-index-url https://pypi.nvidia.com/trtllm_nightly/ \
  --extra-index-url https://pypi.nvidia.com 2>&1 | tee /tmp/trtllm-upgrade.log; then
  echo NIGHTLY_OK
else
  echo "nightly failed, trying stable -U"
  pip install -U "tensorrt_llm" --extra-index-url https://pypi.nvidia.com
fi

python - <<'PY'
import tensorrt_llm
from tensorrt_llm.llmapi.llm_args import DecodingBaseConfig, EagleDecodingConfig
print("VERSION", tensorrt_llm.__version__)
# Probe Eagle3 / qwen arch support
src = open(__import__("inspect").getfile(DecodingBaseConfig)).read() if False else ""
import inspect
print(inspect.getsource(DecodingBaseConfig.from_dict)[:1200])
fields = getattr(EagleDecodingConfig, "model_fields", {})
arch = fields.get("eagle3_model_arch")
print("eagle3_model_arch field:", arch)
# try Eagle3 decoding type
try:
  cfg = DecodingBaseConfig.from_dict({
    "decoding_type": "Eagle3",
    "max_draft_len": 3,
    "speculative_model": "AngelSlim/Qwen3-8B_eagle3",
  })
  print("Eagle3_OK", type(cfg).__name__, getattr(cfg, "eagle3_model_arch", None))
except Exception as e:
  print("Eagle3_FAIL", e)
  try:
    cfg = DecodingBaseConfig.from_dict({
      "decoding_type": "Eagle",
      "max_draft_len": 3,
      "speculative_model": "AngelSlim/Qwen3-8B_eagle3",
    })
    print("Eagle_OK", type(cfg).__name__, getattr(cfg, "eagle3_model_arch", None))
  except Exception as e2:
    print("Eagle_FAIL", e2)
PY
echo UPGRADE_DONE
