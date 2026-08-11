"""
Testes da varredura de eventos automotivos
(services/automotive_events.py + routes/events.py)
"""
import sys
import os
import types
import importlib.util
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "backend"))

os.environ["REDIS_URL"] = "memory://"

from backend.services import automotive_events as svc  # noqa: E402


class BrDatesParserTest(unittest.TestCase):
    def test_same_month_range(self):
        self.assertEqual(
            svc._parse_br_dates("06 a 09 de maio de 2026"),
            ("2026-05-06", "2026-05-09"),
        )

    def test_range_without_de(self):
        self.assertEqual(
            svc._parse_br_dates("19 a 22 agosto 2026"),
            ("2026-08-19", "2026-08-22"),
        )

    def test_cross_month_range(self):
        self.assertEqual(
            svc._parse_br_dates("21 de julho a 1 de agosto de 2026"),
            ("2026-07-21", "2026-08-01"),
        )

    def test_single_date(self):
        self.assertEqual(
            svc._parse_br_dates("7 de maio de 2026"),
            ("2026-05-07", "2026-05-07"),
        )

    def test_month_only(self):
        self.assertEqual(
            svc._parse_br_dates("Novembro de 2026"),
            ("2026-11-01", "2026-11-30"),
        )

    def test_invalid(self):
        self.assertEqual(svc._parse_br_dates("Não temos data"), (None, None))

    def test_ordinal_day(self):
        self.assertEqual(
            svc._parse_br_dates("29 de julho a 1º de agosto de 2026"),
            ("2026-07-29", "2026-08-01"),
        )


class CityUfParserTest(unittest.TestCase):
    def test_city_uf_local(self):
        self.assertEqual(
            svc._extract_city_uf("Curitiba (PR) - Expotrade Pinhais"),
            ("Curitiba", "PR", "Expotrade Pinhais"),
        )

    def test_city_uf_only(self):
        self.assertEqual(
            svc._extract_city_uf("Goiânia (GO) - Centro de Convenções"),
            ("Goiânia", "GO", "Centro de Convenções"),
        )

    def test_city_country(self):
        self.assertEqual(
            svc._extract_city_uf("Fortaleza, Brasil"),
            ("Fortaleza", "CE", ""),
        )

    def test_international(self):
        cidade, uf, _ = svc._extract_city_uf("Frankfurt - Alemanha")
        self.assertEqual(cidade, "Frankfurt")
        self.assertEqual(uf, "INT")


class AutomotiveFilterTest(unittest.TestCase):
    def test_automotive_keywords(self):
        self.assertTrue(svc._is_automotive("AUTOP 2026 - Feira de autopeças"))
        self.assertTrue(svc._is_automotive("Minasparts - Reposição automotiva"))
        self.assertTrue(svc._is_automotive("Salão do Automóvel"))
        self.assertFalse(svc._is_automotive("B2Beauty 2027 - Beleza e estética"))
        self.assertFalse(svc._is_automotive("Plastfair - Plásticos"))


class CategoryClassificationTest(unittest.TestCase):
    def test_feira(self):
        self.assertEqual(svc._classify_category("AUTOP 2026 Feira de autopeças"), "feira")
        self.assertEqual(svc._classify_category("Automecanika - reposição automotiva"), "feira")

    def test_encontro(self):
        self.assertEqual(svc._classify_category("Encontro de Carros Antigos"), "encontro")

    def test_competicao(self):
        self.assertEqual(svc._classify_category("Rally Transbrasil 2026"), "competicao")
        self.assertEqual(svc._classify_category("Etapa do Campeonato de Drift"), "competicao")

    def test_congresso(self):
        self.assertEqual(svc._classify_category("Congresso da Reparação Automotiva"), "congresso")

    def test_exposicao(self):
        self.assertEqual(svc._classify_category("Salão do Automóvel de São Paulo"), "exposicao")

    def test_outros(self):
        self.assertEqual(svc._classify_category("Lançamento de produto"), "outros")

    def test_descricao_complementa_titulo(self):
        self.assertEqual(
            svc._classify_category("Evento Surpresa", "Venha para o encontro de motos"),
            "encontro",
        )


class FilterEventsTest(unittest.TestCase):
    def setUp(self):
        self.events = [
            svc._make_event(titulo="AUTOP 2026", url="https://x/1", data_inicio="2026-08-19",
                            cidade="São Paulo", uf="SP", descricao="Feira de autopeças",
                            fonte="nfeas", fonte_nome="NFeiras"),
            svc._make_event(titulo="Encontro de Carros Antigos", url="https://x/2", data_inicio="2026-10-01",
                            cidade="Curitiba", uf="PR", fonte="google", fonte_nome="Google"),
            svc._make_event(titulo="Congresso da Reparação", url="https://x/3",
                            cidade="Belo Horizonte", uf="MG",
                            fonte="sindirepa", fonte_nome="Sindirepa"),
        ]

    def test_filter_by_uf(self):
        result = svc.filter_events(self.events, uf="SP")
        self.assertEqual([e["titulo"] for e in result], ["AUTOP 2026"])

    def test_filter_by_query(self):
        result = svc.filter_events(self.events, q="encontro")
        self.assertEqual([e["titulo"] for e in result], ["Encontro de Carros Antigos"])
        result = svc.filter_events(self.events, q="curitiba")
        self.assertEqual([e["titulo"] for e in result], ["Encontro de Carros Antigos"])

    def test_filter_by_categoria(self):
        result = svc.filter_events(self.events, categoria="feira")
        self.assertEqual([e["titulo"] for e in result], ["AUTOP 2026"])
        result = svc.filter_events(self.events, categoria="competicao")
        self.assertEqual(result, [])

    def test_filter_by_periodo(self):
        from datetime import date, timedelta

        base = date.today() + timedelta(days=10)
        events = [
            svc._make_event(titulo="Em 10 dias", url="https://y/1", data_inicio=base.isoformat(),
                            fonte="x", fonte_nome="X"),
            svc._make_event(titulo="Atrasado", url="https://y/2", data_inicio=(base - timedelta(days=60)).isoformat(),
                            fonte="x", fonte_nome="X"),
            svc._make_event(titulo="Muito longe", url="https://y/3", data_inicio=(base + timedelta(days=400)).isoformat(),
                            fonte="x", fonte_nome="X"),
        ]
        in30 = svc.filter_events(events, periodo="30")
        self.assertEqual([e["titulo"] for e in in30], ["Em 10 dias"])
        in90 = svc.filter_events(events, periodo="90")
        self.assertEqual([e["titulo"] for e in in90], ["Em 10 dias"])
        all_ = svc.filter_events(events, periodo="todos")
        self.assertEqual(len(all_), 3)

    def test_combined_filters(self):
        result = svc.filter_events(self.events, uf="SP", categoria="feira")
        self.assertEqual([e["titulo"] for e in result], ["AUTOP 2026"])
        result = svc.filter_events(self.events, uf="MG", categoria="feira")
        self.assertEqual(result, [])


class NfeirasScraperTest(unittest.TestCase):
    def test_parses_cards(self):
        html = """
        <html><body>
        <article data-id="68886" class="card card-tradeShow mb-3" data-href="https://www.nfeiras.com/autop/">
            <div class="card-body">
                <a href="https://www.nfeiras.com/autop/" class="text-dark medium font-l mb-1">AUTOP 2026</a>
                <div>
                    <span>De <time itemprop="startDate" class="dtstart" datetime="2026-08-19T00:00:00+00:00">19</time>
                    a <time itemprop="endDate" class="dtend" datetime="2026-08-22T00:00:00+00:00">22 agosto 2026</time></span>
                </div>
                <div class="mb-3">Centro de Eventos do Ceará<br>Fortaleza, Brasil</div>
                <div class="text-muted"><span>Automobilismo</span></div>
            </div>
        </article>
        <article data-id="999" class="card card-tradeShow mb-3">
            <div class="card-body">
                <a href="https://www.nfeiras.com/outra/" class="text-dark">Feira Sem Data</a>
                <div><span>De <time class="dtstart" datetime="2025-01-10T00:00:00+00:00">10</time></span></div>
                <div class="mb-3">São Paulo, Brasil</div>
            </div>
        </article>
        </html>
        """
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.text = html
        with patch("backend.services.automotive_events.requests.get", return_value=mock_resp):
            events = svc._scrape_nfeiras()

        self.assertEqual(len(events), 2)
        ev = events[0]
        self.assertEqual(ev["titulo"], "AUTOP 2026")
        self.assertEqual(ev["data_inicio"], "2026-08-19")
        self.assertEqual(ev["data_fim"], "2026-08-22")
        self.assertEqual(ev["cidade"], "Fortaleza")
        self.assertEqual(ev["uf"], "CE")
        self.assertEqual(ev["url"], "https://www.nfeiras.com/autop/")


class SindirepaScraperTest(unittest.TestCase):
    def test_parses_cards(self):
        html = """
        <html><body>
        <div class="se-grid">
            <div class='se-card'>
                <div>
                    <span class='se-tag nacional'>Nacional</span>
                    <h3>Autopar 2026</h3>
                    <p class='se-desc'>Feira de autopeças e reparação automotiva.</p>
                </div>
                <div>
                    <p class='se-info'><span class='dashicons dashicons-calendar-alt'></span> 06 a 09 de maio de 2026</p>
                    <p class='se-info'><span class='dashicons dashicons-location'></span> Curitiba (PR) - Expotrade Pinhais</p>
                </div>
            </div>
            <div class='se-card'>
                <div><h3>CentroParts 2026</h3><p class='se-desc'>Reposição automotiva.</p></div>
                <div>
                    <p class='se-info'><span class='dashicons dashicons-calendar-alt'></span> 29 de julho a 1 de agosto de 2026</p>
                    <p class='se-info'><span class='dashicons dashicons-location'></span> Goiânia (GO) - Centro de Convenções</p>
                </div>
            </div>
        </div>
        </body></html>
        """
        mock = MagicMock()
        mock.raise_for_status.return_value = None
        mock.text = html
        with patch("backend.services.automotive_events.requests.get", return_value=mock):
            events = svc._scrape_sindirepa()

        self.assertEqual(len(events), 2)
        ev = events[0]
        self.assertEqual(ev["titulo"], "Autopar 2026")
        self.assertEqual(ev["data_inicio"], "2026-05-06")
        self.assertEqual(ev["data_fim"], "2026-05-09")
        self.assertEqual(ev["cidade"], "Curitiba")
        self.assertEqual(ev["uf"], "PR")

        self.assertEqual(events[1]["data_inicio"], "2026-07-29")
        self.assertEqual(events[1]["data_fim"], "2026-08-01")


class DiretrizScraperTest(unittest.TestCase):
    def test_parses_automotive_only(self):
        html = """
        <html><body>
        <div class="e-con-inner">
            <div class="e-con e-child">
                <div class="elementor-widget-container">
                    <h2 class="elementor-heading-title elementor-size-default">Minasparts 2026</h2>
                </div>
                <div class="elementor-widget-text-editor">
                    <div class="elementor-widget-container">
                        <h6><strong>Belo Horizonte / MG</strong></h6>
                        <p>icone 30 de Set a 03 de Out | 2026<br/>icone Expominas Belo Horizonte</p>
                    </div>
                </div>
                <div class="elementor-widget-container">
                    <a class="elementor-button elementor-button-link" href="https://feiraminasparts.com.br/" target="_blank">Visitar</a>
                </div>
            </div>
            <div class="e-con e-child">
                <h2 class="elementor-heading-title elementor-size-default">B2Beauty 2027</h2>
                <div class="elementor-widget-text-editor">
                    <p>21 a 23 de Março | 2027 Expotrade</p>
                </div>
            </div>
        </div>
        </body></html>
        """
        mock = MagicMock()
        mock.raise_for_status.return_value = None
        mock.text = html
        with patch("backend.services.automotive_events.requests.get", return_value=mock):
            events = svc._scrape_diretriz()

        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["titulo"], "Minasparts 2026")
        self.assertEqual(ev["data_inicio"], "2026-09-30")
        self.assertEqual(ev["data_fim"], "2026-10-03")
        self.assertEqual(ev["cidade"], "Belo Horizonte")
        self.assertEqual(ev["uf"], "MG")
        self.assertEqual(ev["url"], "https://feiraminasparts.com.br/")


class InterlagosScraperTest(unittest.TestCase):
    def test_filters_non_automotive(self):
        html = """
        <html><body>
        <div id="carousel-noticias" class="carousel">
            <div class="thumbnail">
                <a href="https://www.interlagos.com.br/blog/salao-do-automovel/">
                    <h4>SALÃO DO AUTOMÓVEL - DESTAQUE</h4>
                    <div class="caption"><h4>SALÃO DO AUTOMÓVEL - DESTAQUE</h4></div>
                </a>
            </div>
            <div class="thumbnail">
                <a href="https://www.interlagos.com.br/blog/interafeto/">
                    <div class="caption"><h4>ESPAÇO INTERAFETO</h4></div>
                </a>
            </div>
        </div>
        </body></html>
        """
        mock = MagicMock()
        mock.raise_for_status.return_value = None
        mock.text = html
        with patch("backend.services.automotive_events.requests.get", return_value=mock):
            events = svc._scrape_interlagos()

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["titulo"], "SALÃO DO AUTOMÓVEL - DESTAQUE")
        self.assertEqual(events[0]["uf"], "SP")


class GoogleOrganicTest(unittest.TestCase):
    def test_extracts_results(self):
        html = """
        <html><body>
        <div class="g">
            <div class="tF2Cxc">
                <a href="https://www.sympla.com.br/evento/encontro-de-carros-2026/abc"><h3>Encontro de Carros 2026 - Sympla</h3></a>
                <span class="VwiC3b">Bla bla bla 06 a 09 de maio de 2026 dados</span>
                <div style="position:relative"><div class="VwiC3b">blabla</div></div>
            </div>
        </div>
        </body></html>
        """
        soup = __import__("bs4").BeautifulSoup(html, "html.parser")
        results = svc._extract_google_organic(soup)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["titulo"], "Encontro de Carros 2026 - Sympla")
        self.assertIn("sympla.com.br", results[0]["url"])


class ScanTest(unittest.TestCase):
    def test_scan_dedup_and_sort(self):
        def fake_nfeiras():
            return [
                svc._make_event(titulo="AUTOP 2026", url="https://x/1", data_inicio="2026-08-19",
                                data_fim="2026-08-22", fonte="nfeas", fonte_nome="NFeiras"),
            ]

        def fake_sindirepa():
            return [
                svc._make_event(titulo="AUTOP 2026", url="https://x/1", data_inicio="2026-08-19",
                                data_fim="2026-08-22", fonte="sindirepa", fonte_nome="Sindirepa"),
                svc._make_event(titulo="CentroParts 2026", url="https://x/2", data_inicio="2020-01-01",
                                fonte="sindirepa", fonte_nome="Sindirepa"),  # passado
                svc._make_event(titulo="Sem data", url="https://x/3", fonte="google", fonte_nome="Google"),
            ]

        def fake_diretriz():
            return []

        def fake_interlagos():
            return []

        def fake_google():
            return [
                svc._make_event(titulo="Salão do Automóvel 2026", url="https://x/4",
                                data_inicio="2026-10-01", fonte="google", fonte_nome="Google"),
            ]

        with patch.object(svc, "SOURCE_RUNNERS", [
                ("nfeas", "NFeiras", fake_nfeiras),
                ("sindirepa", "Sindirepa", fake_sindirepa),
                ("diretriz", "Diretriz", fake_diretriz),
                ("interlagos", "Interlagos", fake_interlagos),
                ("google", "Google", fake_google),
        ]), \
                patch.object(svc, "cache_get_json", return_value=None), \
                patch.object(svc, "cache_set_json", return_value=None):
            payload = svc.scan_automotive_events(force=True)

        self.assertTrue(payload["success"])
        # AUTOP duplicado (mesmo titulo+url) vira 1; evento passado é removido
        titulos = [e["titulo"] for e in payload["events"]]
        self.assertEqual(len(titulos), 3)
        self.assertIn("AUTOP 2026", titulos)
        self.assertIn("Sem data", titulos)
        self.assertIn("Salão do Automóvel 2026", titulos)
        # eventos com data vêm antes dos sem data
        self.assertEqual(payload["events"][0]["titulo"], "AUTOP 2026")
        self.assertEqual(payload["events"][-1]["titulo"], "Sem data")
        # fontes reportadas
        slugs = {s["slug"] for s in payload["sources"]}
        self.assertEqual(slugs, {"nfeas", "sindirepa", "diretriz", "interlagos", "google"})

    def test_scan_records_source_failure(self):
        def boom():
            raise RuntimeError("site fora do ar")

        with patch.object(svc, "SOURCE_RUNNERS", [
                ("nfeas", "NFeiras", boom),
                ("sindirepa", "Sindirepa", lambda: []),
                ("diretriz", "Diretriz", lambda: []),
                ("interlagos", "Interlagos", lambda: []),
                ("google", "Google", lambda: []),
        ]), \
                patch.object(svc, "cache_get_json", return_value=None), \
                patch.object(svc, "cache_set_json", return_value=None):
            result = svc.scan_automotive_events(force=True)

        self.assertTrue(result["success"])
        nfeas = next(s for s in result["sources"] if s["slug"] == "nfeas")
        self.assertFalse(nfeas["ok"])
        self.assertIn("site fora do ar", nfeas["error"])


class EventNotificationsTest(unittest.TestCase):
    """Testes do fluxo de notificação de novos eventos (routes/events.py)."""

    @classmethod
    def setUpClass(cls):
        cls.ev = _load_events_module()

    @staticmethod
    def _scan_payload(events):
        return {"success": True, "events": events, "sources": []}

    @staticmethod
    def _make(titulo, url, data_inicio=None, uf="SP", cidade="São Paulo"):
        return svc._make_event(
            titulo=titulo, url=url, data_inicio=data_inicio,
            cidade=cidade, uf=uf, fonte="nfeas", fonte_nome="NFeiras",
        )

    def test_key_is_deterministic(self):
        ev = self._make("AUTOP 2026", "https://x/1", "2026-08-19")
        k1 = self.ev._event_notification_key(ev)
        self.assertEqual(
            k1,
            self.ev._event_notification_key(dict(ev, id="qualquer_outro_hash")),
        )

    def test_dry_run_returns_only_new_events(self):
        old = self._make("AUTOP 2026", "https://x/1", "2026-08-19")
        new = self._make("Salão do Automóvel 2026", "https://x/4", "2026-10-01")
        known = [self.ev._event_notification_key(old)]
        with patch.object(self.ev, "scan_automotive_events", return_value=self._scan_payload([old, new])), \
                patch.object(self.ev, "cache_get_json", return_value=known), \
                patch.object(self.ev, "cache_set_json"), \
                patch.object(self.ev, "create_notification") as mock_create:
            result = self.ev.notify_new_automotive_events(dry_run=True)
        self.assertEqual(result["new_count"], 1)
        self.assertEqual(result["new_events"][0]["titulo"], "Salão do Automóvel 2026")
        mock_create.assert_not_called()

    def test_creates_notification_and_push_for_all_users(self):
        new = self._make("Salão do Automóvel 2026", "https://x/4", "2026-10-01")
        cur = MagicMock()
        cur.fetchall.return_value = [{"id": 10, "uf": "SP"}, {"id": 20, "uf": "SP"}]
        fake_db = MagicMock()
        fake_db.__enter__.return_value = (cur, MagicMock())
        with patch.object(self.ev, "scan_automotive_events", return_value=self._scan_payload([new])), \
                patch.object(self.ev, "cache_get_json", return_value=[]), \
                patch.object(self.ev, "get_db", return_value=fake_db), \
                patch.object(self.ev, "cache_set_json") as mock_set:
            self.ev.create_notification = MagicMock(return_value=True)
            self.ev.send_push_notification = MagicMock(return_value=True)
            result = self.ev.notify_new_automotive_events()

        self.assertEqual(result["new_count"], 1)
        self.assertEqual(result["users_count"], 2)
        self.assertEqual(result["notified_rows"], 2)
        self.assertEqual(self.ev.create_notification.call_count, 2)
        kwargs = self.ev.create_notification.call_args.kwargs
        self.assertEqual(kwargs["user_id"], 20)
        self.assertEqual(kwargs["type"], "info")
        self.assertEqual(kwargs["action_url"], "/maps.html")
        self.assertIn("Salão do Automóvel 2026", kwargs["title"])
        self.assertEqual(self.ev.send_push_notification.call_count, 2)
        mock_set.assert_called_once()

    def test_no_new_events_skips_db_and_notification(self):
        ev = self._make("AUTOP 2026", "https://x/1", "2026-08-19")
        known = [self.ev._event_notification_key(ev)]
        with patch.object(self.ev, "scan_automotive_events", return_value=self._scan_payload([ev])), \
                patch.object(self.ev, "cache_get_json", return_value=known), \
                patch.object(self.ev, "get_db") as mock_db, \
                patch.object(self.ev, "create_notification") as mock_create:
            result = self.ev.notify_new_automotive_events()
        self.assertEqual(result["new_count"], 0)
        mock_db.assert_not_called()
        mock_create.assert_not_called()

    def test_past_events_are_ignored(self):
        past = self._make("AUTOP 2020", "https://x/1", "2020-01-01")
        with patch.object(self.ev, "scan_automotive_events", return_value=self._scan_payload([past])), \
                patch.object(self.ev, "cache_get_json", return_value=[]):
            result = self.ev.notify_new_automotive_events(dry_run=True)
        self.assertEqual(result["new_count"], 0)

    def test_regional_filtering_by_user_uf(self):
        ev_sp = self._make("AUTOP 2026", "https://x/1", "2026-08-19", uf="SP")
        ev_mg = self._make("Minasparts 2026", "https://x/2", "2026-09-30", uf="MG")
        cur = MagicMock()
        cur.fetchall.return_value = [{"id": 10, "uf": "SP"}, {"id": 20, "uf": "MG"}]
        fake_db = MagicMock()
        fake_db.__enter__.return_value = (cur, MagicMock())
        with patch.object(self.ev, "scan_automotive_events", return_value=self._scan_payload([ev_sp, ev_mg])), \
                patch.object(self.ev, "cache_get_json", return_value=[]), \
                patch.object(self.ev, "get_db", return_value=fake_db), \
                patch.object(self.ev, "cache_set_json"):
            self.ev.create_notification = MagicMock(return_value=True)
            self.ev.send_push_notification = MagicMock(return_value=True)
            result = self.ev.notify_new_automotive_events()

        self.assertEqual(result["new_count"], 2)
        self.assertEqual(result["users_count"], 2)
        self.assertEqual(result["notified_rows"], 2)
        self.assertEqual(self.ev.create_notification.call_count, 2)
        titles_by_user = {}
        for call in self.ev.create_notification.call_args_list:
            titles_by_user.setdefault(call.kwargs["user_id"], []).append(call.kwargs["title"])
        self.assertIn("AUTOP 2026", titles_by_user[10][0])
        self.assertNotIn("Minasparts", titles_by_user[10][0])
        self.assertIn("Minasparts 2026", titles_by_user[20][0])
        self.assertNotIn("AUTOP", titles_by_user[20][0])

    def test_user_without_uf_receives_only_generic(self):
        ev_regional = self._make("AUTOP 2026", "https://x/1", "2026-08-19", uf="SP")
        ev_generic = self._make("Salão do Automóvel", "https://x/3", "2026-10-01", uf="", cidade="")
        cur = MagicMock()
        cur.fetchall.return_value = [{"id": 10, "uf": "SP"}, {"id": 20, "uf": None}]
        fake_db = MagicMock()
        fake_db.__enter__.return_value = (cur, MagicMock())
        with patch.object(self.ev, "scan_automotive_events", return_value=self._scan_payload([ev_regional, ev_generic])), \
                patch.object(self.ev, "cache_get_json", return_value=[]), \
                patch.object(self.ev, "get_db", return_value=fake_db), \
                patch.object(self.ev, "cache_set_json") as mock_set:
            self.ev.create_notification = MagicMock(return_value=True)
            self.ev.send_push_notification = MagicMock(return_value=True)
            result = self.ev.notify_new_automotive_events()

        self.assertEqual(result["new_count"], 2)
        self.assertEqual(result["users_count"], 2)
        self.assertEqual(result["notified_rows"], 3)
        titles_by_user = {}
        for call in self.ev.create_notification.call_args_list:
            titles_by_user.setdefault(call.kwargs["user_id"], []).append(call.kwargs["title"])
        self.assertEqual(len(titles_by_user[10]), 2)   # regional + genérico
        self.assertEqual(len(titles_by_user[20]), 1)   # só o genérico
        self.assertIn("Salão do Automóvel", titles_by_user[20][0])
        mock_set.assert_called_once()


class EventsHtmlPageTest(unittest.TestCase):
    """Testes da página pública estática frontend/public/eventos.html.

    A página foi convertida de render server-side (/eventos) para um HTML
    estático com nav autenticada/visitante e responsividade (padrão do site);
    os cards são preenchidos no cliente via GET /api/events/automotive.
    """

    FRONTEND = BACKEND_DIR / "frontend" / "public"
    PAGE = FRONTEND / "eventos.html"

    def setUp(self):
        self.assertTrue(self.PAGE.exists(), "eventos.html nao encontrado")
        self.html = self.PAGE.read_text(encoding="utf-8")

    def test_arquivo_existe_e_eh_servido_como_static(self):
        # Flask serve frontend/public como static_folder (app.py:35),
        # entao /eventos.html e acessivel sem rota propria no backend.
        self.assertIn('<meta charset="UTF-8" />', self.html)

    def test_meta_seo_presentes(self):
        self.assertIn("Eventos Automotivos no Brasil", self.html)
        self.assertIn('rel="canonical"', self.html)
        self.assertIn("og:title", self.html)
        self.assertIn("og:description", self.html)

    def test_navbar_visitante_e_logado(self):
        # Estado visitante (padrao): Chat/Entrar/Criar Conta.
        self.assertIn('id="authLinks"', self.html)
        self.assertIn('href="cadastro.html"', self.html)
        self.assertIn('href="login.html"', self.html)
        # Troca para estado logado via JS (Dashboard/Anotações/Biblioteca/Mapa/
        # Perfil/Sair + sino de notificações).
        self.assertIn('Auth.isAuthenticated()', self.html)
        self.assertIn('href="dashboard.html"', self.html)
        self.assertIn('href="perfil.html"', self.html)
        self.assertIn('id="btnLogout"', self.html)
        self.assertIn('Notifications.init()', self.html)

    def test_responsividade(self):
        # Drawer/hamburguer compartilhado + media query da grade.
        self.assertIn("static/js/responsive.js", self.html)
        self.assertIn("@media (max-width: 760px)", self.html)
        self.assertIn("grid-template-columns: 1fr", self.html)

    def test_filtro_por_uf(self):
        # Caixa de selecao por UF (mesmo componente AppSelect do maps.html).
        self.assertIn('id="eventsUfSelect"', self.html)
        self.assertIn('class="app-select small-select"', self.html)
        self.assertIn("static/css/app-select.css", self.html)
        self.assertIn("static/js/app-select.js", self.html)
        self.assertIn("AppSelect.mount", self.html)
        self.assertIn("'Fora do Brasil'", self.html)   # INT
        self.assertIn("const BR_UFS", self.html)
        self.assertIn("'SP'", self.html)
        self.assertIn("api.onChange", self.html)

    def test_dados_vem_da_api_no_cliente(self):
        # Sem JSON-LD server-side: a pagina consome /api/events/automotive.
        self.assertNotIn("application/ld+json", self.html)
        self.assertIn("/api/events/automotive", self.html)
        self.assertIn("CONFIG.API_URL", self.html)
        # Renderizacao escapa o conteudo (anti-XSS).
        self.assertIn("SecurityUtils.escapeHTML", self.html)

    def test_footer_linka_eventos_html(self):
        self.assertIn('<a href="eventos.html" class="footer-link">Eventos</a>', self.html)


def _load_events_module():
    """Carrega routes/events.py isolado, com stubs para os módulos irmãos
    que puxariam dependências pesadas (DB, JWT, push)."""
    backend_root = str(BACKEND_DIR / "backend")

    routes_pkg = types.ModuleType("routes")
    routes_pkg.__path__ = [backend_root]
    sys.modules["routes"] = routes_pkg

    db_stub = types.ModuleType("routes.database")
    db_stub.get_db = MagicMock()
    sys.modules["routes.database"] = db_stub

    notif_stub = types.ModuleType("routes.notifications")
    notif_stub.create_notification = MagicMock(return_value=True)
    sys.modules["routes.notifications"] = notif_stub

    push_stub = types.ModuleType("routes.push")
    push_stub.send_push_notification = MagicMock(return_value=True)
    sys.modules["routes.push"] = push_stub

    cron_stub = types.ModuleType("utils.cron_auth")
    cron_stub.require_cron_secret = lambda header_name="X-Cron-Secret": (lambda f: f)
    sys.modules["utils.cron_auth"] = cron_stub

    spec = importlib.util.spec_from_file_location("routes.events", BACKEND_DIR / "backend" / "routes" / "events.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules["routes.events"] = mod
    spec.loader.exec_module(mod)
    return mod


if __name__ == "__main__":
    unittest.main()