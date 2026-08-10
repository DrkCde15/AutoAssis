"""Testes do reverse geocoding (utils/geocode.py)."""
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "backend"))

os.environ["REDIS_URL"] = "memory://"

from utils.geocode import reverse_geocode_uf  # noqa: E402


def _resp_json(payload):
    mock = MagicMock()
    mock.raise_for_status.return_value = None
    mock.json.return_value = payload
    return mock


def test_uf_from_iso_code():
    with patch("utils.geocode.requests.get", return_value=_resp_json({
        "address": {"country_code": "br", "ISO3166-2-lvl4": "BR-SP"}
    })), patch("utils.geocode.cache_get_json", return_value=None), \
            patch("utils.geocode.cache_set_json") as mock_set:
        uf = reverse_geocode_uf(-23.55, -46.63)
    assert uf == "SP"
    mock_set.assert_called_once()


def test_uf_from_state_code_fallback():
    with patch("utils.geocode.requests.get", return_value=_resp_json({
        "address": {"country_code": "br", "state_code": "mg"}
    })), patch("utils.geocode.cache_get_json", return_value=None), \
            patch("utils.geocode.cache_set_json"):
        assert reverse_geocode_uf(-19.9, -43.9) == "MG"


def test_outside_brazil_returns_empty():
    with patch("utils.geocode.requests.get", return_value=_resp_json({
        "address": {"country_code": "us", "state": "California"}
    })), patch("utils.geocode.cache_get_json", return_value=None), \
            patch("utils.geocode.cache_set_json"):
        assert reverse_geocode_uf(30, -90) == ""


def test_request_failure_returns_empty():
    with patch("utils.geocode.requests.get", side_effect=Exception("timeout")), \
            patch("utils.geocode.cache_get_json", return_value=None), \
            patch("utils.geocode.cache_set_json"):
        assert reverse_geocode_uf(-23.55, -46.63) == ""


def test_invalid_coords():
    assert reverse_geocode_uf("abc", None) == ""
    assert reverse_geocode_uf(999, 0) == ""
    assert reverse_geocode_uf(None, None) == ""


def test_cache_hit_skips_request():
    with patch("utils.geocode.requests.get") as mock_get, \
            patch("utils.geocode.cache_get_json", return_value="RJ"):
        assert reverse_geocode_uf(-22.9, -43.2) == "RJ"
        mock_get.assert_not_called()


def test_coords_rounded_for_cache_key():
    captured = {}

    def fake_get(*args, **kwargs):
        return _resp_json({"address": {"country_code": "br", "ISO3166-2-lvl4": "BR-SP"}})

    def fake_cache_set(key, value, ttl=None):
        captured["key"] = key

    with patch("utils.geocode.requests.get", side_effect=fake_get), \
            patch("utils.geocode.cache_get_json", return_value=None), \
            patch("utils.geocode.cache_set_json", side_effect=fake_cache_set):
        reverse_geocode_uf(-23.554, -46.634)
    assert captured["key"] == "geocode:uf:-23.55:-46.63"