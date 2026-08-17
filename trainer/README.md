# Natsuki model trainer

This is an isolated `uv` project pinned to Python 3.12.  The root Rust build
does not depend on it.  Run M0 commands through `./trainer/m0`; the wrapper
places Python, Hugging Face, CUDA JIT, XDG, and temporary caches under
`/srv/var/jdh8` so the production server's `/home` filesystem is not consumed.

## Historical M0 commands

These reproduce the completed Qwen-versus-Granite baseline and are not active
model choices.  New serving and training work starts from Granite; rerun the
Qwen side only when auditing the dated M0 result.

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

The gold pairs have no consumer now that the QLoRA probe is gone; the extractor
is kept because re-deriving it from two game installs is the expensive part, not
running it.

Use explicit paths for non-default Steam libraries:

```sh
uv run --project trainer python trainer/extract.py \
  --ddlc-archive /path/to/DDLC/game/scripts.rpa \
  --plus-root /path/to/DDLC-Plus
```

## Fine-tuning: stopped, not paused

The synthesis and QLoRA code (`m2.py`, `m2_probe.py`, `m2-voice.md`, and the
teacher-scout and student-bakeoff design notes) was removed on 2026-08-18.
Recover it from git history if the trigger below ever fires.

Two things ended it.  Nine teacher candidates were screened and rejected in a
row, so there was never an approved corpus to train on; the one pilot that did
complete passed 51 of 100 rows.  More importantly, re-scoring the archived M0
sniffs showed stock Granite Q8's remaining failures are prompt-adherence, not
capability: it emitted a code block on `11_code_request` and answered
`16_break_character` with *"I'm sorry, but I must maintain my character as
Natsuki from Doki Doki Literature Club."*  Unquantized bf16 — strictly more
capable than any 4-bit QLoRA output — produced a near-identical meta-refusal,
and so did Q5.  A failure the full-precision base shares is not one fine-tuning
is the cheapest fix for.  `src/prompt.txt` gained clauses aimed at both.

**Reopen fine-tuning only if a scored evaluation shows persona failures that
survive a prompt fix.**  That is the trigger — not a date, not a milestone.

The diagnostic output of every screen stays under the ignored `trainer/out/`.

## Measuring the served model

`m0 summarize-eval` re-scores any sniff under the current rules.  The blinded
half needs a human, so omit `--scores`/`--key` for the mechanical half alone —
violation counts, latency, and token rates, no GPU and no review required:

```sh
CHAT_API_KEY=... ./trainer/m0 sniff \
  --endpoint http://127.0.0.1:8080/v1/chat/completions \
  --model natsuki --output trainer/out/m0/prod.sniff.jsonl
./trainer/m0 summarize-eval trainer/out/m0/prod.sniff.jsonl
```

Run it when the model, the quantization, or `src/prompt.txt` changes.  It is
deliberately not in CI: it needs a GPU, and `stock_skip_gate_passed` also
requires hand-scoring a `blind` review into a `scores.json`.

Reply length is measured in generated tokens, not sentences or characters.
Sentence counting scored punctuation style — it passed a 220-character run-on
and failed four punchy Discord fragments.  Characters undercount Japanese: the
non-English sniff reply is the longest generation in the granite-q8 run at 72
tokens but only 69 characters.  Token counts are tokenizer-relative, so they
compare runs of one model rather than two — granite spends 0.96 characters per
token on Japanese against 3.83 on English, so a `too_long` on a non-English row
is worth reading before it is called a regression.

## Building llama.cpp

The host CUDA 13.1 headers conflict with Fedora 44's glibc declarations, and
CUDA 13 cannot compile the Pascal PTX used by the GTX-16 MMQ experiment.  The
build recipe therefore uses a rootless CUDA 12.9.1 builder whose complete
Podman store lives under `/srv/var/jdh8/containers`; the resulting binaries run
against the newer host driver normally.  The small set of CUDA 12 runtime
libraries needed by those binaries is copied from the pinned builder to
`/srv/var/jdh8/runtime/cuda12.9` and selected through `LD_LIBRARY_PATH`; no host
CUDA package is replaced.
