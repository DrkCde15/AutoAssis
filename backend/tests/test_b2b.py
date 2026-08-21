import sys
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path
import hashlib

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import routes.b2b as b2b
from extensions import limiter


def make_app():
    from flask import Flask
    app = Flask(__name__)
    app.config["RATELIMIT_ENABLED"] = False
    try:
        limiter.init_app(app)
    except Exception:
        pass
    app.register_blueprint(b2b.b2b_bp)
    return app


class B2BTest(unittest.TestCase):
    def setUp(self):
        self.app = make_app()
        self.client = self.app.test_client()
        self.patcher_redis = patch.object(b2b, "get_redis_client", return_value=None)
        self.patcher_redis.start()
        self.cursor = MagicMock()
        self.conn = MagicMock()
        self.db = MagicMock()
        self.db.__enter__.return_value = (self.cursor, self.conn)
        self.db.__exit__.return_value = False
        self.patcher_db = patch.object(b2b, "get_db", return_value=self.db)
        self.patcher_db.start()

    def tearDown(self):
        self.patcher_redis.stop()
        self.patcher_db.stop()

    def _client_row(self, raw_key, **kw):
        row = {
            "id": 1,
            "nome": "Teste",
            "api_key_hash": hashlib.sha256(raw_key.encode()).hexdigest(),
            "is_active": True,
            "rate_limit_per_min": 30,
        }
        row.update(kw)
        return row

    # ─────────────── Criação de chave (admin) ───────────────

    def test_create_key_success(self):
        secret = "supersecret"
        with patch.object(b2b.os, "getenv", return_value=secret):
            r = self.client.post(
                "/api/b2b/keys",
                json={"nome": "Cliente X", "rate_limit_per_min": 10},
                headers={"X-Admin-Secret": secret},
            )
        self.assertEqual(r.status_code, 201)
        data = r.get_json()
        self.assertIn("api_key", data)
        self.assertTrue(data["api_key"].startswith("aa_"))
        # o hash gravado deve ser sha256 da chave retornada
        args = self.cursor.execute.call_args.args
        stored_hash = args[1][1]
        self.assertEqual(stored_hash, hashlib.sha256(data["api_key"].encode()).hexdigest())

    def test_create_key_wrong_secret(self):
        with patch.object(b2b.os, "getenv", return_value="right"):
            r = self.client.post(
                "/api/b2b/keys",
                json={"nome": "X"},
                headers={"X-Admin-Secret": "wrong"},
            )
        self.assertEqual(r.status_code, 403)

    def test_create_key_no_env(self):
        with patch.object(b2b.os, "getenv", return_value=""):
            r = self.client.post(
                "/api/b2b/keys",
                json={"nome": "X"},
                headers={"X-Admin-Secret": "x"},
            )
        self.assertEqual(r.status_code, 500)

    # ─────────────── Diagnóstico por foto ───────────────

    def test_diagnosis_no_key(self):
        r = self.client.post("/api/b2b/diagnosis", json={"image": "abc"})
        self.assertEqual(r.status_code, 401)

    def test_diagnosis_missing_image(self):
        raw = "aa_validkey1234567890"
        self.cursor.fetchone.return_value = self._client_row(raw)
        r = self.client.post("/api/b2b/diagnosis", json={}, headers={"X-API-Key": raw})
        self.assertEqual(r.status_code, 400)

    def test_diagnosis_success(self):
        raw = "aa_validkey1234567890"
        self.cursor.fetchone.return_value = self._client_row(raw)
        with patch.object(b2b, "analisar_imagem", return_value="Laudo gerado com sucesso."):
            r = self.client.post(
                "/api/b2b/diagnosis",
                json={"image": "datahere", "pergunta": "problema?"},
                headers={"X-API-Key": raw},
            )
        self.assertEqual(r.status_code, 200)
        self.assertIn("laudo", r.get_json())

    def test_diagnosis_pdf(self):
        raw = "aa_validkey1234567890"
        self.cursor.fetchone.return_value = self._client_row(raw)
        with patch.object(b2b, "analisar_imagem", return_value="Laudo de teste."):
            r = self.client.post(
                "/api/b2b/diagnosis",
                json={"image": "datahere", "formato": "pdf"},
                headers={"X-API-Key": raw},
            )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.content_type, "application/pdf")
        self.assertTrue(r.data[:4] == b"%PDF")

    # ─────────────── Leads (público) ───────────────

    def test_lead_public_success(self):
        r = self.client.post(
            "/api/b2b/leads",
            json={"nome": "Maria", "email": "maria@x.com", "empresa": "Oficina"},
        )
        self.assertEqual(r.status_code, 201)

    def test_lead_missing_fields(self):
        r = self.client.post("/api/b2b/leads", json={"nome": "Maria"})
        self.assertEqual(r.status_code, 400)

    # ─────────────── Leads (admin) ───────────────

    def test_admin_leads_forbidden(self):
        with patch.object(b2b, "_b2b_admin_user_id", return_value=None):
            r = self.client.get("/api/admin/b2b/leads")
        self.assertEqual(r.status_code, 403)

    def test_admin_leads_ok(self):
        self.cursor.fetchall.return_value = [{"id": 1, "nome": "M", "email": "m@x.com"}]
        with patch.object(b2b, "_b2b_admin_user_id", return_value=1):
            r = self.client.get("/api/admin/b2b/leads")
        self.assertEqual(r.status_code, 200)
        self.assertIn("leads", r.get_json())


if __name__ == "__main__":
    unittest.main()
