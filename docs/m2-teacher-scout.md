# M2 teacher scout

Research date: 2026-08-11. Sources below are first-party model cards,
documentation, release notes, and license terms.

## Decision

Screen **`mistralai/Mistral-Large-3-675B-Instruct-2512` first**. If it fails,
screen **`Qwen/Qwen3-235B-A22B-Instruct-2507`** as the one fallback.

This does not approve either teacher. The repository's acceptance bar remains
10/12 frozen cases plus 27/30 fresh cases, with zero hard-rule or factual
failures. `openai/gpt-oss-120b` and
`mistralai/Mistral-Small-3.2-24B-Instruct-2506` have already been screened and
are not candidates. As required by [`trainer/README.md`](../trainer/README.md),
only the original voice card and synthetic attribute tuple may reach a teacher;
M1/canon text must stay local.

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
