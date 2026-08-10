from flask import Blueprint, jsonify

from utils.turnstile import get_site_key, turnstile_enabled

config_bp = Blueprint("config_bp", __name__)


@config_bp.route("/api/config/public", methods=["GET"])
def public_config():
    """Configurações públicas do frontend (sem segredos)."""
    return jsonify({
        "turnstile_site_key": get_site_key() if turnstile_enabled() else None,
    })