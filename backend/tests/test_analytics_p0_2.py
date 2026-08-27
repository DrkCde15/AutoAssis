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
from backend.routes.pages import _emit_usage_events


class AnalyticsP02Test(unittest.TestCase):
    def setUp(self):
        self.anon = "aa_p02_" + uuid.uuid4().hex
        self.email = "p02_" + uuid.uuid4().hex[:12] + "@example.com"
        with get_db() as (cur, conn):
            cur.execute("DELETE FROM analytics_events WHERE anonymous_id=%s", (self.anon,))
            cur.execute("DELETE FROM users WHERE email=%s", (self.email,))
        self.user_id = None

    def tearDown(self):
        with get_db() as (cur, conn):
            if self.user_id:
                cur.execute("DELETE FROM analytics_events WHERE user_id=%s", (self.user_id,))
                cur.execute("DELETE FROM users WHERE id=%s", (self.user_id,))
            cur.execute("DELETE FROM analytics_events WHERE anonymous_id=%s", (self.anon,))

    def test_invalid_event_type_rejected(self):
        self.assertFalse(record_analytics_event(""))

    def test_full_funnel_signup_nog_raio_and_association(self):
        # 1) visitante (page_view anônimo)
        self.assertTrue(record_analytics_event("page_view", anonymous_id=self.anon, path="/"))

        # 2) simula cadastro: cria usuário vinculando anonymous_id + atribuição
        with get_db() as (cur, conn):
            cur.execute(
                "INSERT INTO users (nome, email, password, anonymous_id, utm_source, initial_referrer) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                ("Teste P02", self.email, "hash", self.anon, "google", "https://referrer.test/"),
            )
            self.user_id = cur.lastrowid
            # backfill: anonymous_id -> user_id (associa eventos pré-cadastro)
            cur.execute(
                "UPDATE analytics_events SET user_id=%s WHERE anonymous_id=%s AND user_id IS NULL",
                (self.user_id, self.anon),
            )

        # 3) associação anonymous -> user funciona (join no relatório/funil)
        self.assertTrue(has_prior_event("page_view", user_id=self.user_id))

        # 4) evento signup (cadastro concluído)
        self.assertTrue(
            record_analytics_event(
                "signup",
                user_id=self.user_id,
                anonymous_id=self.anon,
                path="/api/cadastro",
                metadata={
                    "utm_source": "google",
                    "utm_medium": "cpc",
                    "referrer": "https://referrer.test/",
                    "email": "must_be_stripped@example.com",  # chave bloqueada
                },
            )
        )

        # 5) NOG usado 2x -> primeiro apenas uma vez
        _emit_usage_events(user_id=self.user_id, anonymous_id=None, is_raio=False)
        _emit_usage_events(user_id=self.user_id, anonymous_id=None, is_raio=False)

        # 6) Raio-X usado 1x
        _emit_usage_events(user_id=self.user_id, anonymous_id=None, is_raio=True)

        with get_db() as (cur, conn):
            # 2 usos de texto + 1 Raio-X => 3 nog_use (Raio-X também é uso do NOG)
            cur.execute("SELECT COUNT(*) c FROM analytics_events WHERE user_id=%s AND event_type='nog_use'", (self.user_id,))
            self.assertEqual(cur.fetchone()["c"], 3)
            cur.execute("SELECT COUNT(*) c FROM analytics_events WHERE user_id=%s AND event_type='first_nog_use'", (self.user_id,))
            self.assertEqual(cur.fetchone()["c"], 1)
            cur.execute("SELECT COUNT(*) c FROM analytics_events WHERE user_id=%s AND event_type='raio_x_use'", (self.user_id,))
            self.assertEqual(cur.fetchone()["c"], 1)
            cur.execute("SELECT COUNT(*) c FROM analytics_events WHERE user_id=%s AND event_type='first_raio_x'", (self.user_id,))
            self.assertEqual(cur.fetchone()["c"], 1)

            # metadados do signup: utm preservado, PII (email) bloqueado
            cur.execute("SELECT metadata FROM analytics_events WHERE user_id=%s AND event_type='signup' LIMIT 1", (self.user_id,))
            meta = cur.fetchone()["metadata"] or "{}"
            self.assertIn("utm_source", meta)
            self.assertNotIn("email", meta)

        # 7) nova chamada não deve duplicar first_*
        _emit_usage_events(user_id=self.user_id, anonymous_id=None, is_raio=False)
        _emit_usage_events(user_id=self.user_id, anonymous_id=None, is_raio=True)
        with get_db() as (cur, conn):
            cur.execute("SELECT COUNT(*) c FROM analytics_events WHERE user_id=%s AND event_type='first_nog_use'", (self.user_id,))
            self.assertEqual(cur.fetchone()["c"], 1)
            cur.execute("SELECT COUNT(*) c FROM analytics_events WHERE user_id=%s AND event_type='first_raio_x'", (self.user_id,))
            self.assertEqual(cur.fetchone()["c"], 1)

    def test_funnel_report_marks_not_instrumented(self):
        # garante pelo menos um signup para o relatório ter dados
        with get_db() as (cur, conn):
            cur.execute(
                "INSERT INTO users (nome, email, password) VALUES (%s, %s, %s)",
                ("Funil", self.email, "hash"),
            )
            self.user_id = cur.lastrowid
            cur.execute(
                "INSERT INTO analytics_events (user_id, event_type, path) VALUES (%s, 'signup', '/api/cadastro')",
                (self.user_id,),
            )
            cur.execute(
                "INSERT INTO analytics_events (user_id, event_type, path) VALUES (%s, 'first_nog_use', '/api/chat')",
                (self.user_id,),
            )

        rep = get_funnel_report()
        stages = {s["stage"]: s for s in rep["stages"]}
        self.assertEqual(stages["first_nog_use"]["status"], "instrumented")
        self.assertEqual(stages["first_nog_use"]["unique_persons"], 1)
        # estágios de P0.3 agora instrumentados (podem ser zero sem confundir
        # com ausência de instrumentação)
        self.assertEqual(stages["free_limit_reached"]["status"], "instrumented")
        self.assertEqual(stages["premium_upgrade"]["status"], "instrumented")
        self.assertEqual(stages["premium_churn"]["status"], "instrumented")
        self.assertEqual(stages["free_limit_reached"]["total"], 0)
        self.assertEqual(stages["premium_upgrade"]["total"], 0)
        self.assertEqual(stages["premium_churn"]["total"], 0)
        self.assertTrue(any(s["stage"] == "first_nog_use" and s["conversion_from_previous"] is not None
                            for s in rep["conversion_steps"]))


if __name__ == "__main__":
    unittest.main()
