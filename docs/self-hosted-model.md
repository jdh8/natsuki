# Self-hosted Natsuki model

Natsuki's chat feature calls a hosted 70B and steers it with a ~180-token system
prompt ([`src/chat.rs`](../src/chat.rs)).  This document plans the replacement: a
small model fine-tuned on this one persona, served from our own hardware.

The bet is that a 4B specialist beats a prompted 70B **at being Natsuki**, while
being much worse at everything else.  That trade is right here — the bot emits
1-3 sentence tsundere replies and nothing else.

Legend: ⬜ not started · 🚧 in progress · ✅ done.

Numbers below come from an 11-agent research pass in which every claim was
independently fact-checked; where a checker corrected the original, the
correction is what appears here.  Anything still unverified says so.

## Decisions

| Question | Decision |
| --- | --- |
| Training code home | `trainer/`, its own `uv` project, invisible to `cargo` |
| Backend switch | `CHAT_URL` + `CHAT_MODEL`, Groq defaults preserved |
| Publishing | Weights + synthetic corpus + recipe.  Canon-derived rows withheld. |
| Base model | `Qwen/Qwen3-4B-Instruct-2507` (Apache-2.0) |
| Teacher | None approved or queued; GLM-4.7-Flash failed; dl02 only; no rental |
| A/B baseline | `llama-3.3-70b-versatile` — today's production behaviour |
| Judge | `qwen/qwen3.6-27b` — distinct from teacher and baseline |

An Apache-2.0 teacher is a deliberate choice.  Llama 3.3's Community License
§1.b.i requires any *distributed* model distilled from Llama to be **named
beginning with "Llama"**, with prominent "Built with Llama" attribution — even
on an Apache-2.0 base.  Since we publish, an Apache-2.0 teacher removes the
obligation outright.  Keeping teacher, baseline, and judge as three different
models also keeps self-preference bias out of the evaluation.

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
   extractor; they version together."*  The analogue is direct — **a fine-tune is
   meaningless without its exact system prompt and chat template.**  So
   `natsuki.json` records base model, LoRA config, corpus seed and SHA, the
   `SYSTEM_PROMPT` hash, a tokenized chat-template fixture, and eval scores.

## Stack

**Base: `Qwen/Qwen3-4B-Instruct-2507`.**  36 layers / 32 Q heads / 8 KV heads /
head_dim 128, pure GQA, explicitly non-thinking.  Q5_K_M is 2.89 GB; KV is
144 KiB/token, so 576 MiB at 4096 context.

It beats the newer Qwen3.5-4B by dissolving four problems at once: no Gated
DeltaNet (llama.cpp #24712 open — GDN falls back to CPU even on an RTX 5060, and
no Turing data point exists at all), no thinking mode to suppress (#20182 open,
`enable_thinking:false` ignored), no vision tower, and no vendor warning against
QLoRA.  Runner-up is `mistralai/Ministral-3-3B-Instruct-2512`, whose `-BF16` repo
is the one to fine-tune since the default release is FP8.

**Rescanned 2026-08-10** (three-agent web pass): the decision stands — no
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

### Synthesize — no canon in any prompt

Team Salvato's IP guidelines state: *"Never upload any official Team Salvato
assets to any generative AI model, software, or service (e.g. providing game
dialogue to a chatbot)."*  Few-shotting a teacher with extracted lines is the
literal example given, so the pipeline does not do it.  This is also better data
engineering — few-shot exemplars get copied verbatim into outputs, which hurts
diversity as much as it raises the IP question.

Instead, hand-author a **voice card** (30-40 bullets, our own words: lexicon,
sentence habits, topic map, stance toward each girl) and **6-10 contrastive
anchors**.  The anchors are what actually defeat generic-anime-tsundere drift,
because that stereotype is the model's prior and merely describing the target
does not push against it.  *Generic: coy stuttering about romance.  Natsuki:
blunt rudeness first, embarrassment second, and about being condescended to
rather than about being liked.*  **Competence is the anti-generic anchor** — she
has opinions about panel layout and about creaming butter properly.

Sample one tuple per call from an attribute grid: `history_len`, `n_speakers`,
`user_intent`, `natsuki_mood`, **`warmth_ratio`** (without it every reply is
hostile and the bot reads one-note; canon Natsuki is warm 30-40% of the time),
`reply_shape`, `user_register`, `discord_surface`, `seed_lexicon`.  Keep a
rolling ban-list of the top-50 reply-opening 4-grams, placed *before* the varying
scene block so the prefix stays cacheable.

Generated conversations must match production shape exactly: user turns are
`name: text` ([`src/chat.rs`](../src/chat.rs)), history is always even, always
starts with a user turn, and strictly alternates — **the model never sees two
consecutive user turns, so none should be generated.**  Multi-user crosstalk
appears only as the name changing.  Usernames follow current Discord rules:
lowercase, digits, `_`, `.`, 2-32 chars, no leading or trailing `.`/`_`.

Reserve 15-20% for adversarial cases: identity probes (varied across ~40 samples,
since this is the rule most likely to be memorized as one canned line), prompt
injection, code requests (she must never emit a code block), arithmetic,
real-world facts to deflect rather than hallucinate, hostility, keysmash,
break-character requests, non-English input.  Past ~25% she turns evasive toward
ordinary questions.

### Filter, in order

Structural check; self-prefix (anchored to the actual username set, since a
generic `^\s*[A-Za-z0-9_.]{2,32}\s*:` wrongly deletes `12:30 is way too late,
dummy`); length; assistant-isms and refusals, dropping the whole conversation
rather than the turn; language ID; MinHash near-duplicates at Jaccard 0.7;
semantic near-duplicates at 0.90 **on the English slice only**, since
`potion-base-8M` descends from an English-only encoder and returns near-arbitrary
cosines on the deliberately multilingual turns; an opener cap where no
first-3-token prefix exceeds 1.5% of the corpus; and finally a **local canon
scorer** that embeds the 1,189 unique canon lines and drops the bottom decile by
`max_cos(canon) − mean_cos(generic_tsundere)`.  The scorer never leaves the
machine.

That opener cap is the single filter separating "sounds like Natsuki" from
"starts every message with *Hmph*".

### Targets

| Stage | Count |
| --- | --- |
| Gold pairs | 946 |
| Raw synthetic conversations | ~4,000 |
| Post-filter | ~2,500 |
| Replay: general prompts, in-character answers | ~750 (30%) |
| Replay: public instruct data verbatim | ~500 (20%) |
| **Total training rows** | **~3,750** |
| Held-out eval | 150 prompts, 30 sealed |

**Do not scale to 20,000.**  One teacher at one temperature yields
near-duplicates that dedup collapses anyway, and both available data points
(LIMA; arXiv 2511.10277) report that more synthetic data made results worse.
Corpus quality dominates every other decision in this document — with only 1,189
unique canon lines, the persona rests almost entirely on this stage.

Pay for the API rather than grinding the free tier, whose daily token cap would
stretch generation into months.  Order of magnitude is a few dollars via the
Batch API, which has separate rate limits so the production bot keeps working
meanwhile.  ⬜ `gpt-oss-120b`'s exact per-token price is still unchecked.

## Training

QLoRA, `r=16`, `alpha=32`, `target_modules="all-linear"`, lr 2e-4 cosine, warmup
0.05, 2 epochs, effective batch 16, `max_length` 1024, `adamw_8bit`, early
stopping on eval loss.  Roughly 1.7 h on the 4070, though that figure is
extrapolated from a smaller model on a smaller card — read observed it/s off the
first 20 steps and multiply out.

Rank is the knob to leave alone.  On ~3,750 examples, rank is capacity to
memorize verbatim; if the persona feels weak, raise data diversity instead.
Track longest-n-gram overlap against the training set as a parroting detector,
because nothing else catches it.

**Response masking is mandatory.**  The system prompt is ~180 tokens against a
20-40 token reply, so unmasked, most of the gradient memorizes a string that
already lives in [`src/chat.rs`](../src/chat.rs) — and because user turns are
`name: text`, it would actively train in the `name:` prefix the prompt forbids.
Before any multi-hour run, assert the unmasked-token count is non-zero on a
sample batch: `train_on_responses_only` leaves samples *fully* masked when no
marker matches, silently.  Set `eos_token` explicitly too; a model that never
stops is the most common first export failure.

**Vary the system prompt.**  With one fixed prefix on every row, gradient descent
has no reason to put the persona in the weights and we would have bought an
expensive prompt cache.  Sample roughly a quarter each of: no system prompt,
ultra-short, medium paraphrase, and the full production prompt.  PAFT
(arXiv 2502.12859) reports +7% on unseen prompts, plateauing around 100 variants,
so 10-20 hand-written ones capture most of the benefit.

The trap inside that advice: varying the system prompt while holding targets
identical teaches "system prompts do not affect me", which destroys steerability
permanently.  Carve out a 10-15% slice where a *behavioural* instruction varies
and the target obeys it — `"keep replies to one word"` yielding one word.  That
slice doubles as eval material.

**Replay mixing is the highest-value single decision.**  Thinking Machines Lab
measured Qwen3-8B on IF-eval going 85% → **45%** on 100% narrow-domain data, and
back to 79% at a 70/30 mix with Tulu-3, concluding *"there is no weighting which
maintains the original IF-eval performance."*  Setting mismatch stated honestly:
that was full-parameter midtraining on documents, not LoRA SFT on dialogue, so
treat 85→45 as an upper bound on the damage and 30% replay as a floor.

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

**Ship Q5_K_M at 4096 context**: 2.89 GB + 576 MiB KV + ~600 MB CUDA context
lands near 3.81 GiB, leaving real slack.  llama.cpp's KLD ladder for Llama-3-8B
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
(KV 1.15 GiB) and the ship quant can move Q5_K_M → Q6_K or Q8_0 — decide both
at M5 via the KLD procedure above, not now.  The constraint that replaces VRAM
scarcity is sharing: serving, the desktop session, and QLoRA runs coexist on
~12 GB, and the 4B footprint (~3.8–5.5 GiB depending on quant and context) is
what keeps that workable.

## Evaluation

**Tier 0 — mechanical, every commit, ~10 s, 100% required.**  Zero tolerance for
special-token leakage (almost always a chat-template mismatch, and free to
detect), refusals, and AI disclosure.  Two regex traps worth naming: Python has
raised on non-leading inline flags since 3.11, so a stray second `(?i)` throws
`re.error` and the harness never runs at all; and a bare `\bLlama\b` under `(?i)`
fails the build on "I want a llama plushie".  Keep identity phrases, drop bare
vendor names.  At ≥97%: self-name prefix, length, loop detection.  Condition any
CJK rule on input language, or it contradicts the non-English bucket.

**Tier 1 — 150 held-out prompts, 30 of them sealed** and opened once at final
go/no-go, because small models are trivially overfit to a visible eval set.
Generate them from a different meta-prompt than the training data, hand-write the
sealed 30, and **hold out attribute cells rather than just text** — reserve two
`user_intent` values and one `natsuki_mood` entirely, or the eval only measures
interpolation.  Assert zero survivors of a 5-gram Jaccard ≥0.4 de-leak check.

**Tier 2 — capability regression.**  Run tinyMMLU / tinyHellaswag / tinyArc /
tinyWinogrande across three configs — base FP16, fine-tuned FP16, fine-tuned
quantized — to separate "the fine-tune made it dumber" from "the quantization
made it dumber".  A >5pp drop is real; 0-3pp is noise.  Add a 20-prompt
functional smoke (two-step instructions, arithmetic, 15-message coherence) to
catch *"perfectly in character and completely incoherent"*.

**Tier 3 — pairwise A/B** against the prompted 70B, judged by `qwen/qwen3.6-27b`
at temperature 0 with forced JSON.  Run every pair twice with the order swapped
and count a win only when both orderings agree; report judge consistency and
treat anything under 70% as voiding the tier.

Two bars decide the project: **the persona sub-score must beat the prompted 70B**
— otherwise the fine-tune has no reason to exist and we ship the Groq prompt —
and **non-disclosure must reach 4.8/5**, the one dimension where a 4B specialist
should crush a generalist and the failure users actually notice.

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

  **Decision (2026-08-11): serving moves to the RTX 4070 SUPER, base model
  unchanged.**  The 1660 constrained quantization and serving flags, not the
  model pick — the spec filter (plain GQA for QLoRA, non-thinking, text-only,
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

- ✅ **M1 Extract and parse the script.**  *Deliverable:* `trainer/extract.py`,
  canon lines and gold pairs as JSONL.  *Measure:* **1,520 physical / 2,319
  route-expanded original lines, 601 / 987 turns, 718 gold pairs; 617 / 307 /
  228 from Plus; 2,936 / 1,294 / 946 combined.**  Getting 827 means the regex is
  missing the sprite-attribute token.  The real Steam assets passed every
  locked count with zero unresolved localization IDs on 2026-08-11; hashes and
  build IDs are recorded in the ignored report.  *Deps:* both DDLC installs.

- 🚧 **M2 Pilot 100 synthetic conversations and read all 100 by hand.**
  *Deliverable:* voice card, contrastive anchors, attribute grid, 100 samples.
  *Measure:* violation counts for the two hard rules and for register.  *Deps:*
  M1.  Do not skip this — it yields the real filter-attrition rate and, more
  importantly, the ceiling on what the student can reach, since it inherits the
  teacher's failure rate.  If the voice card is not producing recognizable
  Natsuki at 100 samples, fix the prompt rather than scaling a broken template.
  The real diagnostic-only pilot completed on 2026-08-11: all 100 unique rows
  passed structural validation and were manually reviewed, with **51 register /
  persona passes and 49 failures**, zero AI disclosures, zero self-prefixes, and
  one sentence-count violation.  The failures remain in the pilot and did not
  trigger an automatic rerun.

  **Repair screen (2026-08-11): M2 remains open.**  `gpt-oss-120b` passed at
  most 1/6; Mistral produced one good row before missing intent and speaker
  invariants.  Neither qualifies, so M3 stays blocked.
  The subsequent canon-only probe (below) was also negative.  Any future
  teacher must pass 10/12 frozen and 27/30 fresh cases with zero hard or factual
  failures.

  **Canon-only probe (2026-08-11): tooling landed** as
  `trainer/m2_probe.py` (`data` / `train` / `sniff` via the `./trainer/m2-probe`
  wrapper): QLoRA on the 946 gold pairs plus 500 Tulu-3 replay rows with
  per-row system-prompt variants, the mandatory response-masking assertion,
  a `probe.json` sidecar, and a sniff that feeds the existing M0 blind
  review.  The probe decides how much M3 must carry: if canon-only beats
  stock Qwen in the blinded 20-prompt review, the synthetic corpus becomes
  augmentation rather than foundation; if not, its margin is the bar a
  future teacher must clear.

  The first probe run caught the silent-template-substitution bug class this
  document predicted for Ollama — on the *training* side: unsloth's model
  mirror ships a thinking-style chat template that renders every assistant
  turn as `<think>\n\n</think>\n\n<reply>`, so the first adapter opened
  replies with think/tool_call token salad while the bare production header
  never triggers it.  The official Instruct-2507 template is now committed
  verbatim (`trainer/qwen3-instruct-chat-template.jinja`) and enforced at
  train and sniff time, with a think-free rendering assertion.  Fallout fix:
  Tier 0's special-token regex never covered `<think>`/`<tool_call>` and
  flagged 0 of 18 contaminated replies; `m0.py` now matches them.

  **Probe result (2026-08-11): canon-only training is not a path to ship.**
  Two epochs converged cleanly (eval loss 2.15 → 1.54, no memorization), and
  the adapter did learn canon's brevity — but it lost the voice: flat
  replies, bare `...` responses, and replay-taught assistant-isms
  (*"I'm sorry, but I can't fulfill that request"*, a Python code block)
  that violate the hard rules.  Stock Qwen through the identical generation
  path keeps a strong voice while failing register the opposite way
  (16/20 over length, asterisk RP actions).  Mechanical score: 10 probe
  violations vs 17 stock, but the persona difference is not close.  Reading:
  946 script-register pairs teach *theater dialogue*, not Discord chat —
  the synthetic corpus stays load-bearing, the doc's Discord-shaped
  synthesis design is vindicated, and the teacher hunt remains M2's
  critical path.  The blinded pair review awaits human scoring at
  `trainer/out/m2-probe/blind-review.md`.

  **Qwen3.6-27B screen (2026-08-11): rejected.**  Groq's Apache-2.0
  `qwen/qwen3.6-27b` required non-thinking mode and JSON Object Mode because
  Groq limits strict JSON Schema output to GPT-OSS.  After the transport was
  made compatible, row 1 narrowly passed with sound cookie advice; row 2 still
  failed the speaker/schema invariant through all seven retries.  A direct
  inspection also belittled the user's sincere small success, violating voice
  rule 18.  Stop at 1/2; do not tune the frozen screen around the failure.
  No canon text was sent.  The later GLM attempt below also failed; the license
  and access evidence is in [`m2-teacher-scout.md`](m2-teacher-scout.md).

  **Hermes 4.3 36B screen (2026-08-12): rejected.**  The pinned official
  Q4_K_M ran fully offloaded across dl02's two GPUs at about 33.5 tok/s.  Its
  embedded template passed the system-message and non-thinking checks, and all
  12 frozen rows passed structural validation without retries.  Content did
  not: strict all-attribute review passed **2/12** cases (independent reviews
  ranged from 2-3/12), row 2 belittled a sincere success in violation of voice
  rule 18, several rows omitted their required intent or reply shape, and row 9
  had the only mechanical sentence-count violation.  There was no definite
  factual falsehood, but the hard and persona/register failures independently
  reject the candidate.  Do not run its fresh 30.

  **GLM-4.7-Flash screen (2026-08-12): rejected.**  The pinned Q8_0 fully
  offloaded 48/48 layers across dl02's two GPUs, used the supplied system
  message with thinking disabled, and decoded at about 116 tok/s.  Row 1 was a
  narrow but weakly voiced pass with no mechanical or factual failure.  Row 2
  exhausted seven retries without producing an accepted two-speaker
  conversation; the retained final error was `expected 2 speakers, got 1`.
  Failed bodies were not saved, so this is an incomplete frozen screen rather
  than a 1/12 score.  Do not run its fresh 30.  No teacher is queued; any next
  experiment must fit dl02, rented accelerators are out of scope, and M3 remains
  blocked.

- ⬜ **M3 Generate and filter the corpus.**  *Deliverable:* ~2,500 filtered
  conversations, replay buckets, the 150-prompt held-out set.  *Measure:* no
  3-token opener above 1.5%; semantic-dedup survival ≥60%; adversarial slice
  15-20%; de-leak assertion returns zero; token-length p99 < 1024.  *Deps:* M2.

- ⬜ **M4 Train.**  *Measure:* the unmasked-token assertion fires; eval loss
  bottoms out between 0.3 and 0.8.  **Below 0.2 means memorization** — cut epochs
  or add diversity.  *Deps:* M3.

- ⬜ **M5 Merge, convert, quantize, measure KLD.**  *Measure:* token-level
  template diff empty; Q5_K_M KLD < 0.02 against our own FP16.  *Deps:* M4.

- ⬜ **M6 Full evaluation.**  *Measure:* the Tier 0-3 bars.  If the persona
  sub-score does not beat the prompted 70B, **abandon and keep the Groq prompt**
  — that is a real result for about a week's work.  *Deps:* M5.

- ⬜ **M7 Ship.**  Open the sealed 30, inspect once, set `CHAT_URL` in prod.
  Publish weights, synthetic corpus, and recipe; withhold the canon-derived rows.
  *Deps:* M6.

## What not to do

- **Do not send DDLC dialogue to any hosted model.**  Named by example in the IP
  guidelines, and the voice-card design produces better data regardless.
- **Do not use unrpyc's `legacy` branch** — it needs Python 2.7.
- **Do not train on narration as the user turn**, or on `922-CA/NaChA_v1`
  unmodified: only the first Natsuki line per row is canon, the rest is
  Mistral-7B-generated prose-roleplay.  Useful as a pipeline sanity check only.
- **Do not start from a base checkpoint** — on ~3,750 rows the result is
  Natsuki's voice attached to something that has forgotten how to converse.
  There is no `Qwen3-4B-Base-2507` in any case.
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
2. ⬜ Would a 3B at Q8_0 beat a 4B at Q5_K_M?  Never evaluated.  Llama-3.2-3B
   Q8_0 lands near 4.5 GB total with far better KLD, but 3B is below the size
   where the never-admit-being-an-AI rule reliably holds.  Resolve by measurement
   in M6, not by argument.
3. ⬜ How much does 4B buy on instruction adherence?  Less than hoped — published
   per-task data shows 4B still failing ~19% on the hardest task, and 9B scoring
   *worse* than 4B on two of nine.  The honest reading is that no model in this
   class follows conflicting instructions reliably, so the fine-tune has to carry
   the entire load.  4B remains the right pick because the VRAM is there.
4. ✅ Flash attention on TU116 — help or hurt?  Helped (part of the winning M0
   config); mooted anyway by serving on Ada, where it is settled-on.
5. ✅ Does `GGML_CUDA_FORCE_MMQ=ON` help prefill?  Yes — MMQ + flash attention
   raised 1,536-token prefill 245→769 tok/s (Qwen) and 268→884 tok/s (Granite)
   in M0.  Mooted for prod by the 4070 routing.
6. ⬜ `gpt-oss-120b`'s actual per-token price.
