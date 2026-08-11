import sys
import unittest
from collections import Counter
from pathlib import Path

TRAINER = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TRAINER))
import m2_probe


def pair(index):
    return {
        "id": f"gold-{index:04d}",
        "messages": [
            {"role": "user", "content": "amy: hey"},
            {"role": "assistant", "content": "What?"},
        ],
    }


class SystemVariants(unittest.TestCase):
    def test_deterministic(self):
        first = m2_probe.system_variant(m2_probe.SEED, "gold-0001")
        second = m2_probe.system_variant(m2_probe.SEED, "gold-0001")
        self.assertEqual(first, second)

    def test_roughly_quarter_per_class(self):
        classes = {
            name: index
            for index, names in enumerate(m2_probe.VARIANT_CLASSES)
            for name in names
        }
        counts = Counter(
            classes[m2_probe.system_variant(m2_probe.SEED, f"gold-{n:04d}")[0]]
            for n in range(946)
        )
        for share in counts.values():
            self.assertGreater(share / 946, 0.18)
            self.assertLess(share / 946, 0.32)

    def test_full_variant_is_production_prompt(self):
        self.assertEqual(dict(m2_probe.SYSTEM_VARIANTS)["full"], m2_probe.m0.SYSTEM_PROMPT)


class GoldRows(unittest.TestCase):
    def test_prepends_system_unless_none(self):
        for index in range(50):
            row = m2_probe.gold_row(m2_probe.SEED, pair(index))
            roles = [message["role"] for message in row["messages"]]
            if row["system_variant"] == "none":
                self.assertEqual(roles, ["user", "assistant"])
            else:
                self.assertEqual(roles, ["system", "user", "assistant"])


class ReplayFilter(unittest.TestCase):
    def good(self, exchanges=1, content="hello there"):
        rows = []
        for _ in range(exchanges):
            rows.append({"role": "user", "content": content})
            rows.append({"role": "assistant", "content": "sure"})
        return rows

    def test_accepts_alternating_conversation(self):
        self.assertEqual(
            m2_probe.replay_messages(self.good(exchanges=2)), self.good(exchanges=2)
        )

    def test_rejects_system_first(self):
        self.assertIsNone(
            m2_probe.replay_messages(
                [{"role": "system", "content": "x"}, *self.good()]
            )
        )

    def test_rejects_consecutive_user_turns(self):
        broken = self.good(exchanges=2)
        broken[1]["role"] = "user"
        self.assertIsNone(m2_probe.replay_messages(broken))

    def test_rejects_dangling_user_turn(self):
        self.assertIsNone(m2_probe.replay_messages(self.good()[:1]))

    def test_rejects_empty_content(self):
        self.assertIsNone(
            m2_probe.replay_messages(
                [{"role": "user", "content": "  "}, {"role": "assistant", "content": "x"}]
            )
        )

    def test_rejects_over_char_budget(self):
        self.assertIsNone(
            m2_probe.replay_messages(
                self.good(content="x" * (m2_probe.REPLAY_CHAR_BUDGET + 1))
            )
        )

    def test_rejects_token_dense_non_ascii(self):
        self.assertIsNone(
            m2_probe.replay_messages(
                self.good(content="繁" * (m2_probe.REPLAY_NON_ASCII_BUDGET + 1))
            )
        )


class ChatTemplate(unittest.TestCase):
    def test_committed_template_is_production_shaped(self):
        template = m2_probe.CHAT_TEMPLATE.read_text(encoding="utf-8")
        self.assertNotIn("<think>", template)
        self.assertIn("{{- '<|im_start|>assistant\\n' }}", template)


class Split(unittest.TestCase):
    def test_deterministic_and_near_five_percent(self):
        held = sum(
            m2_probe.is_eval(m2_probe.SEED, f"gold-{n:04d}") for n in range(2000)
        )
        self.assertEqual(
            held,
            sum(m2_probe.is_eval(m2_probe.SEED, f"gold-{n:04d}") for n in range(2000)),
        )
        self.assertGreater(held / 2000, 0.02)
        self.assertLess(held / 2000, 0.09)


if __name__ == "__main__":
    unittest.main()
