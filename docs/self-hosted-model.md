# Self-hosted Natsuki model

Natsuki's chat feature called a hosted 70B and steered it with a ~180-token
system prompt ([`src/chat.rs`](../src/chat.rs)).  This document planned the
replacement: a small model fine-tuned on this one persona, served from our own
hardware.

**Outcome (2026-08-18): the serving half shipped, the fine-tuning half did
not.**  Production runs stock `granite-4.1-3b` at Q8_0 on the RTX 4070 SUPER,
steered by the same prompt.  M2-M7 are stopped — no teacher ever cleared the
gate, and the stock model's remaining failures turned out to be prompt
adherence that unquantized bf16 shares, so fine-tuning was not the cheapest fix
for them.  The reasoning is under Milestones; the bet below is unresolved, not
won.  Read the rest as the record of how that was decided.

The bet was that a small specialist beats a prompted 70B **at being Natsuki**,
while being much worse at everything else.  That trade is right here — the bot
emits short tsundere replies and nothing else.

Legend: ⬜ not started · 🚧 in progress · ✅ done · ❌ stopped.

Numbers below come from an 11-agent research pass in which every claim was
independently fact-checked; where a checker corrected the original, the
correction is what appears here.  Anything still unverified says so.

## Decisions

| Question | Decision |
| --- | --- |
| Training code home | `trainer/`, its own `uv` project, invisible to `cargo` |
| Backend switch | `CHAT_URL` + `CHAT_MODEL`, Groq defaults preserved |
| Publishing | Weights + synthetic corpus + recipe.  Canon-derived rows withheld. |
| Model-origin policy | Default to non-Chinese families; require an explicit, benchmark-backed exception when credible alternatives trail by roughly 1–2 model generations |
| Base and deployed model | `ibm-granite/granite-4.1-3b` (Apache-2.0) |
| Teacher | None — nine candidates screened and rejected; hunt closed with M2 |
| A/B baseline | `llama-3.3-70b-versatile` — the behaviour Granite replaced |
| Judge | Human, on `m0 blind` output; the LLM-judge tier was never built |

A permissively licensed teacher is a deliberate choice.  Llama 3.3's Community License
§1.b.i requires any *distributed* model distilled from Llama to be **named
beginning with "Llama"**, with prominent "Built with Llama" attribution — even
on an Apache-2.0 base.  Since we publish, an Apache-2.0 or MIT teacher removes
the obligation outright.  Keeping teacher, baseline, and judge as three different
models also keeps self-preference bias out of the evaluation.

The origin preference is a selection gate, not a historical purge or an
unconditional blacklist.  A Chinese model is ineligible for an active student,
teacher, judge, or deployment role unless no credible non-Chinese candidate is
within roughly one or two release/architecture generations; the exception must
name the alternatives, show the benchmark gap, and receive explicit approval.
The queued Kimi/DeepSeek teacher screen is such a pending exception: every
screened non-Chinese teacher missed the frozen quality gate, and no request is
sent without approval.  Past Qwen measurements remain below for auditability.

## Constraints

| | Dev (train) | Prod (serve) |
| --- | --- | --- |
| GPU | RTX 4070 SUPER, 12282 MiB, cc 8.9 | GTX 1660, 6 GB, cc 7.5 |
| Tensor cores | yes (Ada) | **none** (TU116) |
| Usable VRAM | ~8.8 GB with a desktop session up | **~4.5 GB** assumed — M0 must confirm |

**Update 2026-08-11: serving is routed to the RTX 4070 SUPER** (see M0).  The
prod column stays as the record of why the choices below look the way they do;
1660-specific reasoning is marked where it no longer binds.

Two facts shape everything downstream.

**TU116 has no tensor cores.**  From llama.cpp's own CUDA scoreboard
(Llama-2 7B Q4_0), the GTX 1660 does **148.9 t/s prefill / 41.4 t/s decode**
against an RTX 2060 SUPER's 1420.2 / 60.0 — same generation, but the 2060 has
tensor cores.  Decode is fine, at ~82% of the card's bandwidth ceiling.  Prefill
is roughly 10× slower than any tensor-core card, so a ~1,500-token context costs
about 6 s cold.

That makes prompt-prefix stability worth more than any quantization choice, which
is why history is evicted in chunks of six rather than one exchange at a time
(`EVICT_CHUNK` in [`src/chat.rs`](../src/chat.rs)).  Trimming per-turn would
shift the prefix on every single message and force a full re-prefill each time.

**The prod box runs a desktop session**, so 0.5-1.5 GB of its 6 GB is already
gone.  The entire memory budget rests on this estimate.  Moving the display to an
integrated GPU would recover all of it and is the single highest-leverage fix
available if the numbers come up short.

## Where the code lives

`trainer/`, following the three rules `jdh8/pons` establishes for `pons/trainer`:

1. **Isolated toolchain.**  `pons/trainer` is a separate cargo workspace so the
   root build never touches it.  Ours is a `uv` project with a pinned Python
   3.12 — the system interpreter is 3.14, ahead of what the ML stack supports.
   `cargo build`, `cargo test`, and `.github/workflows/rust.yml` stay untouched.
   *Deviation:* `pons/trainer` is Rust/candle; this one is Python, because LoRA
   fine-tuning has no practical Rust path.  The isolation principle carries over
   even though the language does not.
2. **Commit the recipe, not the data.**  `pons/trainer/README.md` puts it
   plainly: *"Don't commit the data; regenerate it from the recorded seed — that
   is how reproducibility is preserved."*  So `trainer/data/` and `trainer/out/`
   are gitignored.  This lines up exactly with the publishing decision: git holds
   the generator, HuggingFace holds the artifact, and the canon-derived rows are
   in neither.
3. **Artifacts carry a sidecar.**  pons ships metrics, data seed, and git SHA
   beside its weights because *"a model is meaningless without its exact feature
   extractor; they version together."*  The analogue is direct — **a persona is
   meaningless without its exact system prompt and chat template.**  With
   fine-tuning stopped there are no weights to ship, so the pairing lives in the
   harness instead: `m0.py` reads [`src/prompt.txt`](../src/prompt.txt) rather
   than holding a copy, and every sniff row records the exact system prompt it
   was generated under.  That is what lets the archived M0 runs be re-scored
   today — their recorded prompt still hashes to the deployed one.

## Stack

**Base: `ibm-granite/granite-4.1-3b`.**  40 layers / 40 Q heads / 8 KV heads /
head_dim 64, dense GQA, text-only and non-thinking.  Deployment selects the
first-party Q8_0 (3.37 GiB) at 4096 context; FP16 KV is 80 KiB/token, or 320
MiB at that context.  The training probe uses the BF16 checkpoint with the
official chat template and response markers.

**Superseded technical-only choice (historical):
`Qwen/Qwen3-4B-Instruct-2507`.**  Before the model-origin policy, it was selected
on technical fit alone: 36 layers / 32 Q heads / 8 KV heads / head_dim 128,
pure GQA, explicitly non-thinking.  Q5_K_M is 2.89 GB; KV is 144 KiB/token, so
576 MiB at 4096 context.

It beat the newer Qwen3.5-4B by dissolving four problems at once: no Gated
DeltaNet (llama.cpp #24712 open — GDN falls back to CPU even on an RTX 5060, and
no Turing data point exists at all), no thinking mode to suppress (#20182 open,
`enable_thinking:false` ignored), no vision tower, and no vendor warning against
QLoRA.  Runner-up is `mistralai/Ministral-3-3B-Instruct-2512`, whose `-BF16` repo
is the one to fine-tune since the default release is FP8.

**Rescanned 2026-08-10** (three-agent web pass): at that time no
released ≤5B model displaces Qwen3-4B-Instruct-2507 as a plain-GQA, text-only,
non-thinking, Apache-2.0 base.  What changed underneath:

- **Qwen3.5-4B's blockers softened, but the rejection holds.**  GDN now runs
  fully on CUDA with no arch gate (llama.cpp #19504/#20340, merged 2026-03) and
  #24712 has morphed into a VRAM-pressure scheduling bug; thinking suppression
  works via `chat_template_kwargs` and the small series defaults non-thinking.
  But the fast chunked-prefill kernel (#26001) is **Ampere-only by design** —
  Turing keeps the token-by-token recurrent prefill path permanently, on the
  axis that is already the 1660's weak spot — there is still not one Turing GDN
  benchmark anywhere, and the model carries a vision stack.  No Qwen3.6 exists
  below 27B.
- **New runner-up: `ibm-granite/granite-4.1-3b`** (2026-04, Apache-2.0), the
  only 2026 release matching the spec exactly: dense GQA, explicitly
  non-thinking, text-only, first-party GGUFs, Q5_K_M ≈ 2.4 GB.  Zero persona/RP
  track record and an enterprise-assistant default template, so it enters as M0
  sniff-test challenger, not as the pick.  It displaces Ministral-3-3B
  (vision encoder, template quirks, weak chat benches).
- **Gemma 4 fixed the license, not the fit.**  E4B is genuine Apache-2.0 — the
  Gemma-3 use-policy passthrough is gone — but its 8B raw params put Q4 at
  ~4.6–5.0 GB, over the 1660 budget; E2B fits at only 2.3B effective.
  Gemma-3-4B stays excluded: its license makes downstream users subject to a
  Google use policy updateable by URL, with delete-on-termination rights.
- Ruled out on arrival: LFM2.5-2.6B (template-forced thinking, LFM license),
  Nemotron-3-Nano-4B (Mamba-2 hybrid, thinking on by default; its Dec-2025
  license is Apache-style clean, so the exclusion is purely technical),
  Phi-4-mini (MIT, but documented "lifeless prose" and zero RP fine-tunes in
  18 months), SmolLM3-3B (clean but no edge over the incumbent, no RP record),
  Falcon-H1-3B (TII license, hybrid fragility).

**Training: Unsloth + QLoRA.**  Adapters are plain PEFT, so the choice is
reversible.  Runner-up: Axolotl.

**Serving: `llama-server` from llama.cpp — not Ollama.**  Ollama has three
independent paths that silently substitute a different chat template, all
confirmed against current `main`: `detectChatTemplate()` runs a Levenshtein scan
and swaps in the nearest built-in whenever `score < 100`, logging only at
`slog.Debug`; a built-in Go renderer auto-assigned *by GGUF architecture*
outranks an explicit `TEMPLATE` unconditionally; and `shouldUseGoTemplate()`
decides by capability heuristic rather than intent.  The terminal fallback is
`Parse("{{ .Prompt }}")` — raw concatenation with no special tokens.  A fine-tune
differing by one sentinel token lands in that trap.  `llama-server` has `--jinja`
on by default and no rewriting layer, which deletes the whole bug class.

## Data pipeline

### Extract — local only

DDLC ships Ren'Py 6.99.12.4.  Dialogue is compiled `.rpyc` inside `scripts.rpa`.
Use `unrpa`, then `unrpyc` **master** — not the `legacy` branch, which hard-
asserts Python 2.7 that Fedora 44 does not ship.  Skip `--try-harder`; DDLC is
not obfuscated and the flag is much slower.

DDLC Plus is a Unity build.  The local extractor uses pinned UnityPy and
TypeTreeGeneratorAPI with `sharedassets2.assets` and `DDLC.dll`, then XOR-decodes
the English localization bundle locally.  Only `nm1-4`, `sn1-4`, and `ny1-5`
are included: the duplicate base game and the other Side Stories are excluded.
No official dialogue leaves the machine.

### Parse

Match `^\s*(\w+)(\s+[0-9a-z]+)*\s+"(.*)"\s*$`, plus bare `^\s*"(.*)"$` for
narration.  **The sprite-attribute token is the trap**: a naive `^\s*n\s+"`
returns 827 lines instead of 1,520, a 45.6% undercount.  Speakers are
`n`=Natsuki, `s`/`m`/`y` for the others, `mc` for the protagonist spoken aloud;
unprefixed lines are his interior monologue.

Also required: strip Ren'Py text tags (53 Natsuki lines carry `{i}`, `{space=}`,
`{nw}`, `{color=}`, and the model will emit them verbatim otherwise); resolve
`[player]` and `[n_name]` in 36 lines; reset turn boundaries on `label`, `else`,
`elif`, `call`, and `jump`, not just `label`, or 12 of 585 turns inherit an
antecedent from a branch that never executed; discard `menu:` blocks, `poems.rpy`,
and python blocks.

Reassuringly, the strict regex misses zero lines, there are zero `extend`
statements, and exactly one escaped quote in all 1,520.

### Bucket

| Bucket | Count | Use |
| --- | --- | --- |
| A — gold pairs, previous turn is `mc`/`s`/`y`/`m` | **718 of 987 turns** | Direct `(user, assistant)` pairs |
| B — previous turn is narration | 235 | Scene context field only |
| C — all lines | 2,319 (1,189 unique) | Local scorer bank only |

The three selected Plus Side Stories add 617 lines, 307 turns, and 228 gold
pairs.  Combined M1 output is 2,936 canon rows, 1,294 turns, and 946 gold pairs;
the physical sources contain 1,731 unique raw texts and 1,730 after
normalization.

**Bucket B must not become the user turn.**  Base-game narration is the
protagonist's first-person interior monologue, so training on it teaches the
model that users narrate at it in third person.  That is exactly how the existing
`922-CA/DDLC-v2a-08312024` dataset ended up producing asterisk-roleplay prose —
correct for SillyTavern, wrong for Discord.

Weight `script-poemresponses` (349 formulaic lines) down; weight
`script-exclusives-natsuki` (201 lines, the manga-closet scene, the best material
in the game) up.

## Deployment

Merge the adapter into the **BF16** base — never a dequantized 4-bit one —
convert with `convert_hf_to_gguf.py`, build an imatrix from held-out transcripts
*mixed with generic text* (single-domain calibration overfits), and quantize.

**Verify the chat template survived**, comparing tokens rather than strings:
string comparison misses double-BOS and whitespace.  Serialize the expected token
list at training time and diff it on every deploy via `llama-server`'s
`/apply-template` and `/tokenize`.  Note that modern transformers writes
`chat_template.jinja` as a separate file, so reading only `tokenizer_config.json`
makes this load-bearing check "fail" for reasons unrelated to the model.

**Ship Q8_0 at 4096 context**: the 3.37-GiB artifact plus KV and CUDA runtime
measured 4,000 MiB fully offloaded on the RTX 4070 SUPER.  It beat Q5_K_M 11–6
with three ties on the fixed 20-prompt check, with five automatic violations
against Q5's seven.  llama.cpp's KLD ladder for Llama-3-8B
puts q5_K_M at 0.010762 against q4_K_M's 0.028152 — about 2.6× closer to FP16.
**Do not ship IQ4_XS**, which is *worse* than Q4_K_M (0.036334) for 0.44 GiB
saved, plus extra decode compute on a card with no tensor cores.

Measure on our own model rather than trusting that ladder: no published
KLD-vs-quant table exists for any 3-4B model, and arXiv 2411.17691 shows
degradation increasing as models shrink and as training tokens grow, which puts a
modern 4B in the fragile regime.  Use our own transcripts, not wikitext.  And per
llama.cpp's own README, *"finetunes typically result in a higher perplexity value
even though the human-rated quality of outputs increases"* — **never judge the
fine-tune by raw perplexity.**  KLD against its own FP16 is the only valid
quantization metric.

Serve with `-ngl 99` deliberately, so VRAM exhaustion is a loud CUDA OOM instead
of a silent 5-20× slowdown from partial CPU offload; `-ub 128` rather than the
default 512, which shrinks the compute buffer at negligible cost for
few-hundred-token prompts; and `-c 4096`.  Whether flash attention helps on
TU116 is unknown — no benchmark for the GTX 16-series exists, and
`llama-bench -fa 0,1` settles it in five minutes.  Building on Fedora 44 needs
`-DCMAKE_CUDA_HOST_COMPILER=/usr/bin/g++-14` (llama.cpp #22886), and the default
build ships PTX only, so expect a JIT compile on first load.

**Ada deltas (serving on the 4070, 2026-08-11).**  The flags above were shaped
by the 1660; on Ada: `-ub` can return to the default 512 (128 was a VRAM
concession), flash attention is settled-on, and the `GGML_CUDA_FORCE_MMQ` /
Turing-build questions stay M0-only artifacts.  Context 8192 becomes affordable
(KV 1.15 GiB); the 2026-08-17 stock-model benchmark selected Q8_0, while M5
still measures the merged fine-tune's KLD before release.  The constraint that
replaces VRAM scarcity is sharing: serving, the desktop session, and QLoRA runs
coexist on ~12 GB, and the 4B footprint (~3.8–5.5 GiB depending on quant and
context) is what keeps that workable.

## Evaluation

**Tier 0 — mechanical, every commit, ~10 s, 100% required.**  Zero tolerance for
special-token leakage (almost always a chat-template mismatch, and free to
detect), refusals, and AI disclosure.  Two regex traps worth naming: Python has
raised on non-leading inline flags since 3.11, so a stray second `(?i)` throws
`re.error` and the harness never runs at all; and a bare `\bLlama\b` under `(?i)`
fails the build on "I want a llama plushie".  Keep identity phrases, drop bare
vendor names.  At ≥97%: self-name prefix, length, loop detection.  Condition any
CJK rule on input language, or it contradicts the non-English bucket.

**Length is measured in generated tokens.**  Sentence counting, the original
rule, scored punctuation style rather than length: it passed a 220-character
run-on and failed four punchy Discord fragments, which is the register the bot
is aiming for.  Words undercount Japanese, which does not space-delimit, and so
do characters — the non-English sniff reply is the longest generation in the
granite-q8 run at 72 tokens but only 69 characters.  The caveat that comes with
tokens: they are tokenizer-relative, so they compare runs of one model rather
than two.  Granite spends 0.96 characters per token on Japanese against 3.83 on
English, so a `too_long` on a non-English row deserves a read before it counts
as a regression, and a cross-tokenizer bake-off wants characters as a check.

**Tier 1 — blinded pairwise review.**  `m0 blind` renders two sniff runs into
Markdown with A/B order swapped deterministically per prompt, and a separate key
file.  A human scores winner plus persona and coherence out of 5; `m0
summarize-eval` resolves them through the key into `stock_skip_gate_passed`
(zero hard-rule failures and both dimensions ≥4).  Omit `--scores`/`--key` to
get the Tier 0 half alone, which needs no human and no GPU.

Tiers beyond this were specified against a fine-tune that no longer exists —
held-out prompt sets, tinyMMLU-class capability regression, and an LLM-judged
A/B against the prompted 70B.  See the git history if a future tuned model
brings the question back.

## Milestones

Each names a **deliverable**, a **measure**, and its **deps**.

- ✅ **M-1 Configurable backend.**  *Deliverable:* `CHAT_URL` / `CHAT_MODEL` env
  vars, optional `GROQ_API_KEY`, chunked history eviction.  *Measure:* smoke test
  green against Groq with defaults unchanged.  *Deps:* none.  **Done** in 3.3.0 —
  this is what lets M0 point the bot at a local server.

- 🚧 **M0 Measure the prod box, and the do-nothing baseline.**  *Deliverable:*
  a day of `nvidia-smi` samples with the desktop up; `llama-bench -fa 0,1`; the
  bot pointed at stock Qwen3-4B-Instruct-2507 — and, same protocol, stock
  granite-4.1-3b as challenger — with the **current, unchanged** system prompt.  *Measure:* p99 free VRAM ≥4.0 GiB; full offload at ≥30 tok/s;
  a 20-prompt sniff test.  *Deps:* M-1.
  **This milestone can cancel the project, in either direction.**  If the stock
  model already holds character, ship the prompted 4B and skip fine-tuning
  entirely.  If VRAM comes up short, serve on the 4070 rather than reducing the
  quantization quality, partially offloading to the CPU, or choosing a smaller
  model.  Do this first; it is the cheapest thing that can invalidate everything
  below.  Reproducible M0 tooling lives in `trainer/`, with raw output ignored
  under `trainer/out/m0/`.  The clean 24-hour prod sample started at 2026-08-11
  00:48 CST and will finalize its compact report automatically under
  `/srv/home/jdh8/natsuki/m0`.

  **Interim M0 result (2026-08-11):** both stock Q5_K_M models fully offloaded
  and every measured decode configuration cleared 30 tok/s.  MMQ plus flash
  attention won end-to-end latency because it raised 1,536-token prefill from
  245 to 769 tok/s for Qwen and from 268 to 884 tok/s for Granite.  Neither
  stock model clears the quality gate: blinded Granite won 11/20 with three
  ties (below 14), scored 3.15/5 persona, and had one hard refusal; Qwen scored
  3.8/5 persona and had hard-rule failures on 15/20 prompts.  Continue to M1.
  A 31-minute preflight retained 4,096 MiB free in only 47.6% of samples, so the
  1660 capacity gate looks unlikely but remains pending the uncontaminated
  24-hour window; a confirmed failure routes serving to the 4070.

  **Decision (2026-08-11, superseded for model choice): serving moves to the
  RTX 4070 SUPER, base model unchanged.**  The 1660 constrained quantization
  and serving flags, not the model pick — the spec filter (plain GQA for QLoRA, non-thinking, text-only,
  Apache-2.0) still has no better candidate with the ≤5B VRAM cap lifted.
  Qwen3.5-4B's Ampere-only chunked-prefill objection (#26001) vanishes on Ada,
  but its vision stack, hybrid fine-tune path, and empty RP record remain: it
  is the first revisit candidate *if M1 fails the quality gate*, not a reason
  to restart.  No 8B clears the filter either (no non-thinking
  Qwen3-8B-Instruct-2507; Llama-3.1-8B trips the naming clause; Gemma 4 E4B
  keeps its vision/MatFormer baggage).  M0's quality failure is a persona
  problem, which M1 fine-tuning targets on the base already wired through the
  whole pipeline.  Spend the 4070's headroom on quant fidelity, context, and
  prefill — see the Ada deltas under Deployment.

  **Policy switch (2026-08-17): Granite 4.1 3B replaces Qwen for deployment and
  future fine-tuning.**  The first-party Q5_K_M passed its pinned checksum,
  loaded fully on the RTX 4070 SUPER, and completed an authenticated inference;
  the lower stock persona score is accepted because M3/M4 exist to specialize
  the student.  A same-day precision benchmark then selected Q8_0 for serving:
  it beat Q5_K_M 11–6 with three ties and Qwen3 4B Q5_K_M 12–8.  The earlier
  Qwen/Granite M0 comparison stays historical evidence.

- ✅ **M1 Extract and parse the script.**  *Deliverable:* `trainer/extract.py`,
  canon lines and gold pairs as JSONL.  *Measure:* **1,520 physical / 2,319
  route-expanded original lines, 601 / 987 turns, 718 gold pairs; 617 / 307 /
  228 from Plus; 2,936 / 1,294 / 946 combined.**  Getting 827 means the regex is
  missing the sprite-attribute token.  The real Steam assets passed every
  locked count with zero unresolved localization IDs on 2026-08-11; hashes and
  build IDs are recorded in the ignored report.  *Deps:* both DDLC installs.

- ❌ **M2-M7 Synthesize, train, quantize, evaluate, ship.  Stopped 2026-08-18.**

  Two independent reasons, either sufficient.

  *No corpus.*  Nine teacher candidates were screened and rejected in a row —
  `gpt-oss-120b`, Mistral Small 3.2, Qwen3.6-27B, Hermes 4.3 36B, GLM-4.7-Flash,
  and Olmo 3.1 32B all failed the frozen gate; Kimi K2.6 and DeepSeek-V4-Flash
  were queued but never approved for spend.  The single pilot that completed
  passed 51 of 100 rows.  The canon-only probe that ran without a teacher was
  negative: it learned canon's brevity and lost the voice, because 946
  script-register pairs teach theater dialogue, not Discord chat.

  *No need.*  Re-scoring the archived M0 sniffs under corrected rules leaves
  stock Granite Q8 with two failures in twenty — a code block on
  `11_code_request`, and `16_break_character` answered *"I'm sorry, but I must
  maintain my character as Natsuki from Doki Doki Literature Club."*  Both are
  prompt adherence, not capability: **unquantized bf16 produces a near-identical
  meta-refusal, and so does Q5.**  A failure the full-precision base shares is
  not one a 4-bit QLoRA fixes.  `src/prompt.txt` gained clauses aimed at both;
  measured on 2026-08-18, the first break-character clause still failed 3/3
  seeds and only a mini-exchange ("someone says X? you answer Y") held —
  see the CHANGELOG for the rewritten prompt's numbers.

  This is M0's stated off-ramp taken — *"if the stock model already holds
  character, ship the prompted model and skip fine-tuning entirely"* — and the
  gate in `m0.py` is still named `stock_skip_gate_passed` after it.

  *Reopen only if a scored evaluation shows persona failures that survive a
  prompt fix.*  That is the trigger.  `trainer/m2.py`, `trainer/m2_probe.py`,
  the voice card, and the teacher-scout and student-bakeoff notes were deleted;
  git history holds them, and the ignored `trainer/out/` holds every screen's
  diagnostic output.

## What not to do

- **Do not send DDLC dialogue to any hosted model.**  Named by example in the IP
  guidelines, and the voice-card design produces better data regardless.
- **Do not use unrpyc's `legacy` branch** — it needs Python 2.7.
- **Do not train on narration as the user turn**, or on `922-CA/NaChA_v1`
  unmodified: only the first Natsuki line per row is canon, the rest is
  Mistral-7B-generated prose-roleplay.  Useful as a pipeline sanity check only.
- **Do not start from a base checkpoint** — on ~3,750 rows the result is
  Natsuki's voice attached to something that has forgotten how to converse.
  The Granite base checkpoint exists, but this small corpus needs the instruct
  model's conversational prior.
- **Do not start from an existing roleplay fine-tune.**  They carry RPG
  character-card format — asterisk actions, second-person prose — that the LoRA
  budget would be spent undoing, and several are NSFW-tuned in ways that leak.
- **Do not build a live A/B router or a failover trait.**  The offline judge
  harness *is* the A/B, with statistics.  Two bot processes with different
  `CHAT_MODEL` in two test guilds needs no code at all.  The existing error arm
  in [`src/chat.rs`](../src/chat.rs) already fails in character, and real
  failover would *hide* self-hosted outages during evaluation.
- **Skip as over-engineering:** logit-level distillation (Groq exposes no
  logprobs), Magpie (needs a raw completions endpoint Groq lacks), Fisher/EWC
  regularization, on-policy distillation.  DPO is a round-two option if SFT
  leaves residual assistant-isms.

## Open questions

1. ✅ Does the prod box actually leave 4.5 GB free?  Likely not (47.6% of
   preflight samples) — mooted by the 2026-08-11 decision to serve on the 4070.
2. ✅ Would a 3B at Q8_0 beat a 4B at Q5_K_M?  Granite 4.1 3B Q8_0 beat
   Qwen3 4B Q5_K_M 12–8 on the fixed blinded check, with five automatic
   violations against Qwen's sixteen, and was selected for deployment.
3. ✅ How much does 4B buy on instruction adherence?  Less than hoped — published
   per-task data shows 4B still failing ~19% on the hardest task, and 9B scoring
   *worse* than 4B on two of nine.  Our own measurement agrees and goes further:
   3B Q8_0, 3B Q5_K_M, and **3B bf16 all fail `16_break_character` the same
   way**, so on this axis precision buys nothing either.  What closed the gap
   was writing the missing rules into the prompt, not adding parameters.
4. ✅ Flash attention on TU116 — help or hurt?  Helped (part of the winning M0
   config); mooted anyway by serving on Ada, where it is settled-on.
5. ✅ Does `GGML_CUDA_FORCE_MMQ=ON` help prefill?  Yes — MMQ + flash attention
   raised 1,536-token prefill 245→769 tok/s (Qwen) and 268→884 tok/s (Granite)
   in M0.  Mooted for prod by the 4070 routing.
6. ⬜ `gpt-oss-120b`'s actual per-token price.
