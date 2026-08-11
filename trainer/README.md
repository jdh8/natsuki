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

No teacher currently clears the quality gate. New candidates must be named
explicitly and start with the default 12-row screen in a fresh output directory:

```sh
uv run --project trainer python trainer/m2.py schedule
export TEACHER_MODEL=org/candidate-model
export TEACHER_URL=http://127.0.0.1:18081/v1/chat/completions
export TEACHER_TEMPERATURE=0.15
uv run --project trainer python trainer/m2.py run \
  --output-dir trainer/out/m2-candidate
```

Custom endpoints receive no secret API key; use a loopback SSH tunnel for a
remote local server. The hosted Groq endpoint instead requires
`GROQ_API_KEY`. Each row records the model, endpoint, temperature, and recipe
fingerprint, so resume rejects mixed experiments.

`run` maintains the rolling top-50 four-gram opener ban and writes a readable
transcript plus `review.csv`. Only an approved candidate should be rerun with
`--limit 100` in a fresh directory. Read every transcript entry, set each
`register_persona_pass` cell to `true` or `false`, add useful notes, then
validate and summarize a complete 100-row pilot:

```sh
uv run --project trainer python trainer/m2.py summary
```

There is deliberately no automatic rerun gate; content failures stay in the
pilot so the summary measures the teacher actually used.

The first completed pilot measured 51 register/persona passes and 49 failures,
zero AI disclosures, zero self-prefixes, zero structural failures, and one
sentence-count violation. These diagnostic results remain local under
`trainer/out/m2/`.

The next Groq candidate, `qwen/qwen3.6-27b`, was rejected at row 2: row 1
narrowly passed, but row 2 failed the required speaker/message shape through
all seven retries and its inspected reply belittled a sincere success. The
runner handles that model's non-thinking JSON Object Mode only to keep the
failed screen reproducible.

The no-spend self-hosted Hermes 4.3 36B screen completed all 12 structurally
valid rows on 2026-08-12, but strict review passed only 2/12. It belittled the
small success in row 2, missed several required intents and reply shapes, and
had one sentence-count violation. Do not run its fresh 30.

GLM-4.7-Flash Q8_0 then passed the dl02 offload/template probe and persisted one
weakly voiced frozen row. Row 2 exhausted seven retries without an accepted
two-speaker conversation; the final error was `expected 2 speakers, got 1`.
Reject the incomplete screen and do not run its fresh 30. No teacher is queued;
future screens must fit dl02. See
[`docs/m2-teacher-scout.md`](../docs/m2-teacher-scout.md). M3 remains blocked.

## M2 canon-only probe

With no approved teacher, the probe trains the student base directly on the
946 M1 gold pairs plus 500 public instruct replay rows
(`allenai/tulu-3-sft-mixture`, streamed once) and measures what canon alone
buys.  It runs on the dev box; the wrapper only redirects caches to
`/srv/var` where that hot root exists.

```sh
./trainer/m2-probe data
./trainer/m2-probe train --max-steps 10   # smoke: VRAM fit + masking assert
./trainer/m2-probe train                  # full two epochs
./trainer/m2-probe sniff
./trainer/m0 blind \
  --left trainer/out/m0/qwen.sniff.jsonl \
  --right trainer/out/m2-probe/probe.sniff.jsonl \
  --output trainer/out/m2-probe/blind-review.md \
  --key-output trainer/out/m2-probe/blind-key.json
```

Gold rows sample a system-prompt variant per row (roughly a quarter each of
none / ultra-short / medium paraphrase / full production prompt); replay rows
are verbatim and never carry the persona prompt.  Training pins the official
Instruct-2507 chat template committed as
`qwen3-instruct-chat-template.jinja` — unsloth's mirror silently substitutes
a thinking-style template whose empty `<think>` blocks the adapter then
parrots — refuses to start if response masking leaves any sample fully
masked or any row renders a think block, and the adapter ships
with a `probe.json` sidecar recording the base model, LoRA config, data
hashes, system-prompt hash, tokenized chat-template fixture, and eval-loss
curve.  Read the blinded review by hand: canon-only beating stock Qwen
demotes the synthetic corpus from load-bearing to augmentation; losing
measures the gap a future teacher must close.

The host CUDA 13.1 headers conflict with Fedora 44's glibc declarations, and
CUDA 13 cannot compile the Pascal PTX used by the GTX-16 MMQ experiment.  The
build recipe therefore uses a rootless CUDA 12.9.1 builder whose complete
Podman store lives under `/srv/var/jdh8/containers`; the resulting binaries run
against the newer host driver normally.  The small set of CUDA 12 runtime
libraries needed by those binaries is copied from the pinned builder to
`/srv/var/jdh8/runtime/cuda12.9` and selected through `LD_LIBRARY_PATH`; no host
CUDA package is replaced.
