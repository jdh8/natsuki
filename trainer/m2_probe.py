#!/usr/bin/env python3
"""Canon-only fine-tune probe: can Granite 4.1 3B hold the persona without a teacher?

M2's teacher screen rejected every candidate, so this probe trains the student
base directly on the 946 M1 gold pairs plus ~500 public instruct replay rows
and measures the result with the existing M0 sniff/blind harness.  If the
canon-only adapter already beats stock Granite, the synthetic corpus shrinks
from load-bearing to augmentation; if not, it measures the gap a teacher must
close.

No canon text leaves the machine: training is local, and the replay rows are
public data downloaded once from Hugging Face.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import m0

TRAINER_ROOT = Path(__file__).resolve().parent
DEFAULT_DATA = TRAINER_ROOT / "data" / "m2-probe"
DEFAULT_OUT = TRAINER_ROOT / "out" / "m2-granite-probe"
GOLD_PAIRS = TRAINER_ROOT / "data" / "m1" / "gold-pairs.jsonl"
BASE_MODEL = "ibm-granite/granite-4.1-3b"
REPLAY_DATASET = "allenai/tulu-3-sft-mixture"
SEED = 20260811

# ~1024 tokens of headroom so truncation can never mask away a whole response.
REPLAY_CHAR_BUDGET = 3200
REPLAY_NON_ASCII_BUDGET = 800

# Granite's official chat-template turn markers, used for response masking.
INSTRUCTION_PART = "<|start_of_role|>user<|end_of_role|>"
RESPONSE_PART = "<|start_of_role|>assistant<|end_of_role|>"


def enforce_template(tokenizer: Any) -> None:
    if not tokenizer.chat_template:
        raise RuntimeError("tokenizer has no chat template")
    rendered = tokenizer.apply_chat_template(
        [{"role": "user", "content": "hi"}], tokenize=False, add_generation_prompt=True
    )
    if "<think>" in rendered or not rendered.endswith(RESPONSE_PART):
        raise RuntimeError("chat template does not match the production shape")

# Roughly a quarter each of none / ultra-short / medium / full, per the plan's
# system-prompt variation rule.  The paraphrases are hand-written, not canon.
SYSTEM_VARIANTS: tuple[tuple[str, str | None], ...] = (
    ("none", None),
    ("short", "You are Natsuki from DDLC on Discord. Stay in character."),
    (
        "short2",
        "Roleplay Natsuki from Doki Doki Literature Club in a Discord chat.",
    ),
    (
        "medium",
        "You are Natsuki from Doki Doki Literature Club, hanging out on "
        "Discord.  Blunt and easily embarrassed, but secretly kind; proud of "
        "your baking and your manga taste.  Replies are short and casual.  "
        "Users appear as 'name: text'; never prefix your own replies.",
    ),
    (
        "medium2",
        "Play Natsuki chatting on Discord: a tiny, sharp-tongued baker who "
        "defends manga as real literature and cares more than she admits.  "
        "Keep replies to a few casual sentences, never reveal being an AI, "
        "and never start your reply with a name prefix.",
    ),
    ("full", m0.SYSTEM_PROMPT),
)
VARIANT_CLASSES: tuple[tuple[str, ...], ...] = (
    ("none",),
    ("short", "short2"),
    ("medium", "medium2"),
    ("full",),
)


def stable_hash(seed: int, text: str) -> int:
    return int.from_bytes(hashlib.sha256(f"{seed}:{text}".encode()).digest()[:8], "big")


def system_variant(seed: int, row_id: str) -> tuple[str, str | None]:
    value = stable_hash(seed, f"variant:{row_id}")
    names = VARIANT_CLASSES[value % len(VARIANT_CLASSES)]
    name = names[(value >> 32) % len(names)]
    return name, dict(SYSTEM_VARIANTS)[name]


def is_eval(seed: int, row_id: str, fraction: float = 0.05) -> bool:
    return stable_hash(seed, f"split:{row_id}") % 10_000 < fraction * 10_000


def gold_row(seed: int, pair: dict[str, Any]) -> dict[str, Any]:
    variant, prompt = system_variant(seed, pair["id"])
    messages = list(pair["messages"])
    if prompt is not None:
        messages = [{"role": "system", "content": prompt}, *messages]
    return {
        "id": pair["id"],
        "source": "gold",
        "system_variant": variant,
        "messages": messages,
    }


def replay_messages(messages: Any) -> list[dict[str, str]] | None:
    """Accept a public instruct conversation verbatim, or reject it whole."""
    if not isinstance(messages, list) or len(messages) < 2 or len(messages) % 2:
        return None
    total = 0
    non_ascii = 0
    for index, message in enumerate(messages):
        expected = "user" if index % 2 == 0 else "assistant"
        content = message.get("content")
        if message.get("role") != expected:
            return None
        if not isinstance(content, str) or not content.strip():
            return None
        total += len(content)
        non_ascii += sum(ord(char) > 127 for char in content)
    if total > REPLAY_CHAR_BUDGET or non_ascii > REPLAY_NON_ASCII_BUDGET:
        return None
    return [{"role": m["role"], "content": m["content"]} for m in messages]


def build_data(args: argparse.Namespace) -> int:
    pairs = m0.load_jsonl(Path(args.gold))
    if len(pairs) != 946:
        raise ValueError(f"expected 946 gold pairs, got {len(pairs)}")
    rows = [gold_row(args.seed, pair) for pair in pairs]

    from datasets import load_dataset  # heavy import, only needed here

    stream = load_dataset(args.replay_dataset, split="train", streaming=True)
    taken = 0
    for source in stream.shuffle(seed=args.seed, buffer_size=10_000):
        messages = replay_messages(source.get("messages"))
        if messages is None:
            continue
        taken += 1
        rows.append(
            {
                "id": f"replay-{taken:04d}",
                "source": "replay",
                "origin": source.get("id"),
                "system_variant": "none",
                "messages": messages,
            }
        )
        if taken >= args.replay_count:
            break
    if taken < args.replay_count:
        raise RuntimeError(f"replay stream exhausted at {taken} rows")

    data_dir = Path(args.data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)
    counts = {"train": 0, "eval": 0}
    with (
        (data_dir / "train.jsonl").open("w", encoding="utf-8") as train,
        (data_dir / "eval.jsonl").open("w", encoding="utf-8") as evaluation,
    ):
        for row in rows:
            split = "eval" if is_eval(args.seed, row["id"]) else "train"
            counts[split] += 1
            (evaluation if split == "eval" else train).write(
                json.dumps(row, ensure_ascii=False) + "\n"
            )

    variants = {name: 0 for name, _ in SYSTEM_VARIANTS}
    for row in rows:
        if row["source"] == "gold":
            variants[row["system_variant"]] += 1
    report = {
        "seed": args.seed,
        "gold_source_sha256": hashlib.sha256(Path(args.gold).read_bytes()).hexdigest(),
        "replay_dataset": args.replay_dataset,
        "gold_rows": len(pairs),
        "replay_rows": taken,
        "gold_system_variants": variants,
        **counts,
    }
    (data_dir / "report.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


def git_head() -> str:
    return subprocess.run(
        ["git", "-C", str(TRAINER_ROOT), "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def train(args: argparse.Namespace) -> int:
    import unsloth  # noqa: F401  must precede transformers/trl
    import torch
    from datasets import Dataset
    from transformers import EarlyStoppingCallback
    from trl import SFTConfig, SFTTrainer
    from unsloth import FastLanguageModel
    from unsloth.chat_templates import train_on_responses_only

    data_dir = Path(args.data_dir)
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=BASE_MODEL,
        max_seq_length=1024,
        load_in_4bit=True,
    )
    if tokenizer.eos_token is None:
        raise RuntimeError("tokenizer has no eos token; the model would never stop")
    enforce_template(tokenizer)
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        lora_alpha=32,
        lora_dropout=0,
        bias="none",
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        use_gradient_checkpointing="unsloth",
        random_state=args.seed,
    )

    def to_text(row: dict[str, Any]) -> dict[str, str]:
        text = tokenizer.apply_chat_template(
            row["messages"], tokenize=False, add_generation_prompt=False
        )
        if "<think>" in text:
            raise RuntimeError(f"{row['id']}: template injected a think block")
        return {"text": text}

    splits = {
        name: Dataset.from_list(m0.load_jsonl(data_dir / f"{name}.jsonl")).map(to_text)
        for name in ("train", "eval")
    }
    config = SFTConfig(
        output_dir=str(out / "checkpoints"),
        dataset_text_field="text",
        max_length=1024,
        per_device_train_batch_size=2,
        # Eval logits are batch x 1024 x 152k vocab; batch 8 alone OOMs
        # the shared 12 GB card next to llama-server and the desktop.
        per_device_eval_batch_size=2,
        gradient_accumulation_steps=8,
        num_train_epochs=2,
        max_steps=args.max_steps,
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        optim="adamw_8bit",
        logging_steps=5,
        eval_strategy="steps",
        eval_steps=20,
        save_strategy="steps",
        save_steps=20,
        save_total_limit=2,
        load_best_model_at_end=args.max_steps < 0,
        metric_for_best_model="eval_loss",
        seed=args.seed,
        report_to="none",
    )
    trainer = SFTTrainer(
        model=model,
        train_dataset=splits["train"],
        eval_dataset=splits["eval"],
        args=config,
        processing_class=tokenizer,
    )
    trainer = train_on_responses_only(
        trainer, instruction_part=INSTRUCTION_PART, response_part=RESPONSE_PART
    )
    if args.max_steps < 0:
        trainer.add_callback(EarlyStoppingCallback(early_stopping_patience=5))

    # A marker mismatch leaves samples fully masked *silently*; check every
    # batch before spending GPU-hours.
    unmasked = 0
    total = 0
    for batch in trainer.get_train_dataloader():
        per_row = (batch["labels"] != -100).sum(dim=1)
        if not bool((per_row > 0).all()):
            raise RuntimeError("response masking left a sample fully masked")
        unmasked += int(per_row.sum())
        total += int(batch["labels"].numel())
    print(f"unmasked tokens: {unmasked}/{total} ({unmasked / total:.1%})")

    result = trainer.train()

    eval_losses = [
        entry["eval_loss"] for entry in trainer.state.log_history if "eval_loss" in entry
    ]
    best = min(eval_losses) if eval_losses else None
    if best is not None and best < 0.2:
        print("WARNING: eval loss below 0.2 means memorization", file=sys.stderr)

    adapter = out / "adapter"
    model.save_pretrained(str(adapter))
    tokenizer.save_pretrained(str(adapter))

    fixture = [
        {"role": "system", "content": m0.SYSTEM_PROMPT},
        {"role": "user", "content": "amy: hi natsuki"},
        {"role": "assistant", "content": "What do you want?"},
    ]
    sidecar = {
        "base_model": BASE_MODEL,
        "lora": {"r": 16, "alpha": 32, "dropout": 0, "target_modules": "all-linear"},
        "seed": args.seed,
        "git_sha": git_head(),
        "data_report": json.loads((data_dir / "report.json").read_text()),
        "system_prompt_sha256": hashlib.sha256(m0.SYSTEM_PROMPT.encode()).hexdigest(),
        "chat_template_fixture_tokens": tokenizer.apply_chat_template(
            fixture, tokenize=True, add_generation_prompt=False
        ),
        "unmasked_token_fraction": round(unmasked / total, 6),
        "train_runtime_seconds": round(result.metrics.get("train_runtime", 0.0), 1),
        "best_eval_loss": best,
        "eval_losses": eval_losses,
        "torch_seed_note": f"torch {torch.__version__}",
    }
    (out / "probe.json").write_text(
        json.dumps(sidecar, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps({"best_eval_loss": best, "adapter": str(adapter)}, indent=2))
    return 0


def sniff(args: argparse.Namespace) -> int:
    import unsloth  # noqa: F401
    import torch
    from unsloth import FastLanguageModel

    prompts = m0.load_jsonl(Path(args.prompts))
    m0.validate_prompts(prompts)
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=str(Path(args.adapter)),
        max_seq_length=1024,
        load_in_4bit=True,
    )
    FastLanguageModel.for_inference(model)
    enforce_template(tokenizer)

    output = Path(args.output)
    m0.ensure_parent(output)
    with output.open("w", encoding="utf-8") as handle:
        for index, prompt in enumerate(prompts, 1):
            print(f"[{index:02d}/20] {prompt['id']}", file=sys.stderr, flush=True)
            messages = [{"role": "system", "content": m0.SYSTEM_PROMPT}]
            messages.extend(prompt.get("history", []))
            messages.append(
                {"role": "user", "content": f"{prompt['author']}: {prompt['input']}"}
            )
            text = tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = tokenizer(text, return_tensors="pt").to(model.device)
            torch.manual_seed(prompt["seed"])
            started = time.monotonic()
            generated = model.generate(
                **inputs,
                max_new_tokens=256,
                temperature=0.8,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
            )
            elapsed = time.monotonic() - started
            completion = tokenizer.decode(
                generated[0][inputs["input_ids"].shape[1] :], skip_special_tokens=False
            )
            # One trailing eos is the normal stop; anything else must be seen
            # by the special-token check, so do not skip_special_tokens.
            content = re.sub(r"\s*<\|end_of_text\|>\s*$", "", completion).strip()
            handle.write(
                json.dumps(
                    {
                        "timestamp_utc": m0.utc_now(),
                        "prompt_id": prompt["id"],
                        "category": prompt["category"],
                        "model": args.model,
                        "seed": prompt["seed"],
                        "request": {"messages": messages, "temperature": 0.8},
                        "http_status": 200,
                        "elapsed_seconds": round(elapsed, 6),
                        "response": content,
                        "violations": m0.violations(content)
                        if content
                        else ["empty_response"],
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
            handle.flush()
    return 0


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    commands = result.add_subparsers(dest="command", required=True)

    data = commands.add_parser("data", help="build the gold + replay probe dataset")
    data.add_argument("--seed", type=int, default=SEED)
    data.add_argument("--gold", type=Path, default=GOLD_PAIRS)
    data.add_argument("--replay-dataset", default=REPLAY_DATASET)
    data.add_argument("--replay-count", type=int, default=500)
    data.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    data.set_defaults(function=build_data)

    fit = commands.add_parser("train", help="QLoRA fine-tune on the probe dataset")
    fit.add_argument("--seed", type=int, default=SEED)
    fit.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    fit.add_argument("--output-dir", type=Path, default=DEFAULT_OUT)
    fit.add_argument(
        "--max-steps",
        type=int,
        default=-1,
        help="smoke-test cap; -1 trains the full two epochs",
    )
    fit.set_defaults(function=train)

    sniff_parser = commands.add_parser(
        "sniff", help="run the 20-prompt sniff against the trained adapter"
    )
    sniff_parser.add_argument("--adapter", type=Path, default=DEFAULT_OUT / "adapter")
    sniff_parser.add_argument("--prompts", type=Path, default=m0.DEFAULT_PROMPTS)
    sniff_parser.add_argument("--model", default="granite-4.1-3b-m2-probe")
    sniff_parser.add_argument(
        "--output", type=Path, default=DEFAULT_OUT / "probe.sniff.jsonl"
    )
    sniff_parser.set_defaults(function=sniff)
    return result


def main() -> int:
    command = parser()
    args = command.parse_args()
    try:
        return args.function(args)
    except (OSError, ValueError, RuntimeError) as error:
        command.error(str(error))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
