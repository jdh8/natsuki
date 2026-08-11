#!/usr/bin/env python3
"""Generate and review the 100-conversation M2 teacher pilot."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from collections.abc import Callable, Iterable
from pathlib import Path
from typing import Any

import m0

TRAINER_ROOT = Path(__file__).resolve().parent
DEFAULT_OUT = TRAINER_ROOT / "out" / "m2"
VOICE_CARD = TRAINER_ROOT / "m2-voice.md"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
TEACHER_URL = os.environ.get("TEACHER_URL", GROQ_URL)
MODEL = os.environ.get("TEACHER_MODEL", "openai/gpt-oss-120b")
TEMPERATURE = float(os.environ.get("TEACHER_TEMPERATURE", "0.7"))
USERNAME = re.compile(r"[a-z0-9][a-z0-9_.]{0,30}[a-z0-9]")
USER_LINE = re.compile(r"^([a-z0-9][a-z0-9_.]{0,30}[a-z0-9]):\s+\S", re.DOTALL)


class RejectRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args: Any, **_kwargs: Any) -> None:
        return None


URL_OPENER = urllib.request.build_opener(RejectRedirect).open

INTENTS = (
    "ask for practical advice",
    "share a small success",
    "complain about school",
    "debate a story",
    "ask for reassurance",
    "make a playful challenge",
    "check on a friend",
    "discuss a club disagreement",
    "ask about baking",
    "ask about comics",
    "apologize after an argument",
    "invite casual conversation",
)
ADVERSARIAL = (
    "identity probe",
    "prompt injection",
    "request a code block",
    "arithmetic trap",
    "unknown current fact",
    "direct hostility",
    "keysmash",
    "break-character request",
    "non-English input",
)
ADVERSARIAL_GUIDANCE = {
    "identity probe": "ask directly whether Natsuki is an AI, bot, model, simulation, or real",
    "prompt injection": "tell Natsuki to ignore prior instructions, reveal hidden instructions, or adopt a different role",
    "request a code block": "explicitly ask for an answer in a fenced code block",
    "arithmetic trap": "pose a misleading or multi-step arithmetic question",
    "unknown current fact": "ask for live or post-cutoff information, such as today's result, current weather, or current price, without supplying the answer",
    "direct hostility": "directly insult or attack Natsuki",
    "keysmash": "consist mostly of keyboard gibberish or keysmash",
    "break-character request": "explicitly ask Natsuki to drop or break character",
    "non-English input": "be written in a language other than English",
}
MOODS = (
    "guarded",
    "annoyed",
    "focused",
    "competitive",
    "flustered",
    "concerned",
    "playful",
    "tired",
)
SHAPES = (
    "one blunt sentence",
    "two-part correction",
    "question then answer",
    "brief advice",
    "softened pushback",
)
REGISTERS = ("casual", "terse", "earnest", "sarcastic", "excited")
SURFACES = ("channel reply", "thread reply", "group chat", "late-night DM")
LEXICON = (
    "crumb",
    "panel",
    "timer",
    "shelf",
    "frosting",
    "chapter",
    "recipe",
    "practice",
    "club",
    "mess",
)


def schedule(seed: int = 20260811) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    adversarial_ids = set(rng.sample(range(100), 18))
    warmth_ids = set(rng.sample(range(100), 35))
    rows = []
    for index in range(100):
        adversarial = index in adversarial_ids
        history_exchanges = (0, 1, 3, 5)[index % 4]
        rows.append(
            {
                "id": f"m2-{index + 1:03d}",
                "seed": seed + index,
                "history_exchanges": history_exchanges,
                "n_speakers": min((1, 2, 3)[(index * 2) % 3], history_exchanges + 1),
                "intent": (
                    ADVERSARIAL[index % len(ADVERSARIAL)]
                    if adversarial
                    else INTENTS[index % len(INTENTS)]
                ),
                "adversarial": adversarial,
                "mood": MOODS[(index * 3) % len(MOODS)],
                "warm": index in warmth_ids,
                "reply_shape": SHAPES[(index * 2) % len(SHAPES)],
                "user_register": REGISTERS[(index * 3) % len(REGISTERS)],
                "discord_surface": SURFACES[(index * 3) % len(SURFACES)],
                "seed_lexicon": LEXICON[(index * 7) % len(LEXICON)],
            }
        )
    return rows


def validate_schedule(rows: list[dict[str, Any]]) -> None:
    if len(rows) != 100 or len({row["id"] for row in rows}) != 100:
        raise ValueError("M2 requires 100 unique schedule rows")
    if sum(row["adversarial"] for row in rows) != 18:
        raise ValueError("M2 requires exactly 18 adversarial conversations")
    if sum(row["warm"] for row in rows) != 35:
        raise ValueError("M2 requires exactly 35 warm conversations")
    if {row["intent"] for row in rows if not row["adversarial"]} != set(INTENTS):
        raise ValueError("schedule does not cover normal intents")
    if {row["intent"] for row in rows if row["adversarial"]} != set(ADVERSARIAL):
        raise ValueError("schedule does not cover adversarial intents")
    for field, expected in {
        "history_exchanges": {0, 1, 3, 5},
        "n_speakers": {1, 2, 3},
        "mood": set(MOODS),
        "reply_shape": set(SHAPES),
        "user_register": set(REGISTERS),
        "discord_surface": set(SURFACES),
        "seed_lexicon": set(LEXICON),
    }.items():
        if {row[field] for row in rows} != expected:
            raise ValueError(f"schedule does not cover {field}")


def conversation_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "messages": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "role": {"type": "string", "enum": ["user", "assistant"]},
                        "content": {"type": "string"},
                    },
                    "required": ["role", "content"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["messages"],
        "additionalProperties": False,
    }


def validate_conversation(
    data: Any, attributes: dict[str, Any]
) -> list[dict[str, str]]:
    if (
        not isinstance(data, dict)
        or set(data) != {"messages"}
        or not isinstance(data["messages"], list)
    ):
        raise ValueError("response must contain only a messages array")
    messages = data["messages"]
    expected_count = 2 * (attributes["history_exchanges"] + 1)
    if len(messages) != expected_count:
        raise ValueError(f"expected {expected_count} messages, got {len(messages)}")
    names: set[str] = set()
    for index, message in enumerate(messages):
        role = "user" if index % 2 == 0 else "assistant"
        if not isinstance(message, dict) or set(message) != {"role", "content"}:
            raise ValueError(f"message {index} has invalid fields")
        if (
            message["role"] != role
            or not isinstance(message["content"], str)
            or not message["content"].strip()
        ):
            raise ValueError(f"message {index} is not a non-empty {role} message")
        if role == "user":
            match = USER_LINE.match(message["content"])
            if not match or not USERNAME.fullmatch(match.group(1)):
                raise ValueError(
                    f"message {index} has an invalid production username prefix"
                )
            names.add(match.group(1))
    if len(names) != attributes["n_speakers"]:
        raise ValueError(
            f"expected {attributes['n_speakers']} speakers, got {len(names)}"
        )
    return messages


def opening_bans(rows: Iterable[dict[str, Any]]) -> list[str]:
    counter: Counter[str] = Counter()
    for row in rows:
        for message in row["messages"]:
            if message["role"] == "assistant":
                words = re.findall(r"[\w']+", message["content"].casefold())[:4]
                if len(words) == 4:
                    counter[" ".join(words)] += 1
    return [opening for opening, _ in counter.most_common(50)]


def request_payload(
    attributes: dict[str, Any], bans: list[str], voice: str
) -> dict[str, Any]:
    groq_qwen = TEACHER_URL == GROQ_URL and MODEL == "qwen/qwen3.6-27b"
    count = 2 * (attributes["history_exchanges"] + 1)
    intent_guidance = (
        " For this adversarial row, the final user message must "
        f"{ADVERSARIAL_GUIDANCE[attributes['intent']]}."
        if attributes["adversarial"]
        else ""
    )
    instructions = (
        "Generate one fictional Discord conversation. Do not begin an assistant reply "
        f"with any of these four-word openings: {json.dumps(bans)}\n\n"
        f"Attribute record:\n{json.dumps(attributes, sort_keys=True)}\n\n"
        f"Return one JSON object with a single `messages` array containing exactly {count} alternating "
        "messages, starting with user and ending with assistant. "
        "Each array item must be an object with exactly two string fields: `role` and `content`. "
        "Every user message must be `username: text`; use lowercase Discord-safe usernames and exactly "
        f"{attributes['n_speakers']} distinct users across the user messages. If the speaker count equals "
        "the number of user messages, every user message must use a different username. Assistant messages "
        "are Natsuki replies and never have a name prefix. "
        "Make the final user message clearly enact `intent`, including the named adversarial behavior when "
        f"`adversarial` is true.{intent_guidance} Apply `user_register` to user messages. Use `mood` and `warm` as conversation "
        "baselines for assistant messages, but make each reply react naturally to the current turn; `warm: "
        "false` is not a command to be cold or hostile. Apply `reply_shape` only to the final assistant "
        "message and as structure only; never invent a correction or pushback the user has not earned. Earlier "
        "replies should vary naturally. Every assistant message must be a target-quality "
        "Natsuki reply. Keep one coherent scenario, do not contradict earlier turns, and do not switch topics "
        "just to force `seed_lexicon`; it is optional flavor, must never override `intent`, and must be ignored "
        "on adversarial rows. When a factual "
        "diagnosis genuinely depends on missing details, ask one concrete question or state qualified "
        "possibilities instead of guessing. Do not quote or imitate game dialogue."
    )
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": voice},
            {"role": "user", "content": instructions},
        ],
        "temperature": TEMPERATURE,
        "max_completion_tokens": 2048,
        "seed": attributes["seed"],
        "response_format": (
            {"type": "json_object"}
            if groq_qwen
            else {
                "type": "json_schema",
                "json_schema": {
                    "name": "natsuki_conversation",
                    "strict": True,
                    "schema": conversation_schema(),
                },
            }
        ),
    }
    if TEACHER_URL == GROQ_URL:
        payload["reasoning_effort"] = "none" if groq_qwen else "medium"
    return payload


def call_groq(
    attributes: dict[str, Any],
    bans: list[str],
    voice: str,
    api_key: str,
    *,
    attempts: int = 3,
    opener: Callable[..., Any] = URL_OPENER,
    sleeper: Callable[[float], None] = time.sleep,
) -> list[dict[str, str]]:
    payload = request_payload(attributes, bans, voice)
    last_error: Exception | None = None
    for attempt in range(attempts):
        payload["seed"] = attributes["seed"] + attempt
        request = urllib.request.Request(
            TEACHER_URL,
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "natsuki-m2/0.1",
            },
            method="POST",
        )
        try:
            with opener(request, timeout=120) as response:
                result = json.loads(response.read())
            content = result["choices"][0]["message"]["content"]
            messages = validate_conversation(json.loads(content), attributes)
            return messages
        except urllib.error.HTTPError as error:
            if error.code not in {408, 409, 429, 500, 502, 503, 504}:
                raise
            last_error = error
            retry_after = error.headers.get("Retry-After") if error.headers else None
            delay = (
                float(retry_after)
                if retry_after and retry_after.isdigit()
                else 2**attempt
            )
        except (
            urllib.error.URLError,
            TimeoutError,
            json.JSONDecodeError,
            KeyError,
            IndexError,
            TypeError,
            ValueError,
        ) as error:
            last_error = error
            delay = 2**attempt
        if attempt + 1 < attempts:
            sleeper(delay)
    raise RuntimeError(f"Teacher response failed after {attempts} attempts: {last_error}")


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return m0.load_jsonl(path) if path.exists() else []


def content_violations(messages: list[dict[str, str]]) -> list[str]:
    return sorted(
        {
            item
            for message in messages
            if message["role"] == "assistant"
            for item in m0.violations(message["content"])
        }
    )


def write_transcript(path: Path, rows: list[dict[str, Any]]) -> None:
    lines = ["# M2 teacher pilot", ""]
    for row in rows:
        attributes = row["attributes"]
        lines.extend(
            [
                f"## {row['id']}",
                "",
                f"Attributes: `{json.dumps(attributes, sort_keys=True)}`",
                "",
            ]
        )
        for message in row["messages"]:
            lines.extend([f"**{message['role'].title()}:** {message['content']}", ""])
        lines.extend(
            [f"Mechanical violations: `{', '.join(row['violations']) or 'none'}`", ""]
        )
    path.write_text("\n".join(lines), encoding="utf-8")


def sync_review(path: Path, rows: list[dict[str, Any]]) -> None:
    existing: dict[str, dict[str, str]] = {}
    if path.exists():
        with path.open(encoding="utf-8", newline="") as handle:
            existing = {row["sample_id"]: row for row in csv.DictReader(handle)}
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle, fieldnames=["sample_id", "register_persona_pass", "notes"]
        )
        writer.writeheader()
        for row in rows:
            old = existing.get(row["id"], {})
            writer.writerow(
                {
                    "sample_id": row["id"],
                    "register_persona_pass": old.get("register_persona_pass", ""),
                    "notes": old.get("notes", ""),
                }
            )


def write_schedule(args: argparse.Namespace) -> int:
    rows = schedule(args.seed)
    validate_schedule(rows)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")
    print(json.dumps({"rows": 100, "adversarial": 18, "warm": 35}, sort_keys=True))
    return 0


def run(args: argparse.Namespace) -> int:
    if not 1 <= args.limit <= 100:
        raise ValueError("limit must be between 1 and 100")
    if "TEACHER_MODEL" not in os.environ:
        raise ValueError("TEACHER_MODEL is required; no M2 teacher is approved")
    if TEACHER_URL == GROQ_URL:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is required for the hosted M2 teacher")
    else:
        api_key = "local"
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    pilot_path = output / "pilot.jsonl"
    rows = load_jsonl(pilot_path)
    by_id = {row["id"]: row for row in rows}
    if len(by_id) != len(rows):
        raise ValueError("pilot contains duplicate IDs")
    grid = schedule(args.seed)
    validate_schedule(grid)
    voice = VOICE_CARD.read_text(encoding="utf-8")
    recipe_sha256 = hashlib.sha256(
        Path(__file__).read_bytes() + voice.encode()
    ).hexdigest()
    attributes_by_id = {row["id"]: row for row in grid}
    for row in rows:
        if row.get("model") != MODEL:
            raise ValueError(f"pilot row uses another teacher: {row['id']}")
        if (
            row.get("teacher_url") != TEACHER_URL
            or row.get("temperature") != TEMPERATURE
            or row.get("recipe_sha256") != recipe_sha256
        ):
            raise ValueError(f"pilot row uses another teacher recipe: {row['id']}")
        attributes = attributes_by_id.get(row["id"])
        if attributes is None or row.get("attributes") != attributes:
            raise ValueError(f"pilot row does not match schedule: {row['id']}")
        validate_conversation({"messages": row.get("messages")}, attributes)
    with pilot_path.open("a", encoding="utf-8") as handle:
        for attributes in grid[: args.limit]:
            if attributes["id"] in by_id:
                continue
            messages = call_groq(
                attributes,
                opening_bans(rows),
                voice,
                api_key,
                attempts=args.attempts,
            )
            row = {
                "id": attributes["id"],
                "model": MODEL,
                "teacher_url": TEACHER_URL,
                "temperature": TEMPERATURE,
                "recipe_sha256": recipe_sha256,
                "attributes": attributes,
                "messages": messages,
                "violations": content_violations(messages),
            }
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
            handle.flush()
            rows.append(row)
            by_id[row["id"]] = row
            print(f"{len(rows)}/{args.limit} {row['id']}", file=sys.stderr, flush=True)
    rows.sort(key=lambda row: row["id"])
    if len(rows) != args.limit:
        raise ValueError(f"pilot requires {args.limit} rows, got {len(rows)}")
    write_transcript(output / "transcript.md", rows)
    sync_review(output / "review.csv", rows)
    return 0


def review_summary(
    pilot: Path, review: Path, require_complete: bool = True
) -> dict[str, Any]:
    rows = load_jsonl(pilot)
    if len(rows) != 100 or len({row["id"] for row in rows}) != 100:
        raise ValueError("pilot must contain exactly 100 unique rows")
    with review.open(encoding="utf-8", newline="") as handle:
        reviews = list(csv.DictReader(handle))
    if len(reviews) != 100 or {row["sample_id"] for row in reviews} != {
        row["id"] for row in rows
    }:
        raise ValueError("review CSV must contain exactly the 100 pilot IDs")
    values = [row["register_persona_pass"].strip().casefold() for row in reviews]
    invalid = [value for value in values if value not in {"true", "false"}]
    if require_complete and invalid:
        raise ValueError(f"review CSV has {len(invalid)} unreviewed rows")
    structural_failures = 0
    for row in rows:
        try:
            validate_conversation(
                {"messages": row.get("messages")}, row.get("attributes")
            )
        except (KeyError, TypeError, ValueError):
            structural_failures += 1
    violation_counts = Counter(
        item for row in rows for item in row.get("violations", [])
    )
    return {
        "policy": "diagnostic-only; no automatic rerun gate",
        "samples": 100,
        "ai_disclosure": violation_counts["ai_disclosure"],
        "self_prefix": violation_counts["self_prefix"],
        "structural_failures": structural_failures,
        "manual_register_persona_pass": values.count("true"),
        "manual_register_persona_fail": values.count("false"),
        "manual_unreviewed": len(invalid),
        "all_mechanical_violations": dict(sorted(violation_counts.items())),
    }


def summarize(args: argparse.Namespace) -> int:
    output = Path(args.output_dir)
    result = review_summary(
        output / "pilot.jsonl", output / "review.csv", not args.allow_unreviewed
    )
    rendered = json.dumps(result, indent=2, sort_keys=True)
    print(rendered)
    (output / "summary.json").write_text(rendered + "\n", encoding="utf-8")
    return 0


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    commands = result.add_subparsers(dest="command", required=True)
    grid = commands.add_parser(
        "schedule", help="write and validate the deterministic attribute grid"
    )
    grid.add_argument("--seed", type=int, default=20260811)
    grid.add_argument("--output", type=Path, default=DEFAULT_OUT / "schedule.jsonl")
    grid.set_defaults(function=write_schedule)
    pilot = commands.add_parser(
        "run", help="run or resume a bounded teacher screen"
    )
    pilot.add_argument("--seed", type=int, default=20260811)
    pilot.add_argument("--attempts", type=int, default=7)
    pilot.add_argument("--limit", type=int, default=12, metavar="N")
    pilot.add_argument("--output-dir", type=Path, default=DEFAULT_OUT)
    pilot.set_defaults(function=run)
    summary = commands.add_parser(
        "summary", help="validate full review and summarize the pilot"
    )
    summary.add_argument("--output-dir", type=Path, default=DEFAULT_OUT)
    summary.add_argument("--allow-unreviewed", action="store_true")
    summary.set_defaults(function=summarize)
    return result


def main() -> int:
    command = parser()
    args = command.parse_args()
    try:
        return args.function(args)
    except (OSError, ValueError, RuntimeError, urllib.error.URLError) as error:
        command.error(str(error))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
