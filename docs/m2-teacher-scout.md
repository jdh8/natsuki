# M2 teacher scout

Research date: 2026-08-11. Sources below are first-party model cards,
documentation, release notes, and license terms.

## Decision

Screen **`mistralai/Mistral-Large-3-675B-Instruct-2512` next**. If it fails,
screen **`Qwen/Qwen3-235B-A22B-Instruct-2507`** as the one fallback.

This does not approve either teacher. The repository's acceptance bar remains
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
it. Do not run the fresh 30; self-hosted Mistral Large 3 is next.

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

## First candidate: Mistral Large 3

| Check | Finding |
| --- | --- |
| Exact checkpoint | `mistralai/Mistral-Large-3-675B-Instruct-2512`; the exact hosted API version is `mistral-large-2512`. [Official model card](https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512), [official API model card](https://docs.mistral.ai/models/mistral-large-3-25-12) |
| License / distillation | Apache-2.0. Mistral describes the instruct weights as available for commercial and non-commercial use and modification. Apache-2.0 permits use, modification, derivative works, sublicensing, and distribution subject to its notice conditions; it has no Llama-style downstream naming clause or anti-distillation term. Treating synthetic-output distillation as a derivative is therefore permitted under the repository's stated policy, provided applicable Apache notices are retained. [Mistral model card](https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512), [Apache-2.0 text](https://www.apache.org/licenses/LICENSE-2.0) |
| Mode / context | Instruct-post-trained, ordinary chat mode rather than a dedicated reasoning model; 256K context. The card specifically claims strong system-prompt adherence and native JSON output. Do not prepend the checkpoint repo's vendor `SYSTEM_PROMPT.txt`; M2 already supplies `m2-voice.md` as the system message. [Official model card](https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512) |
| Capability case | This is Mistral's 675B-total/41B-active flagship, not a rerun of the rejected 24B Small 3.2. Mistral reports it as its most capable model and #2 among open-source non-reasoning models at release. Those are vendor-reported results, but the combination of frontier scale, system-prompt adherence, JSON output, and non-reasoning inference directly matches M2's voice-card-plus-strict-schema task. [Official release](https://mistral.ai/news/mistral-3/), [official model card](https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512) |
| Access route | Prefer the exact open checkpoint on a short-lived 8xH200 node. Mistral documents FP8 deployment on one 8xH200 node with vLLM and an OpenAI-compatible endpoint. Lowering the context for this short pilot reduces avoidable memory use. Reach it through the loopback SSH tunnel already prescribed by `trainer/README.md`. [Official deployment instructions](https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512) |

The official API is not the selected route. Its commercial terms assign
customers their text outputs, but separately prohibit intentional generation
that violates third-party rights, including some style-imitation uses. Use it
for this character pilot only after a separate terms review. Self-hosting the
Apache checkpoint avoids that provider-contract ambiguity and does not relax the
Team Salvato/no-canon rule. [Mistral commercial
terms](https://legal.mistral.ai/terms/commercial-terms-of-service)

Minimal serving shape:

```sh
vllm serve mistralai/Mistral-Large-3-675B-Instruct-2512 \
  --tensor-parallel-size 8 --max-model-len 32768 \
  --tokenizer-mode mistral --config-format mistral --load-format mistral
```

Then expose port 8000 only through an SSH loopback tunnel and run the existing
12-row screen in a fresh `trainer/out/m2-mistral-large-3-screen` directory with
`TEACHER_TEMPERATURE=0.15`. Do not spend on a full 100-row pilot unless it clears
both the frozen and fresh gates.

## Fallback: Qwen3-235B Instruct 2507

| Check | Finding |
| --- | --- |
| Exact checkpoint | `Qwen/Qwen3-235B-A22B-Instruct-2507`. [Official model card](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507) |
| License / distillation | Apache-2.0 with the standard derivative-work and redistribution grants and no model-naming or anti-distillation condition. Preserve the license/notice material with any distributed artifact. [Official license](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507/blob/main/LICENSE) |
| Mode / context | Instruct checkpoint, fixed non-thinking mode, no `<think>` blocks, 262,144-token native context. That removes the thinking-template failure class already encountered in M2. [Official model card](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507) |
| Capability case | Qwen reports 88.7 on IFEval, 87.5 on Creative Writing v3, and 85.2 on WritingBench, plus explicit improvements in instruction following and subjective/open-ended generation. These vendor-reported scores make it the most relevant fallback, though only the Natsuki gate can establish suitability. [Official model card](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507) |
| Access route | The official card documents an OpenAI-compatible vLLM endpoint with tensor parallelism 8 and recommends reducing context if memory is tight. A rented 8-GPU node behind the same loopback tunnel is a feasible bounded screen; no canon leaves the controlled endpoint. [Official deployment instructions](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507) |

Mistral goes first because it keeps teacher, Llama baseline, and Qwen judge in
separate model families while offering the strongest permissively licensed,
non-reasoning checkpoint with first-party structured-output and deployment
support. Qwen is the fallback because its published instruction and creative
writing evidence is stronger, but its lineage overlaps the current Qwen judge.

This is a license-and-access assessment under the repository's existing IP
policy, not independent legal clearance for Team Salvato character rights.
