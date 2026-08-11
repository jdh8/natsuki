# M2 student bakeoff

Research date: 2026-08-11. Sources are first-party model cards, repositories,
license text, and framework documentation.

## Decision

Run a three-student adapter race, but **not yet**. M2 still has no approved
teacher and therefore no representative Discord-shaped synthetic corpus. The
canon-only Qwen probe already showed that the available local data teaches
theater dialogue and replay assistant-isms; racing bases on that data would
select for the wrong task. The bounded dl02 teacher hunt has now ended without
an approved teacher, so M3 and this race remain blocked rather than falling
back to canon-only data.

The exact three checkpoints are:

| Checkpoint | Why it gets a slot |
| --- | --- |
| `Qwen/Qwen3-4B-Instruct-2507` | The control. It is a 4B, text-only, fixed non-thinking instruct model under Apache-2.0, and the current QLoRA probe proves that this exact checkpoint trains and serves on the 4070. Removing it would make the experiment unable to say whether switching helped. [Official model card](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507) |
| `ibm-granite/granite-4.1-3b` | The low-risk independent-family challenger: a text-only 3B dense GQA instruct model under Apache-2.0. M0 did **not** settle its value as an adapter base: stock Granite won 11/20 blinded pairs with three ties, despite its lower 3.15/5 persona score and one refusal. The target fine-tune is specifically meant to change those stock behaviors. [Official model card](https://huggingface.co/ibm-granite/granite-4.1-3b), [official architecture repository](https://github.com/ibm-granite/granite-4.1-language-models) |
| `mistralai/Ministral-3-3B-Instruct-2512-BF16` | The best unmeasured third family. It has a 3.4B language model plus a 0.4B vision encoder, is explicitly intended for chat, short content, fine-tuning, and edge use, and is Apache-2.0. Use the BF16 checkpoint as the QLoRA source and freeze the unused vision encoder/projector. Unsloth documents current fine-tuning support for the family; Mistral publishes its own GGUFs for the text serving pre-screen. [Official BF16 model card](https://huggingface.co/mistralai/Ministral-3-3B-Instruct-2512-BF16), [Unsloth Ministral 3 guide](https://unsloth.ai/docs/new/ministral-3), [official GGUF](https://huggingface.co/mistralai/Ministral-3-3B-Instruct-2512-GGUF) |

All three checkpoint cards designate Apache-2.0. Apache grants modification and
redistribution of derivatives subject to license, change-notice, attribution,
and NOTICE preservation, so a published adapter or merged result can remain
Apache-2.0-compatible if those materials ship with it. [Apache-2.0 §§2, 4](https://www.apache.org/licenses/LICENSE-2.0)

Mistral's card adds: “You must not use this model in a manner that infringes,
misappropriates, or otherwise violates any third party's rights.” It still
identifies the checkpoint license as the unmodified Apache-2.0 and links that
text. For this engineering screen, interpret the sentence as a warning
consistent with Apache's
non-infringement disclaimer and user-responsibility clause, not a naming,
anti-distillation, or redistribution condition. It does **not** clear the
separate Team Salvato character-rights question. Keep the existing rule that
canon never reaches a hosted model, withhold canon data, and recheck the notices
before publishing. This is an engineering license screen, not legal advice.
[Mistral license section](https://huggingface.co/mistralai/Ministral-3-3B-Instruct-2512-BF16#license),
[Apache-2.0 §7](https://www.apache.org/licenses/LICENSE-2.0)

## What to test now

Only Ministral needs a stock M0 pre-screen. Qwen and Granite already completed
the same 20-prompt hardware and quality run, so repeating them buys nothing.
Serve Mistral's official `Q5_K_M` GGUF through `llama-server` with its embedded
Jinja template and the unchanged Natsuki system prompt, then call the existing
`m0.py sniff` command. No harness change is needed.

That stock run answers only two cheap questions: does the exact text path fully
offload and clear 30 tok/s, and does its template leak vendor/thinking/special
tokens? If it unexpectedly clears the existing stock skip gate, shipping
without training becomes available. A persona miss does not eliminate it from the later
LoRA race, just as Granite's stock miss did not prove that Granite cannot learn
the corpus.

### Stock result — 2026-08-12

The official `Q5_K_M` completed the frozen 20-prompt run on the RTX 4070 SUPER.
Its 2,474,178,720-byte artifact matched Mistral's published SHA-256, llama.cpp
offloaded all 27 layers, and decode throughput was 134.31 tok/s minimum and
136.16 tok/s mean while the resident model server stayed online. All 20 requests
succeeded, and the embedded template emitted no thinking or special tokens.

Reject the stock-deployment route: 16/20 replies violated the sentence limit,
one emitted a code fence, and 19/20 used asterisk roleplay. Independent manual
review scored persona 2.30/5 and coherence 2.95/5, with incorrect cupcake advice,
a harmful response to a distressed user, a semantic identity disclosure,
fabricated facts/tool use, and lost conversational referents. Keep Ministral in
the post-M3 LoRA race because this admission screen was designed to catch
runtime and template failures, not assume whether shared Discord-shaped data can
remove stock style. Treat those content failures as hard post-LoRA elimination
checks. Ignored evidence is under `trainer/out/m0-student-race/ministral/`.

## Cheapest fair elimination protocol

1. Freeze a deterministic 750-row training slice after M3 filtering: 500
   synthetic rows, 150 general-prompt/in-character replay rows, and 100 verbatim
   public-instruct replay rows. Add a disjoint 50-row SFT validation slice with
   the same 33/10/7 proportions. Select by stable hash within each bucket; keep
   15-20% adversarial, 30-40% warm, full category coverage, and zero overlap
   with evaluation prompts.
2. Run a 10-step admission smoke for all three. Stop a candidate on OOM,
   non-finite loss, a fully masked sample, template/thinking leakage, or failure
   to serve fully offloaded at 30 tok/s. Then train every survivor for the same
   two epochs and row order: 4-bit QLoRA, response-only masking, rank 16, alpha
   32, all language-model linear layers, effective batch 16, learning rate
   `2e-4`, cosine decay with 5% warmup, and length 1024. Freeze non-text towers
   and use each checkpoint's pinned official chat template without its vendor
   system prompt. PEFT recommends `target_modules="all-linear"` for
   architecture-neutral QLoRA. [PEFT LoRA guide](https://github.com/huggingface/peft/blob/main/docs/source/developer_guides/lora.md#qlora-style-training)
3. Generate all three adapters' answers to the existing 20 M0 prompts through
   the same 4-bit Hugging Face path, with the fixed prompt seeds, temperature
   0.8, and 256-token cap. Run the existing pairwise `m0 blind` command three
   times for the round robin; do not build a three-way harness and do not open
   the sealed Tier-1 30. Treat the old llama.cpp Q5 stock results as historical
   context rather than stock-to-tuned controls.
4. Select only a model with zero AI/refusal/special-token/code-fence/factual
   failures, mean persona and coherence of at least 4.0, and at least 14/20
   wins against each rival. Rock-paper-scissors or no qualifying model makes
   the mini-race inconclusive: repeat the same three-way protocol on the full
   3,750-row training set instead of tuning the proxy.

Two epochs over 750 rows at effective batch 16 is about 94 optimizer updates:
enough signal to compare adaptation without paying for three full M4 runs. Run
the candidates sequentially on the workstation and pause the resident model
server for all three so the 12 GB constraint and batch behavior stay controlled.

## Why the newer names are out

`Qwen/Qwen3.5-4B` remains interesting as a **stock** revisit on Ada: Qwen
documents a text-only serving switch and materially stronger instruction scores.
That is different from eligibility for this post-M3 adapter race. Qwen3.5 thinks
by default, has a vision encoder and hybrid Gated DeltaNet language stack, and
its current Unsloth guide explicitly advises against 4-bit QLoRA because of
larger-than-normal quantization differences; the supported BF16 LoRA path is
quoted at 10 GB before the desktop and resident server. Do not spend a stock
sniff on a model that cannot enter the selected QLoRA protocol. Revisit it when
the QLoRA warning is removed or a dedicated-card BF16 LoRA race is in scope.
[Official model card](https://huggingface.co/Qwen/Qwen3.5-4B),
[official Unsloth fine-tuning guide](https://unsloth.ai/docs/models/qwen3.5/fine-tune)

`google/gemma-4-E4B-it` fixes Gemma 3's license problem, but “E4B” is 4.5B
effective and 8B including embeddings; the BF16 checkpoint is 16 GB and also
contains image/audio paths. The current first-party TRL recipe freezes those
towers and demonstrates BF16 training on an H100, not this 12 GB QLoRA shape.
It adds capacity and tooling confounds without persona evidence, so it does not
beat the three above for a cheap race. [Official checkpoint](https://huggingface.co/google/gemma-4-E4B-it),
[Hugging Face Gemma 4 fine-tuning guide](https://huggingface.co/docs/google-cloud/en/examples/vertex-ai-notebooks-fine-tune-gemma-4)

`microsoft/Phi-4-mini-instruct` is technically eligible (MIT, 3.8B, dense,
text-only), but its first-party positioning and post-training target reasoning,
logic, and safety rather than short expressive chat. With only three slots it
offers less task-specific evidence than Ministral and less local evidence than
Granite. [Official model card](https://huggingface.co/microsoft/Phi-4-mini-instruct)
