import csv
import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock


MODULE_PATH = Path(__file__).resolve().parents[1] / "m0.py"
SPEC = importlib.util.spec_from_file_location("natsuki_m0", MODULE_PATH)
assert SPEC and SPEC.loader
M0 = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = M0
SPEC.loader.exec_module(M0)


class PromptTests(unittest.TestCase):
    def test_fixture_has_twenty_valid_production_shaped_prompts(self):
        prompts = M0.load_jsonl(M0.DEFAULT_PROMPTS)
        M0.validate_prompts(prompts)
        self.assertEqual(len(prompts), 20)

    def test_violation_checks(self):
        self.assertIn("ai_disclosure", M0.violations("As an AI language model, I cannot help."))
        self.assertIn("refusal", M0.violations("I can't do that."))
        self.assertIn("self_prefix", M0.violations("Natsuki: Fine, dummy."))
        self.assertIn("special_token", M0.violations("<|im_end|>"))
        self.assertIn("special_token", M0.violations("<|start_of_role|>assistant"))
        self.assertIn("special_token", M0.violations("<|end_of_role|>Fine."))
        self.assertIn("special_token", M0.violations("Fine.<|end_of_text|>"))
        self.assertIn("special_token", M0.violations("<think>\n\n</think>\n\nFine."))
        self.assertIn("special_token", M0.violations("</tool_call> Whatever."))
        self.assertIn("code_fence", M0.violations("```python\npass\n```"))
        self.assertEqual(M0.violations("Fine, dummy. Just don't mess it up!"), [])
        self.assertEqual(
            M0.violations("Why be mean? I'll show you who's annoying... uh, my cupcakes! 😒"),
            [],
        )

    def test_in_character_inability_is_not_a_refusal(self):
        self.assertEqual(M0.violations("Just because I'm short doesn't mean I can't reach it!"), [])

    def test_length_is_measured_in_generated_tokens(self):
        text = "Fine, dummy."
        self.assertIn("too_long", M0.violations(text, M0.MAX_COMPLETION_TOKENS + 1))
        self.assertEqual(M0.violations(text, M0.MAX_COMPLETION_TOKENS), [])
        # Four punchy Discord fragments are short; the retired sentence count called them long.
        self.assertEqual(M0.violations("Ugh. Fine. Whatever, dummy. Just eat it."), [])
        # Unknown token counts skip the check rather than guessing from characters.
        self.assertEqual(M0.violations(text), [])
        self.assertEqual(M0.violations(text, None), [])

    def test_request_flags_author_prefix(self):
        response = mock.MagicMock(status=200)
        response.read.return_value = b'{"choices":[{"message":{"content":"Amy: Fine."}}]}'
        response.__enter__.return_value = response
        prompt = {
            "id": "greeting",
            "category": "ordinary",
            "seed": 1,
            "author": "amy",
            "input": "hey",
        }
        with (
            mock.patch.dict(M0.os.environ, {"CHAT_API_KEY": "secret"}),
            mock.patch.object(M0.urllib.request, "urlopen", return_value=response) as urlopen,
        ):
            result = M0.request_completion("http://example.test", "model", prompt, 1)
        self.assertIn("user_prefix", result["violations"])
        self.assertEqual(urlopen.call_args.args[0].get_header("Authorization"), "Bearer secret")


class EvaluationSummaryTests(unittest.TestCase):
    def write_sniff(self, directory, response, stored):
        path = Path(directory) / "sniff.jsonl"
        row = {
            "model": "granite-q8",
            "response": response,
            "http_status": 200,
            "elapsed_seconds": 1.0,
            "usage": {"completion_tokens": 30},
            "timings": {"prompt_per_second": 500.0, "predicted_per_second": 40.0},
            "violations": stored,
        }
        with path.open("w", encoding="utf-8") as handle:
            for index in range(20):
                handle.write(json.dumps({**row, "prompt_id": f"{index:02d}"}) + "\n")
        return path

    def test_summary_without_scores_reports_the_mechanical_half_only(self):
        with tempfile.TemporaryDirectory() as directory:
            path = self.write_sniff(directory, "Fine, dummy.", [])
            summary = M0.evaluation_summary([path], None, None)
        model = summary["models"]["granite-q8"]
        self.assertEqual(model["hard_rule_failure_prompts"], 0)
        self.assertNotIn("blinded_scores", model)
        self.assertNotIn("stock_skip_gate_passed", model)
        self.assertNotIn("blinded_wins", summary)

    def test_rescore_applies_current_rules_to_archived_rows(self):
        # Archived rows carry the verdicts of the rules in force when they ran: a retired
        # sentence count, and a refusal the narrowed pattern no longer calls one.  Only the
        # row-only checks survive, because the text checker cannot recompute them.
        with tempfile.TemporaryDirectory() as directory:
            path = self.write_sniff(
                directory,
                "Just because I'm short doesn't mean I can't reach it!",
                ["sentence_count", "refusal", "user_prefix"],
            )
            summary = M0.evaluation_summary([path], None, None)
        self.assertEqual(summary["models"]["granite-q8"]["violation_counts"], {"user_prefix": 20})


class VramTests(unittest.TestCase):
    def test_incomplete_window_cannot_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "vram.csv"
            started = datetime(2026, 8, 10, tzinfo=timezone.utc)
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.writer(handle)
                writer.writerow(["timestamp_utc", "memory_total_mib", "memory_used_mib", "memory_free_mib"])
                for index in range(10):
                    writer.writerow([(started + timedelta(seconds=30 * index)).isoformat(), 6144, 1024, 5120])
            summary = M0.vram_summary(path, threshold=4096, interval=30)
            self.assertFalse(summary["complete_24h_window"])
            self.assertFalse(summary["capacity_gate_passed"])


if __name__ == "__main__":
    unittest.main()
