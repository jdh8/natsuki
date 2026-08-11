#!/usr/bin/env python3
"""M0 hardware measurement and stock-model evaluation harness.

This module intentionally uses only the Python standard library so the M0
measurement cannot be blocked by an ML dependency stack.  Run it through the
``trainer/m0`` wrapper, which keeps every large cache and temporary file on
``/srv/var``.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import shutil
import signal
import statistics
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parent.parent
TRAINER_ROOT = REPO_ROOT / "trainer"
DEFAULT_OUT = TRAINER_ROOT / "out" / "m0"
DEFAULT_PROMPTS = TRAINER_ROOT / "m0-prompts.jsonl"
SYSTEM_PROMPT = (
    "You are Natsuki from Doki Doki Literature Club, chatting on Discord.  "
    "You are tsundere: blunt, easily flustered, secretly kind.  "
    "You love baking (especially cupcakes) and manga (Parfait Girls is the best, "
    "fight me).  You are defensive about your height and about manga being real "
    "literature.  You call people 'dummy' when embarrassed and hide vulnerability "
    "behind snark, but you genuinely care about your friends.  "
    "User messages are prefixed with the speaker's name like 'name: text'; do NOT "
    "prefix your own replies with a name.  Keep replies short, 1-3 sentences, "
    "casual Discord tone.  Stay in character.  Never mention being an AI or a "
    "language model."
)

AI_DISCLOSURE = re.compile(
    r"(?i)\b(?:as an? (?:ai|assistant|language model)|i(?:'m| am) (?:an? )?"
    r"(?:ai|assistant|language model)|artificial intelligence|large language model)\b"
)
REFUSAL = re.compile(
    r"(?i)\b(?:i (?:cannot|can't|won't|am unable to)|i must decline|"
    r"i(?:'m| am) sorry,? but)\b"
)
SELF_PREFIX = re.compile(r"^\s*(?:natsuki|assistant)\s*:", re.IGNORECASE)
SPECIAL_TOKEN = re.compile(
    r"<\|(?:im_start|im_end|endoftext|assistant|user|system)\|>|"
    r"<\/?(?:s|bos|eos|think|tool_call|tool_response)>|\[/?INST\]",
    re.IGNORECASE,
)
CODE_FENCE = re.compile(r"```")
MODEL_FILES = {
    "qwen": (
        Path("/srv/var/jdh8/models/natsuki/m0/Qwen3-4B-Instruct-2507-Q5_K_M.gguf"),
        "5bde5e9d883622acb02bf77fe7dcbc56a8b9a9ad4be78a72ca23a532658b4ecb",
    ),
    "granite": (
        Path("/srv/var/jdh8/models/natsuki/m0/granite-4.1-3b-Q5_K_M.gguf"),
        "f7724d259f29b0edf147144ac530ca26f91c97af8274249f933073c461678a3c",
    ),
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def percentile(values: list[float], fraction: float) -> float:
    """Return a linearly interpolated percentile without third-party packages."""
    if not values:
        raise ValueError("percentile requires at least one value")
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def query_vram() -> tuple[int, int, int]:
    result = subprocess.run(
        [
            "nvidia-smi",
            "--query-gpu=memory.total,memory.used,memory.free",
            "--format=csv,noheader,nounits",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    line = result.stdout.strip().splitlines()
    if len(line) != 1:
        raise RuntimeError(f"expected one GPU, got {len(line)}: {result.stdout!r}")
    total, used, free = (int(value.strip()) for value in line[0].split(","))
    return total, used, free


def sample_vram(args: argparse.Namespace) -> int:
    output = Path(args.output)
    ensure_parent(output)
    stop = False

    def request_stop(_signum: int, _frame: object) -> None:
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)
    write_header = not output.exists() or output.stat().st_size == 0
    deadline = time.monotonic() + args.duration

    with output.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        if write_header:
            writer.writerow(["timestamp_utc", "memory_total_mib", "memory_used_mib", "memory_free_mib"])
            handle.flush()
        while not stop and time.monotonic() < deadline:
            started = time.monotonic()
            try:
                total, used, free = query_vram()
            except (OSError, subprocess.CalledProcessError, RuntimeError) as error:
                print(f"{utc_now()} nvidia-smi failed: {error}", file=sys.stderr, flush=True)
            else:
                writer.writerow([utc_now(), total, used, free])
                handle.flush()
            remaining = args.interval - (time.monotonic() - started)
            if remaining > 0 and not stop:
                time.sleep(remaining)
    return 0


def read_vram(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def vram_summary(path: Path, threshold: int, interval: float) -> dict[str, Any]:
    rows = read_vram(path)
    if not rows:
        raise ValueError(f"no samples in {path}")
    free = [float(row["memory_free_mib"]) for row in rows]
    used = [float(row["memory_used_mib"]) for row in rows]
    timestamps = [datetime.fromisoformat(row["timestamp_utc"]) for row in rows]
    duration_seconds = max(0.0, (timestamps[-1] - timestamps[0]).total_seconds())
    passing = sum(value >= threshold for value in free)
    expected_samples = 86400 / interval
    complete = duration_seconds >= 23.5 * 3600 and len(rows) >= expected_samples * 0.95
    pass_fraction = passing / len(rows)
    return {
        "source": str(path),
        "samples": len(rows),
        "duration_hours": round(duration_seconds / 3600, 3),
        "interval_seconds": interval,
        "threshold_free_mib": threshold,
        "samples_at_or_above_threshold": passing,
        "pass_fraction": round(pass_fraction, 6),
        "free_mib": {
            "minimum": min(free),
            "p01": round(percentile(free, 0.01), 2),
            "median": round(statistics.median(free), 2),
            "maximum": max(free),
        },
        "used_mib": {
            "minimum": min(used),
            "median": round(statistics.median(used), 2),
            "p95": round(percentile(used, 0.95), 2),
            "p99": round(percentile(used, 0.99), 2),
            "maximum": max(used),
        },
        "complete_24h_window": complete,
        "capacity_gate_passed": complete and pass_fraction >= 0.99,
    }


def summarize_vram(args: argparse.Namespace) -> int:
    summary = vram_summary(Path(args.input), args.threshold, args.interval)
    rendered = json.dumps(summary, indent=2, sort_keys=True)
    print(rendered)
    if args.output:
        output = Path(args.output)
        ensure_parent(output)
        output.write_text(rendered + "\n", encoding="utf-8")
    return 0


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"{path}:{line_number}: {error}") from error
            if not isinstance(row, dict):
                raise ValueError(f"{path}:{line_number}: expected object")
            rows.append(row)
    return rows


def validate_prompts(prompts: Iterable[dict[str, Any]]) -> None:
    seen: set[str] = set()
    count = 0
    for prompt in prompts:
        count += 1
        prompt_id = prompt.get("id")
        if not isinstance(prompt_id, str) or not prompt_id:
            raise ValueError("every prompt needs a non-empty string id")
        if prompt_id in seen:
            raise ValueError(f"duplicate prompt id: {prompt_id}")
        seen.add(prompt_id)
        author = prompt.get("author")
        text = prompt.get("input")
        if not isinstance(author, str) or not re.fullmatch(r"[a-z0-9][a-z0-9_.]{0,30}[a-z0-9]", author):
            raise ValueError(f"{prompt_id}: invalid Discord username {author!r}")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"{prompt_id}: missing input")
        history = prompt.get("history", [])
        if not isinstance(history, list) or len(history) % 2:
            raise ValueError(f"{prompt_id}: history must contain complete exchanges")
        for index, message in enumerate(history):
            expected_role = "user" if index % 2 == 0 else "assistant"
            if message.get("role") != expected_role or not isinstance(message.get("content"), str):
                raise ValueError(f"{prompt_id}: invalid history message {index}")
    if count != 20:
        raise ValueError(f"M0 requires exactly 20 prompts, got {count}")


def sentence_count(text: str) -> int:
    chunks = [
        chunk
        for chunk in re.split(r"(?<=[.!?])(?:[\"')\]]*)\s+|\n+", text.strip())
        if re.search(r"\w", chunk, re.UNICODE)
    ]
    return len(chunks)


def repeated_ngram(text: str, size: int = 4) -> bool:
    words = re.findall(r"\w+", text.casefold())
    grams = [tuple(words[index : index + size]) for index in range(len(words) - size + 1)]
    return len(grams) != len(set(grams))


def violations(text: str) -> list[str]:
    found: list[str] = []
    checks = {
        "ai_disclosure": AI_DISCLOSURE,
        "refusal": REFUSAL,
        "self_prefix": SELF_PREFIX,
        "special_token": SPECIAL_TOKEN,
        "code_fence": CODE_FENCE,
    }
    for name, pattern in checks.items():
        if pattern.search(text):
            found.append(name)
    sentences = sentence_count(text)
    if sentences < 1 or sentences > 3:
        found.append("sentence_count")
    if repeated_ngram(text):
        found.append("loop")
    return found


def request_completion(
    endpoint: str,
    model: str,
    prompt: dict[str, Any],
    timeout: float,
) -> dict[str, Any]:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(prompt.get("history", []))
    messages.append({"role": "user", "content": f"{prompt['author']}: {prompt['input']}"})
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 256,
        "temperature": 0.8,
        "seed": prompt["seed"],
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "natsuki-m0/0.1"},
        method="POST",
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status = response.status
            body = json.loads(response.read())
    except urllib.error.HTTPError as error:
        status = error.code
        body = json.loads(error.read())
    elapsed = time.monotonic() - started
    content = ""
    if status < 400:
        content = body["choices"][0]["message"]["content"].strip()
    return {
        "timestamp_utc": utc_now(),
        "prompt_id": prompt["id"],
        "category": prompt["category"],
        "model": model,
        "seed": prompt["seed"],
        "request": payload,
        "http_status": status,
        "elapsed_seconds": round(elapsed, 6),
        "response": content,
        "violations": violations(content) if content else ["empty_response"],
        "usage": body.get("usage"),
        "timings": body.get("timings"),
        "error": body.get("error"),
    }


def sniff(args: argparse.Namespace) -> int:
    prompts = load_jsonl(Path(args.prompts))
    validate_prompts(prompts)
    output = Path(args.output)
    ensure_parent(output)
    with output.open("w", encoding="utf-8") as handle:
        for index, prompt in enumerate(prompts, 1):
            print(f"[{index:02d}/20] {prompt['id']}", file=sys.stderr, flush=True)
            row = request_completion(args.endpoint, args.model, prompt, args.timeout)
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
            handle.flush()
    return 0


def blind(args: argparse.Namespace) -> int:
    left = {row["prompt_id"]: row for row in load_jsonl(Path(args.left))}
    right = {row["prompt_id"]: row for row in load_jsonl(Path(args.right))}
    if left.keys() != right.keys():
        raise ValueError("result files contain different prompt ids")
    output = Path(args.output)
    key_output = Path(args.key_output)
    ensure_parent(output)
    ensure_parent(key_output)
    key: dict[str, Any] = {}
    lines = [
        "# M0 blinded stock-model review",
        "",
        "For each pair, record a winner (`A`, `B`, or `tie`) and 1-5 persona and coherence scores.",
        "Do not open the key until all 20 pairs are scored.",
        "",
    ]
    for prompt_id in sorted(left):
        left_row = left[prompt_id]
        right_row = right[prompt_id]
        swap = hashlib.sha256(prompt_id.encode()).digest()[0] & 1
        first, second = (right_row, left_row) if swap else (left_row, right_row)
        key[prompt_id] = {"A": first["model"], "B": second["model"]}
        user_message = first["request"]["messages"][-1]["content"]
        lines.extend(
            [
                f"## {prompt_id}",
                "",
                f"User: {user_message}",
                "",
                f"A: {first['response']}",
                "",
                f"B: {second['response']}",
                "",
                "Winner: ",
                "",
                "A persona/coherence: /5, /5",
                "",
                "B persona/coherence: /5, /5",
                "",
            ]
        )
    output.write_text("\n".join(lines), encoding="utf-8")
    key_output.write_text(json.dumps(key, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


@dataclass(frozen=True)
class BenchRow:
    source: str
    data: dict[str, Any]


def bench_summary(inputs: list[Path]) -> dict[str, Any]:
    rows: list[BenchRow] = []
    for path in inputs:
        for row in load_jsonl(path):
            rows.append(BenchRow(path.stem, row))
    if not rows:
        raise ValueError("no benchmark rows")
    normalized = []
    for row in rows:
        data = row.data
        normalized.append(
            {
                "run": row.source,
                "build_commit": data.get("build_commit"),
                "model": data.get("model_filename"),
                "flash_attn": data.get("flash_attn"),
                "n_prompt": data.get("n_prompt"),
                "n_gen": data.get("n_gen"),
                "avg_ts": data.get("avg_ts"),
                "stddev_ts": data.get("stddev_ts"),
                "n_gpu_layers": data.get("n_gpu_layers"),
                "n_ubatch": data.get("n_ubatch"),
            }
        )
    return {"generated_at": utc_now(), "rows": normalized}


def summarize_bench(args: argparse.Namespace) -> int:
    summary = bench_summary([Path(value) for value in args.inputs])
    rendered = json.dumps(summary, indent=2, sort_keys=True)
    print(rendered)
    if args.output:
        output = Path(args.output)
        ensure_parent(output)
        output.write_text(rendered + "\n", encoding="utf-8")
    return 0


def evaluation_summary(
    inputs: list[Path], scores_path: Path, key_path: Path
) -> dict[str, Any]:
    models: dict[str, dict[str, Any]] = {}
    for path in inputs:
        rows = load_jsonl(path)
        if len(rows) != 20:
            raise ValueError(f"{path}: expected 20 evaluation rows, got {len(rows)}")
        model_names = {row["model"] for row in rows}
        if len(model_names) != 1:
            raise ValueError(f"{path}: expected one model, got {sorted(model_names)}")
        model = model_names.pop()
        rescored = [violations(row["response"]) for row in rows]
        counts: dict[str, int] = {}
        for row_violations in rescored:
            for name in row_violations:
                counts[name] = counts.get(name, 0) + 1
        latencies = [float(row["elapsed_seconds"]) for row in rows]
        prompt_rates = [
            float(row["timings"]["prompt_per_second"])
            for row in rows
            if row.get("timings") and row["timings"].get("prompt_per_second") is not None
        ]
        decode_rates = [
            float(row["timings"]["predicted_per_second"])
            for row in rows
            if row.get("timings") and row["timings"].get("predicted_per_second") is not None
        ]
        models[model] = {
            "source": str(path),
            "prompts": len(rows),
            "http_successes": sum(int(row["http_status"]) < 400 for row in rows),
            "hard_rule_failure_prompts": sum(bool(found) for found in rescored),
            "violation_counts": counts,
            "latency_seconds": {
                "mean": round(statistics.mean(latencies), 6),
                "p95": round(percentile(latencies, 0.95), 6),
            },
            "token_rates": {
                "prompt_mean": round(statistics.mean(prompt_rates), 3),
                "decode_mean": round(statistics.mean(decode_rates), 3),
            },
        }

    scores_document = json.loads(scores_path.read_text(encoding="utf-8"))
    key = json.loads(key_path.read_text(encoding="utf-8"))
    score_rows = scores_document.get("scores")
    if not isinstance(score_rows, list) or len(score_rows) != 20:
        raise ValueError(f"{scores_path}: expected exactly 20 score rows")
    if set(key) != {row.get("prompt_id") for row in score_rows}:
        raise ValueError("blind score prompt ids do not match the key")

    wins = {model: 0 for model in models}
    wins["tie"] = 0
    dimensions = {
        model: {"persona": [], "coherence": []}
        for model in models
    }
    for row in score_rows:
        prompt_id = row["prompt_id"]
        winner = row.get("winner")
        if winner == "tie":
            wins["tie"] += 1
        elif winner in {"A", "B"}:
            winning_model = key[prompt_id][winner]
            if winning_model not in wins:
                raise ValueError(f"{prompt_id}: unknown winning model {winning_model}")
            wins[winning_model] += 1
        else:
            raise ValueError(f"{prompt_id}: winner must be A, B, or tie")
        for label in ("A", "B"):
            model = key[prompt_id][label]
            result = row.get(label)
            if model not in dimensions or not isinstance(result, dict):
                raise ValueError(f"{prompt_id}: invalid {label} score")
            for dimension in ("persona", "coherence"):
                value = result.get(dimension)
                if not isinstance(value, int) or not 1 <= value <= 5:
                    raise ValueError(f"{prompt_id}: {label} {dimension} must be an integer from 1 to 5")
                dimensions[model][dimension].append(value)

    for model, result in models.items():
        result["blinded_scores"] = {
            dimension: round(statistics.mean(values), 3)
            for dimension, values in dimensions[model].items()
        }
        result["stock_skip_gate_passed"] = (
            result["hard_rule_failure_prompts"] == 0
            and all(value >= 4 for value in result["blinded_scores"].values())
        )

    granite_name = next((name for name in models if name.startswith("granite")), None)
    granite_replacement_gate = bool(
        granite_name
        and wins[granite_name] >= 14
        and models[granite_name]["stock_skip_gate_passed"]
    )
    return {
        "generated_at": utc_now(),
        "evaluator": scores_document.get("evaluator"),
        "models": models,
        "blinded_wins": wins,
        "granite_replacement_gate_passed": granite_replacement_gate,
    }


def summarize_eval(args: argparse.Namespace) -> int:
    summary = evaluation_summary(
        [Path(value) for value in args.inputs], Path(args.scores), Path(args.key)
    )
    rendered = json.dumps(summary, indent=2, sort_keys=True)
    print(rendered)
    if args.output:
        output = Path(args.output)
        ensure_parent(output)
        output.write_text(rendered + "\n", encoding="utf-8")
    return 0


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def final_report(args: argparse.Namespace) -> int:
    capacity = json.loads(Path(args.capacity).read_text(encoding="utf-8"))
    preflight = json.loads(Path(args.preflight).read_text(encoding="utf-8"))
    benchmark = json.loads(Path(args.benchmark).read_text(encoding="utf-8"))
    evaluation = json.loads(Path(args.evaluation).read_text(encoding="utf-8"))
    decode_rows = [row for row in benchmark["rows"] if row["n_gen"] == 128]
    if not decode_rows:
        raise ValueError("benchmark summary has no 128-token decode rows")
    models = {}
    for name, (path, expected) in MODEL_FILES.items():
        actual = sha256_file(path)
        models[name] = {
            "path": str(path),
            "bytes": path.stat().st_size,
            "sha256": actual,
            "expected_sha256": expected,
            "checksum_verified": actual == expected,
        }
    offload = {}
    for name in MODEL_FILES:
        log_path = DEFAULT_OUT / "eval" / name / "server.mmq.fa-on.log"
        matches = re.findall(
            r"offloaded (\d+)/(\d+) layers to GPU",
            log_path.read_text(encoding="utf-8", errors="replace"),
        )
        loaded, total = matches[-1] if matches else ("0", "-1")
        offload[name] = {
            "configuration": "mmq, flash-attention on",
            "layers": f"{loaded}/{total}",
            "complete": loaded == total,
            "source": str(log_path),
        }
    complete = bool(capacity["complete_24h_window"])
    hardware_route = (
        "gtx-1660"
        if capacity["capacity_gate_passed"]
        else "rtx-4070"
        if complete
        else "pending-24h-capacity-window"
    )
    report = {
        "generated_at": utc_now(),
        "llama_cpp_commit": "dd1ea524333b1e697489067d7a4c39c60d32beee",
        "gpu": "NVIDIA GeForce GTX 1660 SUPER",
        "storage": {
            "hot_root": "/srv/var/jdh8",
            "cold_root": "/srv/home/jdh8/natsuki/m0",
        },
        "models": models,
        "served_offload": offload,
        "capacity": capacity,
        "preflight": preflight,
        "benchmark": benchmark,
        "evaluation": evaluation,
        "acceptance": {
            "decode_gate_passed": all(float(row["avg_ts"]) >= 30 for row in decode_rows),
            "full_offload_verified_for_served_models": all(
                result["complete"] for result in offload.values()
            ),
            "stock_model_qualifies": any(
                model["stock_skip_gate_passed"]
                for model in evaluation["models"].values()
            ),
            "granite_replaces_qwen": evaluation["granite_replacement_gate_passed"],
            "quality_route": (
                "full-evaluation-tiers"
                if any(
                    model["stock_skip_gate_passed"]
                    for model in evaluation["models"].values()
                )
                else "m1"
            ),
            "serving_hardware_route": hardware_route,
        },
    }
    rendered = json.dumps(report, indent=2, sort_keys=True)
    print(rendered)
    output = Path(args.output)
    ensure_parent(output)
    output.write_text(rendered + "\n", encoding="utf-8")
    return 0


def archive(args: argparse.Namespace) -> int:
    destination = Path(args.destination)
    destination.mkdir(parents=True, exist_ok=True)
    copied: list[Path] = []
    for source_name in args.inputs:
        source = Path(source_name)
        target = destination / source.name
        shutil.copy2(source, target)
        copied.append(target)
    manifest_lines = []
    for path in sorted(copied):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        manifest_lines.append(f"{digest}  {path.name}")
    (destination / "SHA256SUMS").write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    sample = subparsers.add_parser("sample-vram", help="sample GPU memory to CSV")
    sample.add_argument("--output", default=str(DEFAULT_OUT / "vram.csv"))
    sample.add_argument("--duration", type=float, default=86400)
    sample.add_argument("--interval", type=float, default=30)
    sample.set_defaults(function=sample_vram)

    vram = subparsers.add_parser("summarize-vram", help="summarize a VRAM CSV")
    vram.add_argument("--input", default=str(DEFAULT_OUT / "vram.csv"))
    vram.add_argument("--output")
    vram.add_argument("--threshold", type=int, default=4096)
    vram.add_argument("--interval", type=float, default=30)
    vram.set_defaults(function=summarize_vram)

    sniff_parser = subparsers.add_parser("sniff", help="run the fixed 20-prompt sniff test")
    sniff_parser.add_argument("--endpoint", default="http://127.0.0.1:8080/v1/chat/completions")
    sniff_parser.add_argument("--model", required=True)
    sniff_parser.add_argument("--prompts", default=str(DEFAULT_PROMPTS))
    sniff_parser.add_argument("--output", required=True)
    sniff_parser.add_argument("--timeout", type=float, default=120)
    sniff_parser.set_defaults(function=sniff)

    blind_parser = subparsers.add_parser("blind", help="render two sniff runs for blinded review")
    blind_parser.add_argument("--left", required=True)
    blind_parser.add_argument("--right", required=True)
    blind_parser.add_argument("--output", required=True)
    blind_parser.add_argument("--key-output", required=True)
    blind_parser.set_defaults(function=blind)

    bench = subparsers.add_parser("summarize-bench", help="normalize llama-bench JSONL files")
    bench.add_argument("inputs", nargs="+")
    bench.add_argument("--output")
    bench.set_defaults(function=summarize_bench)

    evaluation = subparsers.add_parser(
        "summarize-eval", help="summarize sniff runs and resolve blinded scores"
    )
    evaluation.add_argument("inputs", nargs="+")
    evaluation.add_argument("--scores", required=True)
    evaluation.add_argument("--key", required=True)
    evaluation.add_argument("--output")
    evaluation.set_defaults(function=summarize_eval)

    report = subparsers.add_parser("final-report", help="assemble the compact M0 report")
    report.add_argument("--capacity", default=str(DEFAULT_OUT / "vram-summary.json"))
    report.add_argument("--preflight", default=str(DEFAULT_OUT / "vram-preflight-summary.json"))
    report.add_argument("--benchmark", default=str(DEFAULT_OUT / "bench-summary.json"))
    report.add_argument("--evaluation", default=str(DEFAULT_OUT / "eval-summary.json"))
    report.add_argument("--output", default=str(DEFAULT_OUT / "m0-report.json"))
    report.set_defaults(function=final_report)

    archive_parser = subparsers.add_parser("archive", help="copy compact reports and write SHA256SUMS")
    archive_parser.add_argument("inputs", nargs="+")
    archive_parser.add_argument("--destination", default="/srv/home/jdh8/natsuki/m0")
    archive_parser.set_defaults(function=archive)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return args.function(args)
    except (OSError, ValueError, KeyError, urllib.error.URLError) as error:
        parser.error(str(error))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
