# M2 teacher scout

Research updated: 2026-08-12. Sources below are first-party model cards,
documentation, release notes, and license terms.

## Decision

**No teacher is approved or queued.** `allenai/Olmo-3.1-32B-Instruct` was
rejected on 2026-08-12: both independent strict reviews passed only 2/12 frozen
rows, rows 4 and 5 had mechanical sentence-count failures, row 5 gave
technically backwards and underqualified baking advice, and row 7 belittled
sincere effort. Do not run its fresh 30. The current dl02 teacher hunt stops
here. The user dropped H200 rentals, so Mistral Large 3 and Qwen3-235B remain
parked without a quality verdict; M3 remains blocked.

This does not approve the teacher. The repository's acceptance bar remains
10/12 frozen cases plus 27/30 fresh cases, with zero hard-rule or factual
failures. `openai/gpt-oss-120b` and
`mistralai/Mistral-Small-3.2-24B-Instruct-2506` have already been screened;
`qwen/qwen3.6-27b` also failed and conflicts with the current judge. None is a
candidate. The no-spend Hermes screen below also failed. As required by
[`trainer/README.md`](../trainer/README.md),
only the original voice card and synthetic attribute tuple may reach a teacher;
M1/canon text must stay local.

## Addendum 2026-08-12: no-spend Hermes screen

**Result: rejected on 2026-08-12.** `NousResearch/Hermes-4.3-36B-GGUF`
completed all 12 frozen rows on dl02 with valid structure and no template or
thinking-token leakage. Strict all-attribute review passed 2/12 cases;
independent whole-conversation reviews ranged from 2-3/12. Row 2 belittled a
sincere success in direct violation of voice rule 18, several rows missed their
required intent or reply shape, and row 9 had the sole mechanical
`sentence_count` violation. No definite factual falsehood was needed to reject
it. Do not run the fresh 30.

| Check | Finding |
| --- | --- |
| Lineage | Hermes 4.3 36B is Nous's chat/instruct post-training of `ByteDance-Seed/Seed-OSS-36B-Base`, not Seed-OSS Instruct or a Llama/Qwen derivative. Both the repository metadata and Hugging Face model relation name that exact base. [Hermes model card and relation](https://huggingface.co/NousResearch/Hermes-4.3-36B/tree/3899db2b6c4b35f16bde3b570bb7dd2775d56161), [Seed-OSS base card](https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Base/blob/866afe247a1b86c297a2343900a6aa63747d2a67/MODEL_CARD.md) |
| License / distillation | Nous designates both the BF16 and GGUF repositories Apache-2.0; the exact base ships the standard Apache-2.0 text. There is no naming or anti-distillation term and self-hosting adds no provider contract, so the repository's conservative treatment of synthetic-output distillation as a derivative is compatible with the standard use, modification, and redistribution grants. The Hermes trees do not contain a separate license/NOTICE file: preserve the base license and archive Nous's license designation before publishing. The Seed model card's use guidance expressly says it does not modify the license. [Hermes BF16](https://huggingface.co/NousResearch/Hermes-4.3-36B/tree/3899db2b6c4b35f16bde3b570bb7dd2775d56161), [official GGUF](https://huggingface.co/NousResearch/Hermes-4.3-36B-GGUF/tree/9ce6f623874b8e9cb7617c399b67cec820b7a594), [base license](https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Base/blob/866afe247a1b86c297a2343900a6aa63747d2a67/LICENSE.txt) |
| Mode / prompt | This is a hybrid reasoning model, not a fixed non-reasoning checkpoint. Its official Jinja nevertheless defaults `thinking=false`; reasoning and `<think>` output require `thinking=True` or the documented reasoning prompt. A supplied first system message replaces the vendor default, so M2's voice card is the only system prompt. Keep thinking disabled and retain the existing special-token gate. Hugging Face exposes parsed GGUF template metadata at repository rather than per-file level, so confirm the Q4 rendering after download before the screen. [Official prompt documentation](https://huggingface.co/NousResearch/Hermes-4.3-36B/blob/3899db2b6c4b35f16bde3b570bb7dd2775d56161/README.md#reasoning-mode), [exact chat template](https://huggingface.co/NousResearch/Hermes-4.3-36B/blob/3899db2b6c4b35f16bde3b570bb7dd2775d56161/chat_template.jinja) |
| Structure / system steering | Nous says the post-training explicitly targets schema-faithful JSON, malformed-object repair, creativity, and steerability. The template accepts the caller's system message, and the pinned llama.cpp server parses the runner's OpenAI-style `response_format: json_schema` into a grammar. These are relevant claims, not proof of this conversation schema; structural retries remain failures. [Official model card](https://huggingface.co/NousResearch/Hermes-4.3-36B/blob/3899db2b6c4b35f16bde3b570bb7dd2775d56161/README.md#whats-new-vs-hermes-3), [pinned llama.cpp parser](https://github.com/ggml-org/llama.cpp/blob/74ce15741b420b8d6f12e720398458b576c51c2c/tools/server/server-common.cpp#L939-L952) |
| Exact Q4 artifact | `hermes-4_3_36b-Q4_K_M.gguf` at repository revision `9ce6f623874b8e9cb7617c399b67cec820b7a594`: **21,762,145,216 bytes** (20.27 GiB), SHA-256/LFS OID `17823599694fa3503ef54bf748d5078c6ce881f4d01616cafa255dc05d215a08`. The file itself was last changed in commit `e6cfb17bc2a4287a7b9982df186b8c87b6de445c`. Do not place a 20.27-GiB weight file plus KV/runtime buffers on dl02's 24-GB card alone; split inference across its two GPUs. [Pinned tree](https://huggingface.co/NousResearch/Hermes-4.3-36B-GGUF/tree/9ce6f623874b8e9cb7617c399b67cec820b7a594), [raw LFS pointer](https://huggingface.co/NousResearch/Hermes-4.3-36B-GGUF/raw/9ce6f623874b8e9cb7617c399b67cec820b7a594/hermes-4_3_36b-Q4_K_M.gguf) |
| Quality case | Nous reports 77.9 IFEval, 87.7 MMLU, 80.7 MMLU-Pro, and 74.60% answered on its non-reasoning RefusalBench lane. That is enough first-party evidence for a free bounded screen because instruction following, knowledge, low refusal, JSON training, and steerability all address prior teacher failures. It is not enough for approval: the same card reports only 6.0 SimpleQA, labels the model for roleplay, and gives no Q4-specific quality result. The 12-row gate must therefore reject the first factual, persona/register, roleplay-structure, or schema failure. [Official benchmark table](https://huggingface.co/NousResearch/Hermes-4.3-36B/blob/3899db2b6c4b35f16bde3b570bb7dd2775d56161/README.md#benchmarks-hermes-43-36b) |

The candidate kept the Seed/Hermes teacher, Llama production baseline, and Qwen
judge in separate families, but quality still failed decisively. It is not an
approved teacher and not a reason to weaken or regenerate the frozen cases.

## Rejected dl02 candidate: GLM-4.7-Flash

**Result: rejected on 2026-08-12.** The pinned Q8 fully offloaded 48/48 layers
across dl02's two GPUs, rendered the supplied system message with thinking
disabled, and decoded at about 116 tokens/s. Row 1 was a narrow but weakly
voiced pass with no mechanical or factual failure. Row 2 produced no accepted
conversation after seven retries; failed bodies are not retained, so only the
final speaker-count error can be stated. This is an incomplete frozen screen,
not a 1/12 quality score.

The post-run audit found a protocol confound: the row required two users in a
`late-night DM`, but the prompt did not label that surface as a group DM or give
the model an explicit speaker sequence. Commit `35716ca` now derives an exact
username-prefix plan from the existing row attributes and disambiguates that
surface. It changes no schedule row, seed, expected message or speaker count,
validator, retry limit, or acceptance threshold, so it removes ambiguity
without weakening the gate. It does not retroactively rescue or justify
rerunning GLM: a discarded diagnostic with the explicit speaker plan produced
valid structure but belittled the small success with `don't get cocky` and
`lucky you didn't choke`, independently violating voice rule 18. The repaired
recipe applies to the next candidate in a fresh output directory.

| Check | Finding |
| --- | --- |
| Exact checkpoint | `zai-org/GLM-4.7-Flash` at source revision `7dd20894a642a0aa287e9827cb1a1f7f91386b67`. Z.ai identifies it as a text-only 30B-total/3B-active MoE and calls it its strongest 30B-class model. [Pinned official model card](https://huggingface.co/zai-org/GLM-4.7-Flash/blob/7dd20894a642a0aa287e9827cb1a1f7f91386b67/README.md) |
| License / distillation | The official checkpoint designates MIT. Its standard use, modification, sublicensing, and distribution grant has no model-naming or anti-distillation term; retain its copyright and license notice with published derivatives. Self-hosting adds no provider contract. [Pinned official repository](https://huggingface.co/zai-org/GLM-4.7-Flash/tree/7dd20894a642a0aa287e9827cb1a1f7f91386b67), [MIT license](https://opensource.org/license/mit) |
| Mode / prompt | GLM-4.7 is a hybrid reasoning family, but the pinned official Jinja accepts the caller's system message and emits the direct-response generation prefix when `enable_thinking=false`. Set that server-side and keep the existing special-token gate; do not let the model default to thinking. [Pinned official template](https://huggingface.co/zai-org/GLM-4.7-Flash/blob/7dd20894a642a0aa287e9827cb1a1f7f91386b67/chat_template.jinja), [official thinking-mode documentation](https://docs.z.ai/guides/capabilities/thinking-mode) |
| Exact Q8 artifact | Use ggml-org's `GLM-4.7-Flash-Q8_0.gguf` at revision `7559e96b7e324ab405897dc2b91492b0f376ad4a`: **31,842,799,232 bytes** (29.65 GiB), SHA-256/LFS OID `35ad96a0d4efd05a99045adb13a18c21a5be858726d9c2c5773406cd25909fd3`. The llama.cpp project publishes the exact `:Q8_0` serving command. [Pinned artifact](https://huggingface.co/ggml-org/GLM-4.7-Flash-GGUF/blob/7559e96b7e324ab405897dc2b91492b0f376ad4a/GLM-4.7-Flash-Q8_0.gguf), [pinned tree](https://huggingface.co/ggml-org/GLM-4.7-Flash-GGUF/tree/7559e96b7e324ab405897dc2b91492b0f376ad4a) |
| dl02 fit | The Q8 weights leave about 10.35 GiB of dl02's aggregate 40 GiB VRAM for KV cache and runtime buffers. Split them across the 24-GiB 4090 and 16-GiB 4070 Ti SUPER; 8192 context is enough for the M2 screen. Fit is plausible, not assumed: abort if startup does not fully offload. The 3B active footprint should make decode usable, but mixed-GPU throughput is unmeasured and must be recorded rather than predicted. |
| Quality case | Z.ai explicitly recommends Flash for emotional and role-playing interactions, but its published table is dominated by reasoning, coding, browsing, and agent benchmarks. Those vendor claims justify one free local screen, not confidence in Natsuki voice or strict JSON. The unchanged 10/12 frozen plus 27/30 fresh gate, with zero hard/factual failures, remains decisive. [Official GLM-4.7 documentation](https://docs.z.ai/guides/llm/glm-4.7), [official benchmark table](https://huggingface.co/zai-org/GLM-4.7-Flash/blob/7dd20894a642a0aa287e9827cb1a1f7f91386b67/README.md#performances-on-benchmarks) |
| Family independence | GLM is separate from the Qwen judge and Qwen student control, the Granite student, and the Ministral student. Qwen3-235B would overlap judge and control; Granite 4.1 30B would overlap the Granite student; another Mistral would overlap Ministral and revisit a vendor family whose Small 3.2 already failed. GLM therefore gives the three-student race the least correlated teacher among dl02-fit candidates. |

Minimal serving shape:

```sh
llama-server -m GLM-4.7-Flash-Q8_0.gguf --jinja --reasoning off \
  --reasoning-format none -ngl all --fit off -sm layer -ts 3,2 \
  -c 8192 --port 8080
```

The screen used an SSH loopback and `TEACHER_TEMPERATURE=0.15`. Its retained
artifact is local under `trainer/out/m2-glm47-flash-screen`; do not resume it.

## Rejected final dl02 candidate: Olmo 3.1 32B Instruct

**Result: rejected on 2026-08-12.** The pinned Q6_K artifact completed all 12
frozen rows with valid structure, but strict review passed only rows 8 and 10.
Do not run the fresh 30 or cascade to Granite, Ministral, or another Qwen
checkpoint.

| Check | Finding |
| --- | --- |
| Exact checkpoint | `allenai/Olmo-3.1-32B-Instruct` at source revision `ac0587e4a7744a551c059d8cd17ba220bc940dae`. Ai2 describes it as a dense 32B English chat model built for instruction following, tool use, and multi-turn dialogue, distinct from the separately released Think checkpoint. [Pinned official model card](https://huggingface.co/allenai/Olmo-3.1-32B-Instruct/blob/ac0587e4a7744a551c059d8cd17ba220bc940dae/README.md), [official release](https://allenai.org/blog/olmo3) |
| License / distillation | Ai2 designates the checkpoint Apache-2.0. The standard license permits use, modification, derivative works, sublicensing, and distribution subject to its notice conditions, with no naming or anti-distillation term; self-hosting adds no provider contract. The checkpoint tree does not include a standalone license file, so archive the pinned license designation and preserve the Apache text and notices before publishing. [Pinned official tree](https://huggingface.co/allenai/Olmo-3.1-32B-Instruct/tree/ac0587e4a7744a551c059d8cd17ba220bc940dae), [Apache-2.0 text](https://www.apache.org/licenses/LICENSE-2.0) |
| Mode / prompt | This exact checkpoint is fixed Instruct rather than hybrid Think. Its official Jinja has no thinking branch, accepts the caller's system message, and emits Ai2's default system text only when none is supplied. The third-party GGUF's embedded template failed pinned llama.cpp startup because its optional-tools branch called `tojson` on an undefined `tools` value. Adding `--chat-template chatml` kept Jinja/schema support and rendered M2's supplied-system, no-tools request byte-for-byte like Ai2's template, with no vendor, tool, or thinking boilerplate. [Pinned official template](https://huggingface.co/allenai/Olmo-3.1-32B-Instruct/blob/ac0587e4a7744a551c059d8cd17ba220bc940dae/chat_template.jinja) |
| Exact Q6 artifact | Use Unsloth's `Olmo-3.1-32B-Instruct-Q6_K.gguf` at repository revision `8560671d3678feb9071a684b7110b2df87b49473`: **26,448,497,312 bytes** (24.63 GiB), SHA-256/LFS OID `eb67a1a3c74c717b0a945264f9589c5a4e2bd22c5c38374eae21c19c3440d35a`. This is a third-party quant, not an Ai2 artifact, and its card advertises chat-template fixes; pin the hash and inspect the embedded template instead of assuming source-template parity. [Pinned quant tree](https://huggingface.co/unsloth/Olmo-3.1-32B-Instruct-GGUF/tree/8560671d3678feb9071a684b7110b2df87b49473), [raw LFS pointer](https://huggingface.co/unsloth/Olmo-3.1-32B-Instruct-GGUF/raw/8560671d3678feb9071a684b7110b2df87b49473/Olmo-3.1-32B-Instruct-Q6_K.gguf) |
| dl02 fit | The Q6 weights leave about 15.37 GiB of dl02's aggregate 40 GiB VRAM for the 8,192-token KV cache and runtime buffers. Split inference across the 24-GiB 4090 and 16-GiB 4070 Ti SUPER at 3:2 and abort unless every model layer is GPU-offloaded; silent CPU spill is not an experiment. The official configuration has 64 layers, eight KV heads, and an original 8,192-token context, so this screen needs no context extrapolation. [Pinned official configuration](https://huggingface.co/allenai/Olmo-3.1-32B-Instruct/blob/ac0587e4a7744a551c059d8cd17ba220bc940dae/config.json) |
| Quality case | Ai2 reports 88.8 IFEval, 39.7 IFBench, and 59.8 length-controlled AlpacaEval 2 for the final Instruct checkpoint, and calls it its strongest fully open 32B-scale instruct model. Dense 32B capacity, fixed direct-response behavior, multi-turn post-training, and family independence from the three proposed students make it the only remaining dl02 candidate with a material new case. These vendor results provide no Natsuki-persona, strict-schema, or Q6-specific proof; the unchanged repository gate remains decisive. [Pinned official evaluation table](https://huggingface.co/allenai/Olmo-3.1-32B-Instruct/blob/ac0587e4a7744a551c059d8cd17ba220bc940dae/README.md#evaluation), [official release](https://allenai.org/blog/olmo3) |

Minimal serving shape:

```sh
llama-server -m Olmo-3.1-32B-Instruct-Q6_K.gguf --jinja \
  --chat-template chatml \
  -ngl all --fit off -sm layer -ts 3,2 -c 8192 --port 8080
```

The exact hash passed; llama.cpp fully offloaded 65/65 layers across both dl02
GPUs at about 27.5 decode tokens/s, and the rendered prompt passed the system,
tool, and thinking checks. Quality still failed decisively. Rows 4 and 5 had
the two stored `sentence_count` violations. Row 5 advised adding flour so a
buttermilk substitution would not become dense, despite lacking the recipe and
leavener context; this is backwards and violates voice rule 29. Row 7 repeatedly
belittled sincere effort and distress, violating rules 17-18. Other failures
missed their required intent, reply shape, mood, or guarded register. There was
no AI disclosure, refusal, self-prefix, special-token, or safety failure. The
ignored artifact remains at `trainer/out/m2-olmo31-32b-screen`; do not resume
it. This failure ends the current dl02 teacher hunt.

This is a license-and-access assessment under the repository's existing IP
policy, not independent legal clearance for Team Salvato character rights.
