import sys
import unittest
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "backend"))

from backend.routes.database import get_db
from backend.routes.analytics import (
    get_funnel_report,
    analytics_bp,
    _event_attribution,
    _canonical_identity,
)

import flask
from flask_jwt_extended import JWTManager, create_access_token

CONSENT_JS = PROJECT_ROOT / "frontend" / "public" / "static" / "js" / "analytics-consent.js"


def _new_email():
    return "aa_" + uuid.uuid4().hex[:12] + "@example.com"


def _create_user(email, *, is_admin=False, utm_source=None, utm_medium=None, utm_campaign=None):
    with get_db() as (cur, conn):
        cur.execute(
            "INSERT INTO users (nome, email, password, is_premium, is_admin, utm_source, utm_medium, utm_campaign) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            ("AA", email, "hash", False, bool(is_admin), utm_source, utm_medium, utm_campaign),
        )
        return cur.lastrowid


def _cleanup(user_id=None, anonymous_ids=None):
    with get_db() as (cur, conn):
        if user_id:
            cur.execute("DELETE FROM analytics_events WHERE user_id=%s", (user_id,))
            cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
        for aid in (anonymous_ids or []):
            cur.execute("DELETE FROM analytics_events WHERE anonymous_id=%s", (aid,))


class AttributionUnitTest(unittest.TestCase):
    def test_event_attribution_priority(self):
        users_map = {10: {"anonymous_id": "x", "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "g1"}}
        # 1) metadata wins
        ev = {"user_id": 10, "anonymous_id": "x", "metadata": {"utm_source": "instagram", "utm_campaign": "ig1"}}
        self.assertEqual(_event_attribution(ev, ev["metadata"], users_map), ("instagram", "unknown", "ig1"))
        # 2) falls back to users map when no event utm
        ev2 = {"user_id": 10, "anonymous_id": "x", "metadata": {}}
        self.assertEqual(_event_attribution(ev2, {}, users_map), ("google", "cpc", "g1"))
        # 3) unknown when nothing
        ev3 = {"user_id": None, "anonymous_id": "a1", "metadata": {}}
        self.assertEqual(_event_attribution(ev3, {}, {}), ("unknown", "unknown", "unknown"))

    def test_canonical_identity(self):
        users_map = {10: {"anonymous_id": "x"}}
        self.assertEqual(_canonical_identity({"user_id": 10, "anonymous_id": "x"}, users_map), "u:10")
        self.assertEqual(_canonical_identity({"user_id": None, "anonymous_id": "a1"}, users_map), "a:a1")
        self.assertIsNone(_canonical_identity({"user_id": None, "anonymous_id": None}, users_map))

    def test_track_includes_attribution_in_js(self):
        # Validação estática: track() integra getAttribution() no metadata.
        src = CONSENT_JS.read_text(encoding="utf-8")
        self.assertIn("async function track", src)
        # Prova de integração: track() chama getAttribution() e usa em utm_*.
        self.assertIn("const attr = getAttribution()", src)
        for field in ("utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "referrer"):
            self.assertIn("{}: attr.{}".format(field, field), src)


class FunnelBreakdownTest(unittest.TestCase):
    def setUp(self):
        self.anon_ids = []
        self.user_ids = []
        suffix = uuid.uuid4().hex[:8]
        self.camp_ig = "lan_" + suffix
        self.camp_g = "src_" + suffix

    def tearDown(self):
        for aid in self.anon_ids:
            _cleanup(anonymous_ids=[aid])
        for uid in self.user_ids:
            _cleanup(user_id=uid)

    def _mk_user(self, **kwargs):
        uid = _create_user(_new_email(), **kwargs)
        self.user_ids.append(uid)
        return uid

    def _ev(self, et, *, uid=None, anon=None, meta=None):
        from backend.routes.analytics import record_analytics_event
        if anon:
            self.anon_ids.append(anon)
        record_analytics_event(et, user_id=uid, anonymous_id=anon, path="/x", metadata=meta or {})

    def test_attribution_propagation_pageview_to_signup(self):
        # Cenário #10: entra com UTM, page_view, depois signup -> mesma atribuição.
        anon = "prop_" + uuid.uuid4().hex
        self.anon_ids.append(anon)
        meta = {"utm_source": "instagram", "utm_medium": "social", "utm_campaign": "teste"}
        self._ev("page_view", anon=anon, meta=meta)
        self._ev("signup", anon=anon, meta=meta)
        rep = get_funnel_report()
        bucket = next(
            (b for b in rep["acquisition_breakdown"] if b["utm_source"] == "instagram" and b["utm_campaign"] == "teste"),
            None,
        )
        self.assertIsNotNone(bucket, "bucket instagram/teste deve existir")
        self.assertGreaterEqual(bucket["visitors"], 1)
        self.assertGreaterEqual(bucket["signups"], 1)

    def test_multiple_sources_and_breakdown(self):
        # Cenário #11: instagram, google, direct.
        a_ig = "ig_" + uuid.uuid4().hex
        a_g = "g_" + uuid.uuid4().hex
        a_d = "d_" + uuid.uuid4().hex
        u_ig = self._mk_user(utm_source="instagram", utm_campaign=self.camp_ig)
        u_g = self._mk_user(utm_source="google", utm_campaign=self.camp_g)
        u_d = self._mk_user()  # sem utm -> direct/unknown

        self._ev("page_view", anon=a_ig, meta={"utm_source": "instagram", "utm_campaign": self.camp_ig})
        self._ev("signup", uid=u_ig, anon=a_ig, meta={"utm_source": "instagram", "utm_campaign": self.camp_ig})
        self._ev("first_nog_use", uid=u_ig)

        self._ev("page_view", anon=a_g, meta={"utm_source": "google", "utm_campaign": self.camp_g})
        self._ev("signup", uid=u_g, anon=a_g, meta={"utm_source": "google", "utm_campaign": self.camp_g})
        self._ev("first_raio_x", uid=u_g)

        self._ev("page_view", anon=a_d)
        self._ev("signup", uid=u_d, anon=a_d)

        rep = get_funnel_report()
        funnel = rep["funnel"]
        self.assertGreaterEqual(funnel["visitor"], 3)
        self.assertGreaterEqual(funnel["signup"], 3)
        self.assertGreaterEqual(funnel["first_nog_use"], 1)
        self.assertGreaterEqual(funnel["first_raio_x"], 1)

        by_camp = {b["utm_campaign"]: b for b in rep["acquisition_by_campaign"]}
        self.assertIn(self.camp_ig, by_camp)
        self.assertEqual(by_camp[self.camp_ig]["visitors"], 1)
        self.assertEqual(by_camp[self.camp_ig]["signups"], 1)
        self.assertEqual(by_camp[self.camp_ig]["first_nog_use"], 1)
        self.assertIn(self.camp_g, by_camp)
        self.assertEqual(by_camp[self.camp_g]["visitors"], 1)
        self.assertEqual(by_camp[self.camp_g]["first_raio_x"], 1)

        by_src = {b["utm_source"]: b for b in rep["acquisition_by_source"]}
        self.assertIn("instagram", by_src)
        self.assertGreaterEqual(by_src["instagram"]["signups"], 1)
        self.assertGreaterEqual(by_src["instagram"]["first_nog_use"], 1)
        self.assertIn("google", by_src)
        self.assertGreaterEqual(by_src["google"]["signups"], 1)
        self.assertGreaterEqual(by_src["google"]["first_raio_x"], 1)
        self.assertIn("unknown", by_src)
        self.assertGreaterEqual(by_src["unknown"]["visitors"], 1)

    def test_unknown_bucket_for_missing_attribution(self):
        anon = "unk_" + uuid.uuid4().hex
        self._ev("page_view", anon=anon)  # sem utm e usuário sem utm
        rep = get_funnel_report()
        by_src = {b["utm_source"]: b for b in rep["acquisition_by_source"]}
        self.assertIn("unknown", by_src)
        self.assertGreaterEqual(by_src["unknown"]["visitors"], 1)


class AdminEndpointTest(unittest.TestCase):
    def setUp(self):
        self.admin_id = _create_user(_new_email(), is_admin=True)
        self.user_id = _create_user(_new_email(), is_admin=False)
        self.app = flask.Flask(__name__)
        self.app.config["JWT_SECRET_KEY"] = "test-secret-aa"
        self.app.config["JWT_TOKEN_LOCATION"] = ["headers"]
        JWTManager(self.app)
        self.app.register_blueprint(analytics_bp)
        self.client = self.app.test_client()

    def tearDown(self):
        _cleanup(user_id=self.admin_id)
        _cleanup(user_id=self.user_id)

    def _token(self, uid):
        with self.app.app_context():
            return create_access_token(identity=str(uid))

    def test_admin_can_access_funnel(self):
        resp = self.client.get(
            "/api/analytics/funnel",
            headers={"Authorization": "Bearer " + self._token(self.admin_id)},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIn("funnel", data)
        self.assertIn("acquisition_breakdown", data)
        self.assertIn("acquisition_by_source", data)
        self.assertIn("acquisition_by_campaign", data)

    def test_non_admin_forbidden(self):
        resp = self.client.get(
            "/api/analytics/funnel",
            headers={"Authorization": "Bearer " + self._token(self.user_id)},
        )
        self.assertEqual(resp.status_code, 403)

    def test_no_token_unauthorized(self):
        resp = self.client.get("/api/analytics/funnel")
        self.assertEqual(resp.status_code, 401)


if __name__ == "__main__":
    unittest.main()
