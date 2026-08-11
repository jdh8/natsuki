import csv
import hashlib
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
        seeds = []

        def open_response(request, **_kwargs):
            seeds.append(json.loads(request.data)["seed"])
            return next(bodies)

        result = m2.call_groq(
            attributes,
            [],
            "voice",
            "key",
            opener=open_response,
            sleeper=lambda _n: None,
        )
        self.assertEqual(result, messages_for(attributes))
        self.assertEqual(seeds, [attributes["seed"], attributes["seed"] + 1])

    def test_prompt_scopes_content_attributes_to_the_right_turns(self):
        payload = m2.request_payload(m2.schedule()[0], [], "voice")
        instructions = payload["messages"][1]["content"]
        self.assertEqual(payload["reasoning_effort"], "medium")
        with mock.patch.object(m2, "TEMPERATURE", 0.15):
            self.assertEqual(
                m2.request_payload(m2.schedule()[0], [], "voice")["temperature"],
                0.15,
            )
        for requirement in (
            "final user message clearly enact `intent`",
            "`warm: false` is not a command to be cold or hostile",
            "`reply_shape` only to the final assistant message",
            "Every assistant message must be a target-quality Natsuki reply",
            "must never override `intent`, and must be ignored on adversarial rows",
            "every user message must use a different username",
        ):
            self.assertIn(requirement, instructions)
        for intent, guidance in m2.ADVERSARIAL_GUIDANCE.items():
            attributes = dict(m2.schedule()[0], adversarial=True, intent=intent)
            adversarial = m2.request_payload(attributes, [], "voice")["messages"][1][
                "content"
            ]
            self.assertIn(guidance, adversarial)

    def test_multi_speaker_dm_prompt_has_an_exact_group_speaker_plan(self):
        attributes = m2.schedule()[1]
        instructions = m2.request_payload(attributes, [], "voice")["messages"][1][
            "content"
        ]
        self.assertIn("Treat this as a late-night group DM", instructions)
        self.assertIn('["user1:", "user2:"]', instructions)

    def test_qwen_uses_its_supported_groq_modes(self):
        with (
            mock.patch.object(m2, "MODEL", "qwen/qwen3.6-27b"),
            mock.patch.object(m2, "TEACHER_URL", m2.GROQ_URL),
        ):
            payload = m2.request_payload(m2.schedule()[0], [], "voice")
        self.assertEqual(payload["reasoning_effort"], "none")
        self.assertEqual(payload["response_format"], {"type": "json_object"})
        self.assertIn("JSON object", payload["messages"][1]["content"])
        self.assertIn("exactly two string fields", payload["messages"][1]["content"])

    def test_local_teacher_omits_groq_reasoning_mode(self):
        with mock.patch.object(m2, "TEACHER_URL", "http://localhost/teacher"):
            payload = m2.request_payload(m2.schedule()[0], [], "voice")
        self.assertNotIn("reasoning_effort", payload)
        self.assertEqual(payload["response_format"]["type"], "json_schema")

    def test_run_resumes_without_repeating_existing_id(self):
        grid = m2.schedule()
        recipe_sha256 = hashlib.sha256(
            Path(m2.__file__).read_bytes() + m2.VOICE_CARD.read_bytes()
        ).hexdigest()
        first = {
            "id": grid[0]["id"],
            "model": m2.MODEL,
            "teacher_url": "http://localhost/teacher",
            "temperature": m2.TEMPERATURE,
            "recipe_sha256": recipe_sha256,
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
            keys = []

            def fake_call(attributes, _bans, _voice, api_key, **_kwargs):
                called.append(attributes["id"])
                keys.append(api_key)
                return messages_for(attributes)

            with (
                mock.patch.dict(
                    "os.environ",
                    {"GROQ_API_KEY": "test", "TEACHER_MODEL": m2.MODEL},
                ),
                mock.patch.object(m2, "TEACHER_URL", "http://localhost/teacher"),
                mock.patch.object(m2, "call_groq", fake_call),
                mock.patch("sys.stderr", new=io.StringIO()),
            ):
                m2.run(
                    Namespace(
                        output_dir=output, seed=20260811, attempts=1, limit=2
                    )
                )
            self.assertNotIn(grid[0]["id"], called)
            self.assertEqual(called, [grid[1]["id"]])
            self.assertEqual(set(keys), {"local"})
            self.assertEqual(len(m2.load_jsonl(output / "pilot.jsonl")), 2)

    def test_run_rejects_rows_from_another_teacher_recipe(self):
        attributes = m2.schedule()[0]
        row = {
            "id": attributes["id"],
            "model": m2.MODEL,
            "teacher_url": "http://localhost/teacher",
            "temperature": m2.TEMPERATURE,
            "recipe_sha256": "another-recipe",
            "attributes": attributes,
            "messages": messages_for(attributes),
            "violations": [],
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            (output / "pilot.jsonl").write_text(
                json.dumps(row) + "\n", encoding="utf-8"
            )
            with (
                mock.patch.dict("os.environ", {"TEACHER_MODEL": m2.MODEL}),
                mock.patch.object(m2, "TEACHER_URL", "http://localhost/teacher"),
            ):
                with self.assertRaisesRegex(ValueError, "another teacher recipe"):
                    m2.run(
                        Namespace(
                            output_dir=output, seed=20260811, attempts=1, limit=1
                        )
                    )

    def test_run_rejects_an_invalid_limit(self):
        with self.assertRaisesRegex(ValueError, "limit must be between"):
            m2.run(
                Namespace(output_dir=Path("unused"), seed=20260811, attempts=1, limit=0)
            )

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
