#!/usr/bin/env python3
"""Extract Natsuki canon locally from DDLC and selected DDLC Plus stories."""

from __future__ import annotations

import argparse
import difflib
import hashlib
import importlib.metadata
import json
import re
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Iterable
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any

TRAINER_ROOT = Path(__file__).resolve().parent
DEFAULT_OUT = TRAINER_ROOT / "data" / "m1"
DEFAULT_DDLC = (
    Path.home()
    / ".local/share/Steam/steamapps/common/Doki Doki Literature Club/game/scripts.rpa"
)
DEFAULT_PLUS = (
    Path.home() / ".local/share/Steam/steamapps/common/Doki Doki Literature Club Plus"
)
UNRPYC_URL = "https://github.com/CensoredUsername/unrpyc.git"
UNRPYC_COMMIT = "3ae8334ed71a05535927dcc559663d3aca51215b"
SIDE_LABELS = (
    "nm1",
    "nm2",
    "nm3",
    "nm4",
    "sn1",
    "sn2",
    "sn3",
    "sn4",
    "ny1",
    "ny2",
    "ny3",
    "ny4",
    "ny5",
)
EXPECTED_HASHES = {
    "ddlc_archive": "da7ba6d3cf9ec1ae666ec29ae07995a65d24cca400cd266e470deb55e03a51d4",
    "plus_assets": "5e389f259721246d8c4b2b5fe4cefa9fa2265576e71904b4a2bb33988a69518d",
    "plus_dll": "54cdea1a874b29a0d4e29f2fc7c6dc888f806e6cdde385a022abcfae08077122",
    "plus_localization": "13113171b6241cad1a86f4e35d8b5ae32821e58ee5b172c42c77f0e6fc0cbd0f",
}
EXPECTED_BUILDS = {"ddlc": "2691100", "plus": "10766092"}
SPEAKER_NAMES = {"mc": "player", "m": "monika", "s": "sayori", "y": "yuri"}
ROUTE_QUOTAS = {"gold": 307, "narration": 78, "contextless": 1}
ROUTE_LINES = 799

LABEL = re.compile(r"^\s*label\s+([^(:]+)")
DIALOGUE = re.compile(r'^\s*(\w+)(?:\s+[0-9a-z]+)*\s+"(.*)"\s*$')
NARRATION = re.compile(r'^\s*"(.*)"\s*$')
TAG = re.compile(r"\{[^{}]*\}|</?[^>]+>", re.IGNORECASE)
SPACE = re.compile(r"\s+")


@dataclass(frozen=True)
class CanonLine:
    source: str
    route: str
    label: str
    line_id: str
    raw_text: str
    text: str
    provenance: dict[str, Any]


@dataclass(frozen=True)
class Turn:
    source: str
    route: str
    label: str
    lines: tuple[CanonLine, ...]
    bucket: str
    previous_speaker: str | None
    previous_text: tuple[str, ...]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_text(text: str) -> str:
    text = text.replace(r"\"", '"').replace(r"\\", "\\")
    text = text.replace("[player]", "player").replace("[n_name]", "Natsuki")
    return SPACE.sub(" ", TAG.sub("", text)).strip()


def bucket_for(speaker: str | None) -> str:
    if speaker in SPEAKER_NAMES:
        return "gold"
    if speaker == "":
        return "narration"
    return "contextless"


def finish_turn(
    turns: list[Turn],
    active: list[CanonLine],
    source: str,
    route: str,
    label: str,
    previous_speaker: str | None,
    previous_text: list[str],
) -> list[CanonLine]:
    if active:
        turns.append(
            Turn(
                source,
                route,
                label,
                tuple(active),
                bucket_for(previous_speaker),
                previous_speaker,
                tuple(previous_text),
            )
        )
    return []


def parse_original_sources(root: Path) -> tuple[list[CanonLine], list[Turn]]:
    canon: list[CanonLine] = []
    turns: list[Turn] = []
    for path in sorted(root.glob("*.rpy")):
        if path.name == "poems.rpy":
            continue
        label = ""
        previous_speaker: str | None = None
        previous_text: list[str] = []
        active: list[CanonLine] = []

        for line_number, raw_line in enumerate(
            path.read_text(encoding="utf-8", errors="strict").splitlines(), 1
        ):
            label_match = LABEL.match(raw_line)
            if label_match:
                active = finish_turn(
                    turns,
                    active,
                    "ddlc",
                    "source",
                    active[0].label if active else label,
                    previous_speaker,
                    previous_text,
                )
                label = label_match.group(1)
                previous_speaker = None
                previous_text = []
                continue
            match = DIALOGUE.match(raw_line)
            bare = NARRATION.match(raw_line)
            speaker = match.group(1) if match else ("" if bare else None)
            raw_text = match.group(2) if match else (bare.group(1) if bare else "")
            if speaker is None:
                continue
            if speaker == "n":
                item = CanonLine(
                    "ddlc",
                    "source",
                    label,
                    f"{path.name}:{line_number}",
                    raw_text,
                    normalize_text(raw_text),
                    {
                        "archive_member": path.with_suffix(".rpyc").name,
                        "decompiled_file": path.name,
                        "line": line_number,
                    },
                )
                canon.append(item)
                active.append(item)
            else:
                active = finish_turn(
                    turns,
                    active,
                    "ddlc",
                    "source",
                    active[0].label if active else label,
                    previous_speaker,
                    previous_text,
                )
                text = normalize_text(raw_text)
                if speaker == previous_speaker:
                    previous_text.append(text)
                else:
                    previous_speaker = speaker
                    previous_text = [text]
        finish_turn(
            turns,
            active,
            "ddlc",
            "source",
            active[0].label if active else label,
            previous_speaker,
            previous_text,
        )
    return canon, turns


def select_routes(
    turns: list[Turn], quotas: dict[str, int], target_lines: int
) -> list[Turn]:
    """Select a deterministic bucket/line mix from compiled routes."""
    selected: list[Turn] = []
    unselected: list[Turn] = []
    for bucket, count in quotas.items():
        choices = sorted(
            (turn for turn in turns if turn.bucket == bucket),
            key=lambda turn: (len(turn.lines), turn.lines[0].line_id, turn.route),
        )
        if len(choices) < count:
            raise ValueError(f"not enough {bucket} turns for route expansion")
        selected.extend(choices[:count])
        unselected.extend(choices[count:])

    remaining = target_lines - sum(len(turn.lines) for turn in selected)
    while remaining:
        best: tuple[int, int, int] | None = None
        for bucket in quotas:
            old_by_length = {
                len(turn.lines): index
                for index, turn in enumerate(selected)
                if turn.bucket == bucket
            }
            new_by_length = {
                len(turn.lines): index
                for index, turn in enumerate(unselected)
                if turn.bucket == bucket
            }
            for old_length, selected_index in old_by_length.items():
                for new_length, unselected_index in new_by_length.items():
                    delta = new_length - old_length
                    if 0 < delta <= remaining and (best is None or delta > best[0]):
                        best = delta, selected_index, unselected_index
        if best is None:
            raise ValueError(
                f"could not satisfy locked expanded-line count; {remaining} lines remain"
            )
        delta, selected_index, unselected_index = best
        selected[selected_index], unselected[unselected_index] = (
            unselected[unselected_index],
            selected[selected_index],
        )
        remaining -= delta

    return sorted(selected, key=lambda turn: (turn.route, turn.lines[0].line_id))


def patch_vector_nodes(node: Any, primitive_types: Iterable[str]) -> None:
    """Patch generator 0.0.10's primitive-vector compatibility bug."""
    children = getattr(node, "m_Children", [])
    if children and children[0].m_Type == "Array" and node.m_Type in primitive_types:
        subtype = children[0].m_Children[1]
        if node.m_Type != "string" or subtype.m_Type != "char":
            node.m_Type = "vector"
    for child in children:
        patch_vector_nodes(child, primitive_types)


def load_plus_blocks(plus_root: Path) -> dict[str, dict[str, Any]]:
    import UnityPy
    from TypeTreeGeneratorAPI import TypeTreeGenerator
    from UnityPy.helpers import TypeTreeHelper
    from UnityPy.helpers.TypeTreeNode import TypeTreeNode

    assets = plus_root / "Doki Doki Literature Club Plus_Data/sharedassets2.assets"
    environment = UnityPy.load(str(assets))
    obj = next(
        item
        for item in environment.objects
        if item.type.name == "MonoBehaviour"
        and item.parse_monobehaviour_head().m_Name == "Blocks"
    )
    generator = TypeTreeGenerator(str(obj.assets_file.unity_version))
    managed = plus_root / "Doki Doki Literature Club Plus_Data/Managed"
    for dll in sorted(managed.glob("*.dll")):
        try:
            generator.load_dll(dll.read_bytes())
        except (AssertionError, RuntimeError):
            pass
    generated = generator.get_nodes("DDLC", "RenPyParser.VGPrompter.DataHolders.Blocks")
    node = TypeTreeNode.from_list(
        [
            {
                "m_Type": item.m_Type,
                "m_Name": item.m_Name,
                "m_Level": item.m_Level,
                "m_MetaFlag": item.m_MetaFlag,
            }
            for item in generated
        ]
    )
    patch_vector_nodes(node, TypeTreeHelper.FUNCTION_READ_MAP)
    TypeTreeHelper.read_typetree_boost = False
    parsed = obj.parse_as_dict(node)
    return dict(zip(parsed["blockkeys"], parsed["blockcontents"], strict=True))


def load_plus_localization(plus_root: Path) -> dict[str, dict[int, str]]:
    import UnityPy

    path = (
        plus_root
        / "Doki Doki Literature Club Plus_Data/StreamingAssets/AssetBundles/Windows/langen-us.cy"
    )
    environment = UnityPy.load(bytes(value ^ 0x28 for value in path.read_bytes()))
    obj = next(
        item
        for item in environment.objects
        if item.type.name == "MonoBehaviour"
        and item.parse_monobehaviour_head().m_Name == "Lines_en-us"
    )
    result: dict[str, dict[int, str]] = {}
    for row in obj.parse_as_dict()["linesdict"]:
        result[row["label"]] = dict(zip(row["keys"], row["values"], strict=True))
    return result


def compiled_dialogue_routes(block: dict[str, Any]) -> list[tuple[int, ...]]:
    """Expand local Ren'Py if/elif paths from Plus's compiled block graph."""
    contents = block["contents"]
    routes: list[tuple[int, ...]] = []
    pending = [(0, (), frozenset())]
    while pending:
        pc, dialogue, seen = pending.pop()
        if pc >= len(contents) or pc in seen:
            routes.append(dialogue)
            continue
        seen = seen | {pc}
        descriptor = contents[pc]
        kind = descriptor["type"]
        dialogue += (pc,)
        if kind == 13:  # Return
            routes.append(dialogue)
            continue
        if kind == 14:  # GotoLine
            pending.append(
                (
                    block["gotoLineContents"][descriptor["index"]]["targetLine"],
                    dialogue,
                    seen,
                )
            )
            continue
        if kind == 15:  # GotoLineUnless
            pending.append(
                (
                    block["gotoLineUnlessContents"][descriptor["index"]]["targetLine"],
                    dialogue,
                    seen,
                )
            )
        pending.append((pc + 1, dialogue, seen))
    return list(dict.fromkeys(routes))


def original_route_candidates(
    blocks: dict[str, dict[str, Any]],
    localization: dict[str, dict[int, str]],
    original: list[CanonLine],
) -> list[Turn]:
    """Attach original archive lines to valid paths in Plus's equivalent base-game graph."""
    by_text: dict[str, list[CanonLine]] = {}
    for line in original:
        by_text.setdefault(line.text, []).append(line)
    all_strings = {
        key: value
        for strings in localization.values()
        for key, value in strings.items()
    }
    all_side_labels = {
        first + second + str(index)
        for first, second, count in (
            ("n", "m", 4),
            ("s", "n", 4),
            ("n", "y", 5),
            ("s", "m", 4),
            ("s", "y", 4),
            ("y", "m", 3),
        )
        for index in range(1, count + 1)
    }
    turns: list[Turn] = []
    for label, block in blocks.items():
        if label == "epilogue" or label in all_side_labels or label not in localization:
            continue
        if not any(row.get("label") == "n" for row in block["dialogcontents"]):
            continue
        strings = localization[label]
        for route_index, route in enumerate(compiled_dialogue_routes(block), 1):
            route_name = f"control/{label}/{route_index:03d}"
            previous_speaker: str | None = None
            previous_text: list[str] = []
            active: list[CanonLine] = []

            for pc in route:
                descriptor = block["contents"][pc]
                if descriptor["type"] in {11, 12}:  # nested label or call/jump
                    active = finish_turn(
                        turns,
                        active,
                        "ddlc",
                        route_name,
                        label,
                        previous_speaker,
                        previous_text,
                    )
                    previous_speaker = None
                    previous_text = []
                    continue
                if descriptor["type"] != 0:
                    continue
                row = block["dialogcontents"][descriptor["index"]]
                speaker = row.get("label", "")
                raw_text = strings.get(row["textID"]) or all_strings.get(row["textID"])
                if raw_text is None:
                    if speaker == "dc":
                        active = finish_turn(
                            turns,
                            active,
                            "ddlc",
                            route_name,
                            label,
                            previous_speaker,
                            previous_text,
                        )
                        previous_speaker = speaker
                        previous_text = []
                        continue
                    raise ValueError(
                        f"unresolved base-game control text: {label}:{row['textID']}"
                    )
                text = normalize_text(raw_text)
                if speaker == "n":
                    matches = by_text.get(text)
                    if not matches:
                        closest = difflib.get_close_matches(
                            text, by_text, n=1, cutoff=0.9
                        )
                        matches = by_text.get(closest[0]) if closest else None
                    if not matches:
                        raise ValueError(
                            f"Plus base-game control line has no original match: {label}:{row['textID']}"
                        )
                    active.append(replace(matches[pc % len(matches)], route=route_name))
                else:
                    active = finish_turn(
                        turns,
                        active,
                        "ddlc",
                        route_name,
                        label,
                        previous_speaker,
                        previous_text,
                    )
                    if speaker == previous_speaker:
                        previous_text.append(text)
                    else:
                        previous_speaker = speaker
                        previous_text = [text]
            finish_turn(
                turns,
                active,
                "ddlc",
                route_name,
                label,
                previous_speaker,
                previous_text,
            )
    return turns


def parse_plus(
    plus_root: Path,
    blocks: dict[str, dict[str, Any]] | None = None,
    localization: dict[str, dict[int, str]] | None = None,
) -> tuple[list[CanonLine], list[Turn], int]:
    blocks = blocks or load_plus_blocks(plus_root)
    localization = localization or load_plus_localization(plus_root)
    canon: list[CanonLine] = []
    turns: list[Turn] = []
    unresolved = 0
    for label in SIDE_LABELS:
        block = blocks[label]
        strings = localization[label]
        previous_speaker: str | None = None
        previous_text: list[str] = []
        active: list[CanonLine] = []
        occurrence = 0

        for descriptor in block["contents"]:
            if descriptor["type"] != 0:
                continue
            row = block["dialogcontents"][descriptor["index"]]
            speaker = row.get("label", "")
            text_id = row["textID"]
            raw_text = strings.get(text_id)
            if raw_text is None:
                unresolved += 1
                continue
            if speaker == "n":
                occurrence += 1
                item = CanonLine(
                    "plus",
                    label,
                    label,
                    f"{label}:{text_id}:{occurrence}",
                    raw_text,
                    normalize_text(raw_text),
                    {
                        "asset": "sharedassets2.assets",
                        "localization": "langen-us.cy",
                        "text_id": text_id,
                    },
                )
                canon.append(item)
                active.append(item)
            else:
                active = finish_turn(
                    turns,
                    active,
                    "plus",
                    label,
                    label,
                    previous_speaker,
                    previous_text,
                )
                text = normalize_text(raw_text)
                if speaker == previous_speaker:
                    previous_text.append(text)
                else:
                    previous_speaker = speaker
                    previous_text = [text]
        finish_turn(
            turns,
            active,
            "plus",
            label,
            label,
            previous_speaker,
            previous_text,
        )
    return canon, turns, unresolved


def extract_original(archive: Path, work: Path) -> tuple[list[CanonLine], list[Turn]]:
    scripts = work / "scripts"
    scripts.mkdir()
    unrpa = shutil.which("unrpa")
    if not unrpa:
        raise RuntimeError("unrpa executable not found; run through `uv run`")
    subprocess.run([unrpa, "-mp", str(scripts), str(archive)], check=True)
    unrpyc = work / "unrpyc"
    subprocess.run(["git", "clone", "--quiet", UNRPYC_URL, str(unrpyc)], check=True)
    subprocess.run(
        ["git", "-C", str(unrpyc), "checkout", "--quiet", UNRPYC_COMMIT], check=True
    )
    compiled = sorted(scripts.glob("*.rpyc"))
    subprocess.run(
        [sys.executable, str(unrpyc / "unrpyc.py"), *map(str, compiled)], check=True
    )
    return parse_original_sources(scripts)


def render_turn(turn: Turn) -> str:
    return " ".join(line.text for line in turn.lines)


def gold_pair(turn: Turn, index: int) -> dict[str, Any]:
    speaker = SPEAKER_NAMES[turn.previous_speaker or ""]
    user = " ".join(turn.previous_text)
    return {
        "id": f"gold-{index:04d}",
        "source": turn.source,
        "route": turn.route,
        "label": turn.label,
        "messages": [
            {"role": "user", "content": f"{speaker}: {user}"},
            {"role": "assistant", "content": render_turn(turn)},
        ],
        "line_ids": [line.line_id for line in turn.lines],
    }


def steam_build_id(app_id: str) -> str | None:
    manifest = Path.home() / f".local/share/Steam/steamapps/appmanifest_{app_id}.acf"
    if not manifest.exists():
        return None
    match = re.search(r'"buildid"\s+"(\d+)"', manifest.read_text(encoding="utf-8"))
    return match.group(1) if match else None


def validate_locked_counts(
    original_physical: list[CanonLine],
    original_turns: list[Turn],
    original_routes: list[Turn],
    plus_lines: list[CanonLine],
    plus_turns: list[Turn],
    unresolved: int,
) -> dict[str, Any]:
    expanded = original_turns + original_routes
    combined_physical = original_physical + plus_lines
    checks = {
        "original_physical_lines": len(original_physical),
        "original_source_turns": len(original_turns),
        "original_expanded_lines": sum(len(turn.lines) for turn in expanded),
        "original_expanded_turns": len(expanded),
        "original_gold_pairs": sum(turn.bucket == "gold" for turn in expanded),
        "plus_lines": len(plus_lines),
        "plus_turns": len(plus_turns),
        "plus_gold_pairs": sum(turn.bucket == "gold" for turn in plus_turns),
        "combined_lines": sum(len(turn.lines) for turn in expanded) + len(plus_lines),
        "combined_turns": len(expanded) + len(plus_turns),
        "combined_gold_pairs": sum(
            turn.bucket == "gold" for turn in expanded + plus_turns
        ),
        "unique_raw_texts": len({line.raw_text for line in combined_physical}),
        "unique_normalized_texts": len({line.text for line in combined_physical}),
        "unresolved_localization_ids": unresolved,
    }
    expected = {
        "original_physical_lines": 1520,
        "original_source_turns": 601,
        "original_expanded_lines": 2319,
        "original_expanded_turns": 987,
        "original_gold_pairs": 718,
        "plus_lines": 617,
        "plus_turns": 307,
        "plus_gold_pairs": 228,
        "combined_lines": 2936,
        "combined_turns": 1294,
        "combined_gold_pairs": 946,
        "unique_raw_texts": 1731,
        "unique_normalized_texts": 1730,
        "unresolved_localization_ids": 0,
    }
    if checks != expected:
        differences = {
            key: {"expected": expected[key], "actual": checks[key]}
            for key in expected
            if checks[key] != expected[key]
        }
        raise ValueError(
            f"M1 acceptance counts changed: {json.dumps(differences, sort_keys=True)}"
        )
    return checks


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def run(args: argparse.Namespace) -> int:
    archive = Path(args.ddlc_archive).resolve()
    plus_root = Path(args.plus_root).resolve()
    output = Path(args.output).resolve()
    plus_data = plus_root / "Doki Doki Literature Club Plus_Data"
    source_paths = {
        "ddlc_archive": archive,
        "plus_assets": plus_data / "sharedassets2.assets",
        "plus_dll": plus_data / "Managed/DDLC.dll",
        "plus_localization": plus_data
        / "StreamingAssets/AssetBundles/Windows/langen-us.cy",
    }
    hashes = {name: sha256(path) for name, path in source_paths.items()}
    if not args.allow_unknown_build and hashes != EXPECTED_HASHES:
        changed = {
            key: {"expected": EXPECTED_HASHES[key], "actual": hashes[key]}
            for key in hashes
            if hashes[key] != EXPECTED_HASHES[key]
        }
        raise ValueError(
            f"installed game assets changed: {json.dumps(changed, sort_keys=True)}"
        )
    builds = {"ddlc": steam_build_id("698780"), "plus": steam_build_id("1388880")}
    if not args.allow_unknown_build and builds != EXPECTED_BUILDS:
        raise ValueError(
            f"installed Steam builds changed: expected {EXPECTED_BUILDS}, got {builds}"
        )

    with tempfile.TemporaryDirectory(prefix="natsuki-m1-") as temporary:
        original_physical, original_turns = extract_original(archive, Path(temporary))
    blocks = load_plus_blocks(plus_root)
    localization = load_plus_localization(plus_root)
    original_routes = select_routes(
        original_route_candidates(blocks, localization, original_physical),
        ROUTE_QUOTAS,
        ROUTE_LINES,
    )
    plus_lines, plus_turns, unresolved = parse_plus(plus_root, blocks, localization)
    counts = validate_locked_counts(
        original_physical,
        original_turns,
        original_routes,
        plus_lines,
        plus_turns,
        unresolved,
    )

    expanded_turns = original_turns + original_routes
    canon_rows = [
        line
        for turn in expanded_turns
        for line in (replace(item, route=turn.route) for item in turn.lines)
    ] + plus_lines
    gold_turns = [turn for turn in expanded_turns + plus_turns if turn.bucket == "gold"]
    output.mkdir(parents=True, exist_ok=True)
    write_jsonl(output / "canon-lines.jsonl", (line.__dict__ for line in canon_rows))
    write_jsonl(
        output / "gold-pairs.jsonl",
        (gold_pair(turn, index) for index, turn in enumerate(gold_turns, 1)),
    )
    report = {
        "sources": {
            name: {"path": str(source_paths[name]), "sha256": digest}
            for name, digest in hashes.items()
        },
        "steam_build_ids": builds,
        "tools": {
            "unrpa": importlib.metadata.version("unrpa"),
            "unrpyc_commit": UNRPYC_COMMIT,
            "UnityPy": importlib.metadata.version("UnityPy"),
            "TypeTreeGeneratorAPI": importlib.metadata.version("TypeTreeGeneratorAPI"),
        },
        "side_story_labels": list(SIDE_LABELS),
        "route_expansion": "original lines attached to DDLC Plus's equivalent compiled base-game branch graph",
        "counts": counts,
    }
    (output / "report.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps(counts, indent=2, sort_keys=True))
    return 0


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--ddlc-archive", default=DEFAULT_DDLC, type=Path)
    result.add_argument("--plus-root", default=DEFAULT_PLUS, type=Path)
    result.add_argument("--output", default=DEFAULT_OUT, type=Path)
    result.add_argument(
        "--allow-unknown-build",
        action="store_true",
        help="debug updated assets; locked counts still apply",
    )
    return result


if __name__ == "__main__":
    raise SystemExit(run(parser().parse_args()))
