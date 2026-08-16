"""Verificação de CAPTCHA (Cloudflare Turnstile).

Contrato canônico (Turnstile Spin):
- O token chega no corpo/hader e é validado server-side via /siteverify.
- Exige `success === true`, `action` igual ao da superfície protegida e
  `hostname` dentro do allowlist de `TURNSTILE_HOSTNAMES`.
- Fail-closed: sem chave configurada o decorator é no-op (dev/testes);
  com chave configurada, qualquer falha (rede, payload, validação) rejeita.
"""
import os
from functools import wraps

import requests
from flask import jsonify, request

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
TIMEOUT_SECONDS = 5
MAX_TOKEN_LENGTH = 2048


def turnstile_enabled() -> bool:
    return bool(os.getenv("TURNSTILE_SECRET_KEY"))


def get_site_key() -> str:
    return os.getenv("TURNSTILE_SITE_KEY", "")


def expected_hostnames() -> set:
    """Allowlist de hostnames do frontend que podem emitir tokens.

    Em produção NÃO deve incluir localhost/127.0.0.1.
    """
    raw = os.getenv("TURNSTILE_HOSTNAMES", "")
    return {h.strip() for h in raw.split(",") if h.strip()}


def verify_turnstile(
    secret: str,
    token: str,
    expected_action: str,
    hostnames: set,
    remote_ip: str | None = None,
) -> bool:
    """Valida o token no siteverify da Cloudflare (fail-closed)."""
    if not (isinstance(token, str) and 0 < len(token) <= MAX_TOKEN_LENGTH):
        return False
    if not hostnames:
        return False
    payload = {"secret": secret, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip
    try:
        resp = requests.post(VERIFY_URL, data=payload, timeout=TIMEOUT_SECONDS)
        if resp.status_code != 200:
            return False
        result = resp.json()
    except Exception:
        return False
    return (
        result.get("success") is True
        and result.get("action") == expected_action
        and result.get("hostname") in hostnames
    )


def turnstile_required(action: str = "default"):
    """Decorator de rotas: exige token Turnstile válido quando habilitado.

    Uso: `@turnstile_required(action="signup")`

    Testes (só fora de produção): defina TURNSTILE_BYPASS=1 para pular a
    verificação - usado pelos testes de integração do frontend (Playwright).
    Em produção NUNCA setar essa variável (render.yaml não a define).
    """

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not turnstile_enabled():
                return f(*args, **kwargs)
            if os.getenv("FLASK_ENV") != "production" and os.getenv(
                "TURNSTILE_BYPASS", "0"
            ).strip().lower() in {"1", "true", "yes", "on"}:
                return f(*args, **kwargs)
            secret = os.getenv("TURNSTILE_SECRET_KEY", "")
            token = (
                (request.get_json(silent=True) or {}).get("turnstile_token")
                or request.form.get("cf-turnstile-response")
                or request.headers.get("X-Turnstile-Token", "")
            )
            if not token:
                return jsonify(error="Verificação de segurança pendente. Tente novamente."), 403
            if not verify_turnstile(secret, token, action, expected_hostnames(), request.remote_addr):
                return jsonify(error="Falha na verificação de segurança. Tente novamente."), 403
            return f(*args, **kwargs)

        return wrapper

    return decorator