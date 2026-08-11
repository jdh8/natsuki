import sys
import tempfile
import unittest
from dataclasses import dataclass, field
from pathlib import Path

TRAINER = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TRAINER))
import extract


class ExtractTests(unittest.TestCase):
    def test_normalizes_tags_placeholders_and_escapes(self):
        self.assertEqual(
            extract.normalize_text(
                r"{i}Hi{/i}, [player]. {space=8}[n_name] said \"okay\"."
            ),
            'Hi, player. Natsuki said "okay".',
        )

    def test_parses_nested_labels_as_source_turn_boundaries(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "script.rpy"
            path.write_text(
                'label outer:\n    mc "First"\n    n 1a "One"\n    n "Two"\n'
                '    label inner:\n        y "Next"\n        n 2b "Three"\n',
                encoding="utf-8",
            )
            lines, turns = extract.parse_original_sources(Path(directory))
        self.assertEqual([line.text for line in lines], ["One", "Two", "Three"])
        self.assertEqual([len(turn.lines) for turn in turns], [2, 1])
        self.assertEqual([turn.bucket for turn in turns], ["gold", "gold"])

    def test_compiled_branch_paths_do_not_cross_each_other(self):
        block = {
            "contents": [
                {"type": 0, "index": 0},
                {"type": 15, "index": 0},
                {"type": 0, "index": 1},
                {"type": 14, "index": 0},
                {"type": 0, "index": 2},
                {"type": 13, "index": 0},
            ],
            "gotoLineUnlessContents": [{"targetLine": 4}],
            "gotoLineContents": [{"targetLine": 5}],
        }
        routes = extract.compiled_dialogue_routes(block)
        dialogue = {
            tuple(pc for pc in route if block["contents"][pc]["type"] == 0)
            for route in routes
        }
        self.assertEqual(dialogue, {(0, 2), (0, 4)})

    def test_compiled_call_resets_antecedent(self):
        original = [
            extract.CanonLine("ddlc", "source", "scene", "line:1", "Reply", "Reply", {})
        ]
        blocks = {
            "scene": {
                "contents": [
                    {"type": 0, "index": 0},
                    {"type": 12, "index": 0},
                    {"type": 0, "index": 1},
                    {"type": 13, "index": 0},
                ],
                "dialogcontents": [
                    {"label": "mc", "textID": 1},
                    {"label": "n", "textID": 2},
                ],
            }
        }
        turns = extract.original_route_candidates(
            blocks, {"scene": {1: "Before", 2: "Reply"}}, original
        )
        self.assertEqual(len(turns), 1)
        self.assertEqual(turns[0].bucket, "contextless")
        self.assertIsNone(turns[0].previous_speaker)

    def test_locked_route_selector_is_deterministic(self):
        def make(bucket, count, short):
            rows = []
            for index in range(count):
                length = 1 if index < short else (3 if index == short else 4)
                lines = tuple(
                    extract.CanonLine(
                        "ddlc", "source", "x", f"{bucket}:{index}:{part}", "x", "x", {}
                    )
                    for part in range(length)
                )
                rows.append(
                    extract.Turn("ddlc", "source", "x", lines, bucket, None, ())
                )
            return rows

        turns = (
            make("gold", 411, 307)
            + make("narration", 157, 78)
            + make("contextless", 33, 1)
        )
        quotas = {"gold": 307, "narration": 78, "contextless": 1}
        first = extract.select_routes(turns, quotas, 799)
        second = extract.select_routes(turns, quotas, 799)
        self.assertEqual(first, second)
        self.assertEqual(len(first), 386)
        self.assertEqual(sum(len(turn.lines) for turn in first), 799)
        self.assertEqual(
            {
                bucket: sum(turn.bucket == bucket for turn in first)
                for bucket in ("gold", "narration", "contextless")
            },
            {"gold": 307, "narration": 78, "contextless": 1},
        )

    def test_plus_generator_vector_compatibility_patch(self):
        @dataclass
        class Node:
            m_Type: str
            m_Children: list = field(default_factory=list)

        primitive_array = Node("int", [Node("Array", [Node("size"), Node("int")])])
        string = Node("string", [Node("Array", [Node("size"), Node("char")])])
        root = Node("Root", [primitive_array, string])
        extract.patch_vector_nodes(root, {"int", "string"})
        self.assertEqual(primitive_array.m_Type, "vector")
        self.assertEqual(string.m_Type, "string")


if __name__ == "__main__":
    unittest.main()
