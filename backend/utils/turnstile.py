"""Verificação de CAPTCHA (Cloudflare Turnstile).

Contrato canônico (Turnstile Spin):
- O token chega no corpo/hader e é validado server-side via /siteverify.
- Exige `success === true`, `action` igual ao da superfície protegida e
  `hostname` dentro do allowlist de `TURNSTILE_HOSTNAMES`.
- Fail-closed: sem chave configurada o decorator é no-op (dev/testes);
  com chave configurada, qualquer falha (rede, payload, validação) rejeita.
"""
import os
import time
from functools import wraps

import requests
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
TIMEOUT_SECONDS = 5
MAX_TOKEN_LENGTH = 2048

# Tokens do Turnstile são de uso único na Cloudflare, mas uma sessão de chat
# faz várias chamadas. Cacheamos verificações bem-sucedidas por um curto TTL
# para que um único desafio resolvido cubra a sessão inteira (fail-safe: se o
# cache falhar, revalidamos na Cloudflare normalmente).
_VERIFIED_TOKENS = {}
_VERIFIED_TTL_SECONDS = 300


def _token_already_verified(token: str) -> bool:
    exp = _VERIFIED_TOKENS.get(token)
    if exp is None:
        return False
    if exp > time.time():
        return True
    _VERIFIED_TOKENS.pop(token, None)
    return False


def _mark_token_verified(token: str) -> None:
    _VERIFIED_TOKENS[token] = time.time() + _VERIFIED_TTL_SECONDS


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
    if _token_already_verified(token):
        return True
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
    ok = (
        result.get("success") is True
        and result.get("action") == expected_action
        and result.get("hostname") in hostnames
    )
    if ok:
        _mark_token_verified(token)
    return ok


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


def turnstile_or_auth(action: str = "default"):
    """Exige Turnstile apenas para visitantes anônimos.

    Usuários autenticados (JWT válido) são isentos. Visitantes sem login
    precisam apresentar um token Turnstile válido quando o recurso está
    habilitado (fail-closed). Usado para proteger endpoints de IA públicos
    (/api/chat, /api/voice, /ws/chat) contra abuso de custo.
    """

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Autenticado => isento do desafio
            try:
                verify_jwt_in_request(optional=True)
                if get_jwt_identity():
                    return f(*args, **kwargs)
            except Exception:
                pass

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