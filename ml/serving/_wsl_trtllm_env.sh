#!/usr/bin/env bash
# Source this before running TensorRT-LLM in WSL.
# Override via env: MAMBA_ROOT_PREFIX, TRTLLM_VENV, TRTLLM_GCC_BIN, TRTLLM_INCLUDE_SHADOW
export MAMBA_ROOT_PREFIX="${MAMBA_ROOT_PREFIX:-$HOME/micromamba}"
MPI_PREFIX="$MAMBA_ROOT_PREFIX/envs/trtmpi"
VENV="${TRTLLM_VENV:-$HOME/.venv-trtllm}"
SITE="$VENV/lib/python3.12/site-packages"
GCC_BIN="${TRTLLM_GCC_BIN:-$HOME/bin}"
INCLUDE_SHADOW="${TRTLLM_INCLUDE_SHADOW:-$HOME/include-shadow/python3.12}"
# pip nvidia/cu13: keep libnvrtc for TRT-LLM runtime; do NOT use its nvcc/ptxas —
# cu13 ptxas rejects PTX 9.5 needed for sm_120f FlashInfer JIT ("current version is 9.0").
# micromamba CUDA 13.5 toolkit compiles FlashInfer cleanly on Blackwell.
CU13="$SITE/nvidia/cu13"
export CUDA_HOME="$MPI_PREFIX"
export CUDA_PATH="$MPI_PREFIX"
export CC="${CC:-$GCC_BIN/gcc}"
export CXX="${CXX:-$GCC_BIN/g++}"
export CUDAHOSTCXX="$CXX"
export CUDACXX="$MPI_PREFIX/bin/nvcc"

mkdir -p "$HOME/lib"
# Prefer micromamba libpython when the distro has no system libpython3.12 (e.g. Ubuntu 26.04).
if [[ -e /usr/lib/x86_64-linux-gnu/libpython3.12.so.1.0 ]]; then
  ln -sfn /usr/lib/x86_64-linux-gnu/libpython3.12.so.1.0 "$HOME/lib/libpython3.12.so"
elif [[ -e "$MPI_PREFIX/lib/libpython3.12.so" ]]; then
  ln -sfn "$MPI_PREFIX/lib/libpython3.12.so" "$HOME/lib/libpython3.12.so"
fi

# conda 13.5 nvcc/ptxas/cicc first, then gcc wrappers, then venv (never pip cu13/bin)
export PATH="$MPI_PREFIX/bin:$GCC_BIN:$VENV/bin:/usr/bin:/bin:/usr/lib/wsl/lib"

NV_LIBS=$(find "$SITE/nvidia" -type d -name lib 2>/dev/null | tr '\n' ':')
NV_INCS=$(find "$SITE/nvidia" -type d -name include 2>/dev/null | tr '\n' ':')
export LD_LIBRARY_PATH="/usr/lib/wsl/lib:$CU13/lib:$SITE/nvidia/cuda_nvrtc/lib:$HOME/lib:$MPI_PREFIX/lib:$MPI_PREFIX/lib64:${NV_LIBS}${LD_LIBRARY_PATH:-}"
export LIBRARY_PATH="$CU13/lib:$MPI_PREFIX/lib:$MPI_PREFIX/lib64:$MPI_PREFIX/targets/x86_64-linux/lib/stubs:/usr/lib/wsl/lib:${LIBRARY_PATH:-}"
# FlashInfer JIT needs headers like curand_kernel.h from pip nvidia-* packages.
export CPATH="${NV_INCS}${INCLUDE_SHADOW}:$MPI_PREFIX/include:$CU13/include:${CPATH:-}"
export C_INCLUDE_PATH="$CPATH"
export CPLUS_INCLUDE_PATH="$CPATH"
export OMPI_MCA_btl=^openib
export OMPI_MCA_opal_cuda_support=true

# shellcheck disable=SC1091
source "$VENV/bin/activate"
