"""Monitoramento leve de abuso em endpoints públicos (sem bloquear).

Incrementa um contador diário por IP no Redis e emite WARNING quando um
limite é atingido, sinalizando possível spam/armazenamento anômalo.
Falha fechada: se o Redis não estiver disponível, apenas não monitora.
"""
import logging
import os
from datetime import datetime, timezone

from flask import request

logger = logging.getLogger(__name__)


def _redis_client():
    try:
        import redis

        url = os.getenv("REDIS_URL") or os.getenv("RATELIMIT_STORAGE_URI")
        if not url:
            return None
        return redis.Redis.from_url(url, socket_timeout=1, decode_responses=True)
    except Exception:
        return None


def monitor_public_ingest(bucket: str, limit: int = 500) -> None:
    """Conta eventos/leads por IP ao longo do dia e alerta a cada `limit`."""
    ip = (request.remote_addr or "unknown")
    try:
        r = _redis_client()
        if not r:
            return
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = f"abuse:{bucket}:{ip}:{day}"
        count = r.incr(key)
        if count == 1:
            r.expire(key, 86400)
        if count > 1 and count % limit == 0:
            logger.warning(
                "Possivel abuso em endpoint publico [%s] ip=%s total_dia=%s",
                bucket,
                ip,
                count,
            )
    except Exception as exc:
        logger.debug("monitor_public_ingest falhou (ignorado): %s", exc)
