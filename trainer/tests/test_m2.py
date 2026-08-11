import csv
import io
import json
import sys
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path
from unittest import mock

TRAINER = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TRAINER))
import m2


def messages_for(attributes):
    rows = []
    for index in range(attributes["history_exchanges"] + 1):
        rows.extend(
            [
                {
                    "role": "user",
                    "content": f"user{index % attributes['n_speakers'] + 1}: hello",
                },
                {"role": "assistant", "content": "That's fine."},
            ]
        )
    return rows


class FakeResponse:
    def __init__(self, body):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return self.body


class M2Tests(unittest.TestCase):
    def test_grid_has_locked_quotas_and_coverage(self):
        rows = m2.schedule()
        m2.validate_schedule(rows)
        self.assertEqual(sum(row["adversarial"] for row in rows), 18)
        self.assertEqual(sum(row["warm"] for row in rows), 35)
        self.assertEqual({row["history_exchanges"] for row in rows}, {0, 1, 3, 5})
        self.assertEqual({row["n_speakers"] for row in rows}, {1, 2, 3})

    def test_conversation_requires_alternation_and_discord_username(self):
        attributes = m2.schedule()[0]
        valid = messages_for(attributes)
        self.assertEqual(
            m2.validate_conversation({"messages": valid}, attributes), valid
        )
        invalid = [dict(message) for message in valid]
        invalid[0]["content"] = "_bad_: hello"
        with self.assertRaisesRegex(ValueError, "username"):
            m2.validate_conversation({"messages": invalid}, attributes)
        invalid = [dict(message) for message in valid]
        invalid[1]["role"] = "user"
        with self.assertRaisesRegex(ValueError, "assistant"):
            m2.validate_conversation({"messages": invalid}, attributes)

    def test_malformed_response_is_retried(self):
        attributes = dict(m2.schedule()[0], history_exchanges=0, n_speakers=1)
        valid = json.dumps({"messages": messages_for(attributes)})
        bodies = iter(
            [
                FakeResponse(
                    json.dumps(
                        {"choices": [{"message": {"content": "not json"}}]}
                    ).encode()
                ),
                FakeResponse(
                    json.dumps({"choices": [{"message": {"content": valid}}]}).encode()
                ),
            ]
        )
        result = m2.call_groq(
            attributes,
            [],
            "voice",
            "key",
            opener=lambda *_a, **_k: next(bodies),
            sleeper=lambda _n: None,
        )
        self.assertEqual(result, messages_for(attributes))

    def test_run_resumes_without_repeating_existing_id(self):
        grid = m2.schedule()
        first = {
            "id": grid[0]["id"],
            "model": m2.MODEL,
            "attributes": grid[0],
            "messages": messages_for(grid[0]),
            "violations": [],
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            (output / "pilot.jsonl").write_text(
                json.dumps(first) + "\n", encoding="utf-8"
            )
            called = []

            def fake_call(attributes, *_args, **_kwargs):
                called.append(attributes["id"])
                return messages_for(attributes)

            with (
                mock.patch.dict("os.environ", {"GROQ_API_KEY": "test"}),
                mock.patch.object(m2, "call_groq", fake_call),
                mock.patch("sys.stderr", new=io.StringIO()),
            ):
                m2.run(Namespace(output_dir=output, seed=20260811, attempts=1))
            self.assertNotIn(grid[0]["id"], called)
            self.assertEqual(len(called), 99)
            self.assertEqual(len(m2.load_jsonl(output / "pilot.jsonl")), 100)

    def test_review_summary_counts_mechanical_and_manual_failures(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            pilot = root / "pilot.jsonl"
            with pilot.open("w", encoding="utf-8") as handle:
                for index in range(100):
                    violations = ["ai_disclosure", "self_prefix"] if index == 0 else []
                    handle.write(
                        json.dumps(
                            {
                                "id": f"m2-{index + 1:03d}",
                                "messages": [],
                                "violations": violations,
                            }
                        )
                        + "\n"
                    )
            review = root / "review.csv"
            with review.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.writer(handle)
                writer.writerow(["sample_id", "register_persona_pass", "notes"])
                for index in range(100):
                    writer.writerow(
                        [f"m2-{index + 1:03d}", "false" if index == 0 else "true", ""]
                    )
            result = m2.review_summary(pilot, review)
        self.assertEqual(result["ai_disclosure"], 1)
        self.assertEqual(result["self_prefix"], 1)
        self.assertEqual(result["structural_failures"], 100)
        self.assertEqual(result["manual_register_persona_pass"], 99)
        self.assertEqual(result["manual_register_persona_fail"], 1)


if __name__ == "__main__":
    unittest.main()
