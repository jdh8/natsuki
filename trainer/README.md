# Natsuki model trainer

This is an isolated `uv` project pinned to Python 3.12.  The root Rust build
does not depend on it.  Run M0 commands through `./trainer/m0`; the wrapper
places Python, Hugging Face, CUDA JIT, XDG, and temporary caches under
`/srv/var/jdh8` so the production server's `/home` filesystem is not consumed.

## M0 commands

```sh
./trainer/m0-download-models
./trainer/m0-build-llama
./trainer/m0 sample-vram
./trainer/m0 summarize-vram --output trainer/out/m0/vram-summary.json
./trainer/m0-bench
./trainer/m0-serve-eval qwen mmq on
./trainer/m0 sniff --model qwen-stock --output trainer/out/m0/qwen.sniff.jsonl
./trainer/m0 blind \
  --left trainer/out/m0/qwen.sniff.jsonl \
  --right trainer/out/m0/granite.sniff.jsonl \
  --output trainer/out/m0/blind-review.md \
  --key-output trainer/out/m0/blind-key.json
```

`m0-capacity-job` is the persistent 24-hour sampler entry point.  After the
window closes it summarizes the capacity gate, assembles `m0-report.json`, and
copies only that compact report plus its `SHA256SUMS` manifest to the cold root.

`trainer/data/` and `trainer/out/` are intentionally ignored.  Regenerate
artifacts from the committed prompt fixture and recipe instead of committing
raw data or model output.

The host CUDA 13.1 headers conflict with Fedora 44's glibc declarations, and
CUDA 13 cannot compile the Pascal PTX used by the GTX-16 MMQ experiment.  The
build recipe therefore uses a rootless CUDA 12.9.1 builder whose complete
Podman store lives under `/srv/var/jdh8/containers`; the resulting binaries run
against the newer host driver normally.  The small set of CUDA 12 runtime
libraries needed by those binaries is copied from the pinned builder to
`/srv/var/jdh8/runtime/cuda12.9` and selected through `LD_LIBRARY_PATH`; no host
CUDA package is replaced.
