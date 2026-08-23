import sys
import unittest
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "backend"))

from backend.routes.database import get_db
from backend.routes.analytics import (
    record_analytics_event,
    has_prior_event,
    get_funnel_report,
)
from backend.routes.pages import _emit_free_limit_reached
from backend.routes.payment import _emit_premium_transition


class AnalyticsP03Test(unittest.TestCase):
    def setUp(self):
        self.email = "p03_" + uuid.uuid4().hex[:12] + "@example.com"
        self.user_id = None
        with get_db() as (cur, conn):
            cur.execute(
                "INSERT INTO users (nome, email, password, is_premium) VALUES (%s, %s, %s, %s)",
                ("P03", self.email, "hash", False),
            )
            self.user_id = cur.lastrowid
            cur.execute("DELETE FROM analytics_events WHERE user_id=%s", (self.user_id,))

    def tearDown(self):
        with get_db() as (cur, conn):
            if self.user_id:
                cur.execute("DELETE FROM analytics_events WHERE user_id=%s", (self.user_id,))
                cur.execute("DELETE FROM users WHERE id=%s", (self.user_id,))

    def test_free_limit_reached_idempotent(self):
        # chamado 2x (retries do front) -> apenas 1 evento por ciclo
        _emit_free_limit_reached(self.user_id, 30)
        _emit_free_limit_reached(self.user_id, 31)
        with get_db() as (cur, conn):
            cur.execute(
                "SELECT COUNT(*) c FROM analytics_events WHERE user_id=%s AND event_type='free_limit_reached'",
                (self.user_id,),
            )
            self.assertEqual(cur.fetchone()["c"], 1)
            cur.execute(
                "SELECT metadata FROM analytics_events WHERE user_id=%s AND event_type='free_limit_reached' LIMIT 1",
                (self.user_id,),
            )
            meta = cur.fetchone()["metadata"] or "{}"
            self.assertIn("limit", meta)

        rep = get_funnel_report()
        stages = {s["stage"]: s for s in rep["stages"]}
        self.assertEqual(stages["free_limit_reached"]["total"], 1)
        self.assertEqual(stages["free_limit_reached"]["unique_persons"], 1)

    def test_premium_transition_emits_upgrade_and_churn(self):
        # upgrade: prior False -> True
        _emit_premium_transition(self.user_id, "completo", became_premium=True, prior_premium=False)
        # churn: prior True -> False
        _emit_premium_transition(self.user_id, "completo", became_premium=False, prior_premium=True)
        # no-op: estado igual -> nada
        _emit_premium_transition(self.user_id, "completo", became_premium=True, prior_premium=True)

        with get_db() as (cur, conn):
            cur.execute("SELECT COUNT(*) c FROM analytics_events WHERE user_id=%s AND event_type='premium_upgrade'", (self.user_id,))
            self.assertEqual(cur.fetchone()["c"], 1)
            cur.execute("SELECT COUNT(*) c FROM analytics_events WHERE user_id=%s AND event_type='premium_churn'", (self.user_id,))
            self.assertEqual(cur.fetchone()["c"], 1)

        rep = get_funnel_report()
        stages = {s["stage"]: s for s in rep["stages"]}
        self.assertEqual(stages["premium_upgrade"]["total"], 1)
        self.assertEqual(stages["premium_churn"]["total"], 1)


if __name__ == "__main__":
    unittest.main()
