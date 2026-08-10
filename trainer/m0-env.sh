#!/usr/bin/bash

export NATSUKI_M0_HOT_ROOT=/srv/var/jdh8
export NATSUKI_M0_COLD_ROOT=/srv/home/jdh8/natsuki/m0
export NATSUKI_M0_MODEL_ROOT="$NATSUKI_M0_HOT_ROOT/models/natsuki/m0"
export NATSUKI_M0_BUILD_ROOT="$NATSUKI_M0_HOT_ROOT/build"
export NATSUKI_M0_CUDA_RUNTIME="$NATSUKI_M0_HOT_ROOT/runtime/cuda12.9"
export NATSUKI_M0_CONTAINER_ROOT="$NATSUKI_M0_HOT_ROOT/containers/storage"
export NATSUKI_M0_CONTAINER_RUNROOT="$NATSUKI_M0_HOT_ROOT/containers/run"

export TMPDIR="$NATSUKI_M0_HOT_ROOT/tmp/natsuki-m0"
export HF_HOME="$NATSUKI_M0_HOT_ROOT/.cache/huggingface"
export UV_CACHE_DIR="$NATSUKI_M0_HOT_ROOT/.cache/uv-natsuki"
export UV_PYTHON_INSTALL_DIR="$NATSUKI_M0_HOT_ROOT/uv/python"
export CUDA_CACHE_PATH="$NATSUKI_M0_HOT_ROOT/.cache/nvidia-natsuki"
export XDG_CACHE_HOME="$NATSUKI_M0_HOT_ROOT/.cache"
export LD_LIBRARY_PATH="$NATSUKI_M0_CUDA_RUNTIME${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
