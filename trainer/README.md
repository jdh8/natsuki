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

## M1 canon extraction

The extractor reads the installed Steam copies only. It pins `unrpa`, the
Python-3 `unrpyc` commit, UnityPy, and TypeTreeGeneratorAPI; it also rejects
unknown source hashes and Steam build IDs before writing anything.

```sh
uv run --project trainer python trainer/extract.py
```

This writes ignored local files under `trainer/data/m1/`: 2,936 provenance
rows in `canon-lines.jsonl`, 946 production-shaped pairs in
`gold-pairs.jsonl`, and source hashes/counts in `report.json`. Original DDLC
contributes the 1,520 physical Natsuki lines expanded to 2,319 route rows.
DDLC Plus contributes 617 lines from only `nm1-4`, `sn1-4`, and `ny1-5`; its
duplicate base game and all other Side Stories are excluded. Never commit or
send these canon-derived files to a hosted model.

Use explicit paths for non-default Steam libraries:

```sh
uv run --project trainer python trainer/extract.py \
  --ddlc-archive /path/to/DDLC/game/scripts.rpa \
  --plus-root /path/to/DDLC-Plus
```

## M2 teacher pilot

The hosted request contains only the original paraphrased
[`m2-voice.md`](m2-voice.md) and a synthetic attribute tuple—never M1 text.
The deterministic grid has 100 rows, exactly 18 adversarial conversations,
and 35 warm conversations.

```sh
uv run --project trainer python trainer/m2.py schedule
export GROQ_API_KEY=...
uv run --project trainer python trainer/m2.py run
```

`run` calls `openai/gpt-oss-120b` sequentially through `urllib`, resumes from
`trainer/out/m2/pilot.jsonl`, and maintains the rolling top-50 four-gram opener
ban. It writes a readable transcript and `review.csv`. Read every transcript
entry, set each `register_persona_pass` cell to `true` or `false`, add useful
notes, then validate and summarize the diagnostic-only first pilot:

```sh
uv run --project trainer python trainer/m2.py summary
```

There is deliberately no automatic rerun gate; content failures stay in the
pilot so the summary measures the teacher actually used.

The first completed pilot measured 51 register/persona passes and 49 failures,
zero AI disclosures, zero self-prefixes, zero structural failures, and one
sentence-count violation. These diagnostic results remain local under
`trainer/out/m2/`.

The host CUDA 13.1 headers conflict with Fedora 44's glibc declarations, and
CUDA 13 cannot compile the Pascal PTX used by the GTX-16 MMQ experiment.  The
build recipe therefore uses a rootless CUDA 12.9.1 builder whose complete
Podman store lives under `/srv/var/jdh8/containers`; the resulting binaries run
against the newer host driver normally.  The small set of CUDA 12 runtime
libraries needed by those binaries is copied from the pinned builder to
`/srv/var/jdh8/runtime/cuda12.9` and selected through `LD_LIBRARY_PATH`; no host
CUDA package is replaced.
