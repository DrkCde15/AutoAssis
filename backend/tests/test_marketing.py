import sys
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import routes.marketing as marketing
from extensions import limiter


def make_app():
    from flask import Flask
    app = Flask(__name__)
    app.config["RATELIMIT_ENABLED"] = False
    try:
        limiter.init_app(app)
    except Exception:
        pass
    app.register_blueprint(marketing.marketing_bp)
    return app


class MarketingWaitlistTest(unittest.TestCase):
    def setUp(self):
        self.app = make_app()
        self.client = self.app.test_client()
        self.cursor = MagicMock()
        self.cursor.lastrowid = 7
        self.conn = MagicMock()
        self.db = MagicMock()
        self.db.__enter__.return_value = (self.cursor, self.conn)
        self.db.__exit__.return_value = False
        self.patcher_db = patch.object(marketing, "get_db", return_value=self.db)
        self.patcher_db.start()
        self.patcher_email = patch.object(marketing, "enviar_email", return_value=True)
        self.patcher_email.start()
        self.patcher_analytics = patch.object(marketing, "record_analytics_event", return_value=True)
        self.patcher_analytics.start()

    def tearDown(self):
        self.patcher_db.stop()
        self.patcher_email.stop()
        self.patcher_analytics.stop()

    def _set_fetchone(self, values):
        self.cursor.fetchone.side_effect = list(values)

    def test_capture_lead_success(self):
        self._set_fetchone([None, None])  # sem usuário, sem lead existente
        r = self.client.post("/api/waitlist", json={"nome": "Ana", "email": "ana@teste.com"})
        self.assertEqual(r.status_code, 201)
        data = r.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(self.cursor.execute.call_count, 3)  # users + leads + INSERT
        self.assertTrue(marketing.record_analytics_event.called)

    def test_capture_lead_invalid_email(self):
        r = self.client.post("/api/waitlist", json={"email": "nao-e-email"})
        self.assertEqual(r.status_code, 400)

    def test_capture_lead_missing_email(self):
        r = self.client.post("/api/waitlist", json={"nome": "Ana"})
        self.assertEqual(r.status_code, 400)

    def test_capture_lead_existing_user(self):
        self._set_fetchone([{"id": 1}])  # e-mail já é de um usuário
        r = self.client.post("/api/waitlist", json={"email": "user@teste.com"})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.get_json().get("already_user"))

    def test_capture_lead_duplicate_idempotent(self):
        self._set_fetchone([None, {"id": 3}])  # sem usuário, mas já é lead
        r = self.client.post("/api/waitlist", json={"email": "lead@teste.com"})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.get_json().get("already_lead"))


if __name__ == "__main__":
    unittest.main()
