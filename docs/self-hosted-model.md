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
|---|---|
| Training code home | `trainer/`, its own `uv` project, invisible to `cargo` |
| Backend switch | `CHAT_URL` + `CHAT_MODEL`, Groq defaults preserved |
| Publishing | Weights + synthetic corpus + recipe.  Canon-derived rows withheld. |
| Base model | `Qwen/Qwen3-4B-Instruct-2507` (Apache-2.0) |
| Teacher | `openai/gpt-oss-120b` (Apache-2.0) |
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
|---|---|---|
| GPU | RTX 4070 SUPER, 12282 MiB, cc 8.9 | GTX 1660, 6 GB, cc 7.5 |
| Tensor cores | yes (Ada) | **none** (TU116) |
| Usable VRAM | ~8.8 GB with a desktop session up | **~4.5 GB** assumed — M0 must confirm |

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
|---|---|---|
| A — gold pairs, previous turn is `mc`/`s`/`y`/`m` | **718 of 987 turns** | Direct `(user, assistant)` pairs |
| B — previous turn is narration | 235 | Scene context field only |
| C — all lines | 2,319 (1,189 unique) | Local scorer bank only |

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
|---|---|
| Gold pairs | 718 |
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

- ⬜ **M0 Measure the prod box, and the do-nothing baseline.**  *Deliverable:*
  a day of `nvidia-smi` samples with the desktop up; `llama-bench -fa 0,1`; the
  bot pointed at stock Qwen3-4B-Instruct-2507 with the **current, unchanged**
  system prompt.  *Measure:* p99 free VRAM ≥4.0 GiB; full offload at ≥30 tok/s;
  a 20-prompt sniff test.  *Deps:* M-1.
  **This milestone can cancel the project, in either direction.**  If the stock
  model already holds character, ship the prompted 4B and skip fine-tuning
  entirely.  If VRAM comes up short, move the display to an iGPU before
  considering a smaller model.  Do this first; it is the cheapest thing that can
  invalidate everything below.

- ⬜ **M1 Extract and parse the script.**  *Deliverable:* `trainer/extract.py`,
  canon lines and gold pairs as JSONL.  *Measure:* **1,520 Natsuki lines, 601
  base-game turns, 718 gold pairs.**  Getting 827 means the regex is missing the
  sprite-attribute token.  These counts were reproduced exactly by two
  independent implementations, so a mismatch is a parser bug.  *Deps:* a DDLC
  install.

- ⬜ **M2 Pilot 100 synthetic conversations and read all 100 by hand.**
  *Deliverable:* voice card, contrastive anchors, attribute grid, 100 samples.
  *Measure:* violation counts for the two hard rules and for register.  *Deps:*
  M1.  Do not skip this — it yields the real filter-attrition rate and, more
  importantly, the ceiling on what the student can reach, since it inherits the
  teacher's failure rate.  If the voice card is not producing recognizable
  Natsuki at 100 samples, fix the prompt rather than scaling a broken template.

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

1. ⬜ Does the prod box actually leave 4.5 GB free?  M0 answers it.  Would an
   iGPU recover all of it, making Q6_K@4096 comfortable?
2. ⬜ Would a 3B at Q8_0 beat a 4B at Q5_K_M?  Never evaluated.  Llama-3.2-3B
   Q8_0 lands near 4.5 GB total with far better KLD, but 3B is below the size
   where the never-admit-being-an-AI rule reliably holds.  Resolve by measurement
   in M6, not by argument.
3. ⬜ How much does 4B buy on instruction adherence?  Less than hoped — published
   per-task data shows 4B still failing ~19% on the hardest task, and 9B scoring
   *worse* than 4B on two of nine.  The honest reading is that no model in this
   class follows conflicting instructions reliably, so the fine-tune has to carry
   the entire load.  4B remains the right pick because the VRAM is there.
4. ⬜ Flash attention on TU116 — help or hurt?  No published data for the
   16-series.
5. ⬜ Does `GGML_CUDA_FORCE_MMQ=ON` help prefill?  Community reports say yes;
   llama.cpp's own docs scope the flag to other architectures, so the mechanism
   story is suspect.  Highest-value single experiment on the list.
6. ⬜ `gpt-oss-120b`'s actual per-token price.
