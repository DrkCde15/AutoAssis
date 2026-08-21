import sys
import os
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "backend"))

os.environ["REDIS_URL"] = "memory://"

from backend.routes import pages

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

APP = Flask(__name__)
APP.config["JWT_SECRET_KEY"] = "test-secret"
APP.config["SECRET_KEY"] = "test-secret"
JWTManager(APP)
APP.add_url_rule(
    "/api/veiculos/<int:v_id>/modificacoes",
    view_func=pages.set_veiculo_modificacoes,
    methods=["POST"],
)
APP.add_url_rule(
    "/api/onboarding/revisao",
    view_func=pages.onboarding_sugestao_revisao,
    methods=["POST"],
)
with APP.app_context():
    TOKEN = create_access_token(identity="7")
CLIENT = APP.test_client()


class ModPassportTest(unittest.TestCase):
    # ─────────────── parsing / calc (pure) ───────────────

    def test_parse_fipe_valor(self):
        self.assertEqual(pages._parse_fipe_valor("R$ 45.000,00"), 45000.0)
        self.assertEqual(pages._parse_fipe_valor("R$ 1.234.567,89"), 1234567.89)
        self.assertEqual(pages._parse_fipe_valor(None), 0.0)
        self.assertEqual(pages._parse_fipe_valor(50000), 50000.0)

    def test_calcular_fipe_ajustada_turbo(self):
        val, pct, extra = pages.calcular_fipe_ajustada("R$ 100.000,00", [{"categoria": "turbo"}])
        self.assertEqual(pct, 0.05)
        self.assertEqual(extra, 0.0)
        self.assertEqual(val, "R$ 105.000,00")

    def test_calcular_fipe_ajustada_with_absolute_value(self):
        val, pct, extra = pages.calcular_fipe_ajustada(
            "R$ 50.000,00", [{"categoria": "motor", "valor": 5000}]
        )
        self.assertAlmostEqual(extra, 5000.0)
        self.assertEqual(val, "R$ 57.000,00")

    def test_calcular_fipe_ajustada_multiple(self):
        val, pct, extra = pages.calcular_fipe_ajustada(
            "R$ 100.000,00",
            [{"categoria": "turbo"}, {"categoria": "suspensao"}, {"categoria": "desconhecido"}],
        )
        self.assertAlmostEqual(pct, 0.08)
        self.assertEqual(val, "R$ 108.000,00")

    def test_calcular_fipe_ajustada_none_base(self):
        val, pct, extra = pages.calcular_fipe_ajustada(None, [{"categoria": "turbo"}])
        self.assertEqual(val, "R$ 0,00")

    def test_calcular_fipe_ajustada_capped(self):
        mods = [{"categoria": "turbo"}] * 10
        val, pct, extra = pages.calcular_fipe_ajustada("R$ 100.000,00", mods)
        self.assertEqual(pct, 0.12)
        self.assertEqual(val, "R$ 112.000,00")


class ModPassportRouteTest(unittest.TestCase):
    def setUp(self):
        self.mock_get_db = patch("backend.routes.pages.get_db").start()
        self.cur = MagicMock()
        self.conn = MagicMock()
        self.mock_get_db.return_value.__enter__.return_value = (self.cur, self.conn)
        self.addCleanup(patch.stopall)

    def test_set_veiculo_modificacoes(self):
        self.cur.fetchone.side_effect = [
            {"is_premium": 1, "premium_expires_at": None},
            {"fipe_valor": "R$ 100.000,00"},
        ]
        with patch("backend.routes.pages._invalidate_dashboard_cache_for_user") as inv:
            resp = CLIENT.post(
                "/api/veiculos/5/modificacoes",
                json={"modificacoes": [{"categoria": "turbo", "nome": "Turbo"}]},
                headers={"Authorization": f"Bearer {TOKEN}"},
            )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["fipe_base"], "R$ 100.000,00")
        self.assertEqual(data["fipe_ajustada"], "R$ 105.000,00")
        inv.assert_called_once_with("7")
        self.assertTrue(
            any("UPDATE veiculos SET modificacoes" in str(c) for c in self.cur.execute.call_args_list)
        )

    def test_rejects_non_premium(self):
        self.cur.fetchone.side_effect = [{"is_premium": 0, "premium_expires_at": None}]
        resp = CLIENT.post(
            "/api/veiculos/5/modificacoes",
            json={"modificacoes": [{"categoria": "turbo"}]},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_rejects_non_list(self):
        resp = CLIENT.post(
            "/api/veiculos/5/modificacoes",
            json={"modificacoes": "x"},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
        self.assertEqual(resp.status_code, 400)


class OnboardingIATest(unittest.TestCase):
    def test_sugerir_revisao_builds_prompt_and_caches(self):
        with patch("services.nogai._generate_content_with_fallback") as mock_gen, patch(
            "utils.cache.cache_get_json", return_value=None
        ), patch("utils.cache.cache_set_json") as mock_set:
            mock_gen.return_value = MagicMock(text="Troca de oleo.\nAlinhamento.")
            texto = pages._sugerir_revisao("Fiat", "Uno", 2020, 50000)
        contents = mock_gen.call_args.kwargs.get("contents", "")
        self.assertIn("Fiat", contents)
        self.assertIn("Uno", contents)
        self.assertIn("2020", contents)
        self.assertIn("50000", contents)
        mock_set.assert_called_once()
        self.assertEqual(texto, "Troca de oleo. Alinhamento.")


class SanitizaOnboardingTest(unittest.TestCase):
    def test_empty_returns_default(self):
        self.assertEqual(pages._sanitizar_sugestao(""), pages._SUGESTAO_PADRAO)

    def test_refusal_returns_default(self):
        self.assertEqual(
            pages._sanitizar_sugestao("Desculpe, mas nao posso ajudar."), pages._SUGESTAO_PADRAO
        )
        self.assertEqual(pages._sanitizar_sugestao("I cannot do that"), pages._SUGESTAO_PADRAO)

    def test_strips_price_and_link(self):
        t = pages._sanitizar_sugestao("Troca de oleo por R$ 350,00 veja http://site.com agora")
        self.assertNotIn("R$", t)
        self.assertNotIn("http", t)
        self.assertIn("Troca de oleo", t)

    def test_truncates_long_text(self):
        t = pages._sanitizar_sugestao("a" * 2000)
        self.assertLessEqual(len(t), 600)
        self.assertNotEqual(t, pages._SUGESTAO_PADRAO)

    def test_keeps_clean_text(self):
        self.assertEqual(
            pages._sanitizar_sugestao("Troca de oleo. Alinhamento."), "Troca de oleo. Alinhamento."
        )


class OnboardingRouteTest(unittest.TestCase):
    def test_returns_suggestion(self):
        with patch("backend.routes.pages._sugerir_revisao", return_value="Troca de oleo."):
            resp = CLIENT.post(
                "/api/onboarding/revisao",
                json={"marca": "Fiat", "modelo": "Uno", "ano_fabricacao": 2020, "quilometragem": 50000},
            )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["sugestao"], "Troca de oleo.")

    def test_requires_marca_modelo(self):
        resp = CLIENT.post("/api/onboarding/revisao", json={"marca": "", "modelo": ""})
        self.assertEqual(resp.status_code, 400)


if __name__ == "__main__":
    unittest.main()
