"""Testes do CAPTCHA Cloudflare Turnstile - contrato canônico (Spin).

Valida: decorator no-op sem chave, exigência de token válido com chave,
action esperada, hostname no allowlist e fail-closed em rede/HTTP.
"""
import sys
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "backend"))

from flask import Flask, jsonify

from backend.utils.turnstile import (
    turnstile_enabled,
    get_site_key,
    expected_hostnames,
    verify_turnstile,
    turnstile_required,
)

HOSTNAMES = {"autoassist-l9lr.onrender.com"}
ACTION = "signup"


def make_app():
    app = Flask(__name__)

    @app.route("/protegida", methods=["POST"])
    @turnstile_required(action=ACTION)
    def protegida():
        return jsonify(ok=True), 200

    return app


def _env_getter(secret="", site_key="", hostnames="autoassist-l9lr.onrender.com"):
    def getenv(key, default=None):
        values = {
            "TURNSTILE_SECRET_KEY": secret,
            "TURNSTILE_SITE_KEY": site_key,
            "TURNSTILE_HOSTNAMES": hostnames,
        }
        return values.get(key, default or "")

    return getenv


class TurnstileEnabledTest(unittest.TestCase):
    @patch("backend.utils.turnstile.os.getenv")
    def test_enabled_com_chave(self, mock_getenv):
        mock_getenv.side_effect = _env_getter(secret="segredo")
        self.assertTrue(turnstile_enabled())

    @patch("backend.utils.turnstile.os.getenv")
    def test_disabled_sem_chave(self, mock_getenv):
        mock_getenv.side_effect = _env_getter(secret="")
        self.assertFalse(turnstile_enabled())

    @patch("backend.utils.turnstile.os.getenv")
    def test_site_key(self, mock_getenv):
        mock_getenv.side_effect = _env_getter(site_key="sitekey")
        self.assertEqual(get_site_key(), "sitekey")

    @patch("backend.utils.turnstile.os.getenv")
    def test_hostnames_parsed(self, mock_getenv):
        mock_getenv.side_effect = _env_getter(hostnames="a.com, b.com , c.com")
        self.assertEqual(expected_hostnames(), {"a.com", "b.com", "c.com"})


class VerifyTurnstileTest(unittest.TestCase):
    def _siteverify_ok(self, **overrides):
        base = {"success": True, "action": ACTION, "hostname": "autoassist-l9lr.onrender.com"}
        base.update(overrides)
        return MagicMock(status_code=200, json=lambda: base)

    def test_success(self):
        with patch("backend.utils.turnstile.requests.post", return_value=self._siteverify_ok()) as mock_post:
            self.assertTrue(verify_turnstile("segredo", "token", ACTION, HOSTNAMES, "1.2.3.4"))
            args, kwargs = mock_post.call_args
            self.assertEqual(kwargs["data"]["secret"], "segredo")
            self.assertEqual(kwargs["data"]["response"], "token")
            self.assertEqual(kwargs["data"]["remoteip"], "1.2.3.4")

    def test_action_diferente_rejeitado(self):
        with patch("backend.utils.turnstile.requests.post",
                   return_value=self._siteverify_ok(action="outra-coisa")):
            self.assertFalse(verify_turnstile("segredo", "token", ACTION, HOSTNAMES))

    def test_hostname_fora_do_allowlist_rejeitado(self):
        with patch("backend.utils.turnstile.requests.post",
                   return_value=self._siteverify_ok(hostname="evil.com")):
            self.assertFalse(verify_turnstile("segredo", "token", ACTION, HOSTNAMES))

    def test_success_false_rejeitado(self):
        with patch("backend.utils.turnstile.requests.post",
                   return_value=self._siteverify_ok(success=False)):
            self.assertFalse(verify_turnstile("segredo", "token", ACTION, HOSTNAMES))

    def test_http_error_rejeitado(self):
        mock = MagicMock(status_code=500)
        with patch("backend.utils.turnstile.requests.post", return_value=mock):
            self.assertFalse(verify_turnstile("segredo", "token", ACTION, HOSTNAMES))

    def test_network_error_fail_closed(self):
        with patch("backend.utils.turnstile.requests.post", side_effect=Exception("timeout")):
            self.assertFalse(verify_turnstile("segredo", "token", ACTION, HOSTNAMES))

    def test_token_vazio_ou_grande_rejeitado(self):
        with patch("backend.utils.turnstile.requests.post") as mock_post:
            self.assertFalse(verify_turnstile("segredo", "", ACTION, HOSTNAMES))
            self.assertFalse(verify_turnstile("segredo", "x" * 2049, ACTION, HOSTNAMES))
            mock_post.assert_not_called()

    def test_sem_hostnames_rejeitado(self):
        with patch("backend.utils.turnstile.requests.post") as mock_post:
            self.assertFalse(verify_turnstile("segredo", "token", ACTION, set()))
            mock_post.assert_not_called()


class TurnstileRequiredDecoratorTest(unittest.TestCase):
    def setUp(self):
        self.app = make_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    @patch("backend.utils.turnstile.os.getenv")
    def test_noop_sem_chave(self, mock_getenv):
        mock_getenv.side_effect = _env_getter(secret="")
        resp = self.client.post("/protegida", json={"email": "x@x.com"})
        self.assertEqual(resp.status_code, 200)

    @patch("backend.utils.turnstile.os.getenv")
    def test_token_ausente_rejeitado(self, mock_getenv):
        mock_getenv.side_effect = _env_getter(secret="segredo")
        resp = self.client.post("/protegida", json={"email": "x@x.com"})
        self.assertEqual(resp.status_code, 403)

    @patch("backend.utils.turnstile.os.getenv")
    def test_token_invalido_rejeitado(self, mock_getenv):
        mock_getenv.side_effect = _env_getter(secret="segredo")
        with patch("backend.utils.turnstile.requests.post",
                   return_value=MagicMock(status_code=200, json=lambda: {"success": False})):
            resp = self.client.post("/protegida", json={"email": "x@x.com", "turnstile_token": "bad"})
        self.assertEqual(resp.status_code, 403)

    @patch("backend.utils.turnstile.os.getenv")
    def test_token_valido_aceito(self, mock_getenv):
        mock_getenv.side_effect = _env_getter(secret="segredo")
        ok_payload = {"success": True, "action": ACTION, "hostname": "autoassist-l9lr.onrender.com"}
        with patch("backend.utils.turnstile.requests.post",
                   return_value=MagicMock(status_code=200, json=lambda: ok_payload)):
            resp = self.client.post("/protegida", json={"email": "x@x.com", "turnstile_token": "good"})
        self.assertEqual(resp.status_code, 200)


class ConfigPublicEndpointTest(unittest.TestCase):
    def setUp(self):
        from backend.routes.config import config_bp

        self.app = Flask(__name__)
        self.app.config["TESTING"] = True
        self.app.register_blueprint(config_bp)
        self.client = self.app.test_client()

    @patch("backend.utils.turnstile.os.getenv")
    def test_sem_chave_retorna_null(self, mock_getenv):
        mock_getenv.side_effect = _env_getter(secret="")
        resp = self.client.get("/api/config/public")
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.get_json()["turnstile_site_key"])

    @patch("backend.utils.turnstile.os.getenv")
    def test_com_chave_retorna_sitekey(self, mock_getenv):
        mock_getenv.side_effect = _env_getter(secret="segredo", site_key="chave-publica")
        resp = self.client.get("/api/config/public")
        self.assertEqual(resp.get_json()["turnstile_site_key"], "chave-publica")


if __name__ == "__main__":
    unittest.main()