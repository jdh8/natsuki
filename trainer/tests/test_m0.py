import csv
import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path


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
