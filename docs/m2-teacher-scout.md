# M2 teacher scout

Research updated: 2026-08-12. Sources below are first-party model cards,
documentation, release notes, and license terms.

## Decision

**No teacher is approved or queued.** `zai-org/GLM-4.7-Flash` was rejected on
2026-08-12 after its second frozen row exhausted seven retries without an
accepted two-speaker conversation; the retained final error was `expected 2
speakers, got 1`. Do not run its fresh 30. The user dropped H200 rentals, so
Mistral Large 3 and Qwen3-235B remain parked without a quality verdict. Any
further teacher experiment must fit dl02.

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

This is a license-and-access assessment under the repository's existing IP
policy, not independent legal clearance for Team Salvato character rights.
