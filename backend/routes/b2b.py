"""
B2B API - Diagnóstico por foto como API assinável (clientes corporativos).

Autenticação: header `X-API-Key` com chave gerada via `POST /api/b2b/keys`
(admin, protegida por B2B_ADMIN_SECRET). A chave é exibida UMA vez; no banco
fica apenas o hash SHA-256. Comparação em tempo constante (hmac.compare_digest).
Rate limit por cliente (minuto) com contador atômico no Redis (fallback local).
"""
import hashlib
import hmac
import io
import logging
import os
import secrets
import time

from flask import Blueprint, jsonify, request
from fpdf import FPDF

from routes.database import get_db
from services.vision_ai import analisar_imagem
from utils.cache import get_redis_client
from extensions import limiter

b2b_bp = Blueprint("b2b_bp", __name__)
logger = logging.getLogger(__name__)

API_KEY_HEADER = "X-API-Key"
FALLBACK_LIMIT = 30  # requests/min por cliente (sem Redis / sem valor configurado)
_local_rate = {}  # client_id -> (janela, contagem) para fallback sem Redis
MAX_IMAGE_B64 = 15 * 1024 * 1024  # 15 MB base64 (~11 MB binário)


def _hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _api_key_prefix(raw_key: str) -> str:
    return raw_key[:12]


def authenticate_api_key():
    """Valida o header X-API-Key. Retorna dict do cliente ou None."""
    raw_key = (request.headers.get(API_KEY_HEADER) or "").strip()
    if not raw_key or len(raw_key) < 16:
        return None
    key_hash = _hash_api_key(raw_key)
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                "SELECT id, nome, api_key_hash, is_active, rate_limit_per_min "
                "FROM api_clients WHERE api_key_hash = %s",
                (key_hash,),
            )
            client = cursor.fetchone()

        if not client:
            return None
        # Double-check: garante comparação em tempo constante mesmo via índice
        if not hmac.compare_digest(client["api_key_hash"], key_hash):
            return None
        if not client.get("is_active"):
            return None
        return dict(client)
    except Exception as exc:
        logger.error("Erro ao autenticar API key: %s", exc, exc_info=True)
        return None


def check_rate_limit(client_id: int, limit_per_min: int) -> bool:
    """Contador deslizante simples por janela de 60s. True = pode passar."""
    limit = int(limit_per_min or FALLBACK_LIMIT)
    redis = get_redis_client()
    now = int(time.time())
    window = now // 60
    key = f"b2b:rate:{client_id}:{window}"
    if redis is not None:
        try:
            count = redis.incr(key)
            if count == 1:
                redis.expire(key, 90)
            return count <= limit
        except Exception:
            pass
    # Fallback local (por processo)
    prev = _local_rate.get(client_id)
    if not prev or prev[0] != window:
        _local_rate[client_id] = (window, 1)
        return True
    prev = _local_rate[client_id]
    if prev[1] >= limit:
        return False
    _local_rate[client_id] = (window, prev[1] + 1)
    return True


def log_usage(client_id: int, endpoint: str, status_code: int):
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                "INSERT INTO api_usage_logs (client_id, endpoint, status_code) "
                "VALUES (%s, %s, %s)",
                (client_id, endpoint, status_code),
            )
            cursor.execute(
                "UPDATE api_clients SET last_used_at = NOW() WHERE id = %s",
                (client_id,),
            )
    except Exception as exc:
        logger.warning("Falha ao logar uso B2B: %s", exc)


def _build_laudo_pdf(cliente_nome: str, texto_laudo: str) -> bytes:
    """Gera o PDF do laudo em memória (estilo padronizado AutoAssist)."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", "B", 15)
    pdf.set_text_color(59, 130, 246)
    pdf.cell(0, 10, "AutoAssist IA - Laudo Tecnico (B2B)", 0, 1, "C")
    pdf.ln(5)

    pdf.set_font("Arial", "B", 12)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 8, "Cliente:", 0, 1)
    pdf.set_font("Arial", "", 11)
    pdf.cell(0, 7, cliente_nome, 0, 1)
    from datetime import datetime
    pdf.cell(0, 7, f"Emitido em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", 0, 1)
    pdf.ln(4)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "Diagnostico (IA):", 0, 1)
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    texto_limpo = (
        texto_laudo.replace("–", "-").replace("—", "-")
        .replace("“", '"').replace("”", '"')
        .replace("‘", "'").replace("’", "'")
    )
    texto_limpo = texto_limpo.encode("latin-1", "ignore").decode("latin-1")
    pdf.multi_cell(0, 7, texto_limpo)

    pdf.ln(8)
    pdf.set_font("Arial", "I", 9)
    pdf.set_text_color(200, 50, 50)
    pdf.multi_cell(
        0, 5,
        "AVISO: Laudo gerado por Inteligencia Artificial. Nao substitui "
        "inspecao mecanica presencial.",
    )
    return pdf.output(dest="S").encode("latin-1")


@b2b_bp.route("/api/b2b/diagnosis", methods=["POST"])
def b2b_diagnosis():
    client = authenticate_api_key()
    if not client:
        return jsonify(error="API key invalida ou inativa."), 401

    if not check_rate_limit(client["id"], client.get("rate_limit_per_min")):
        log_usage(client["id"], "/api/b2b/diagnosis", 429)
        return jsonify(error="Limite de requisicoes excedido."), 429

    data = request.get_json(silent=True) or {}
    image_b64 = (data.get("image") or data.get("image_b64") or "").strip()
    if not image_b64:
        log_usage(client["id"], "/api/b2b/diagnosis", 400)
        return jsonify(error="Campo 'image' (base64) e obrigatorio."), 400
    if len(image_b64) > MAX_IMAGE_B64:
        log_usage(client["id"], "/api/b2b/diagnosis", 413)
        return jsonify(error="Imagem muito grande (max 15MB em base64)."), 413

    pergunta = (data.get("pergunta") or "").strip() or None
    formato = (data.get("formato") or "json").strip().lower()

    try:
        laudo = analisar_imagem(image_b64, pergunta)
    except Exception as exc:
        logger.error("B2B: falha na analise de imagem: %s", exc, exc_info=True)
        log_usage(client["id"], "/api/b2b/diagnosis", 502)
        return jsonify(error="Falha na analise da imagem. Tente novamente."), 502

    if "não conseguiu" in laudo or "nao conseguiu" in laudo:
        log_usage(client["id"], "/api/b2b/diagnosis", 502)
        return jsonify(error=laudo), 502

    log_usage(client["id"], "/api/b2b/diagnosis", 200)

    if formato == "pdf":
        try:
            pdf_bytes = _build_laudo_pdf(client["nome"], laudo)
        except Exception as exc:
            logger.error("B2B: falha ao gerar PDF: %s", exc, exc_info=True)
            pdf_bytes = laudo.encode("latin-1", "ignore")
        from flask import send_file
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name="laudo_autoassist.pdf",
        )

    return jsonify({
        "success": True,
        "client": client["nome"],
        "formato": "json",
        "laudo": laudo,
        "aviso": "Laudo gerado por IA. Nao substitui inspecao mecanica presencial.",
    }), 200


@b2b_bp.route("/api/b2b/keys", methods=["POST"])
def create_api_key():
    """Cria uma nova API key B2B. Protegida por B2B_ADMIN_SECRET (header X-Admin-Secret)."""
    expected = (os.getenv("B2B_ADMIN_SECRET") or "").strip()
    if not expected:
        return jsonify(error="B2B_ADMIN_SECRET nao configurado."), 500
    provided = request.headers.get("X-Admin-Secret") or ""
    if not provided or not hmac.compare_digest(provided, expected):
        return jsonify(error="Acesso negado."), 403

    data = request.get_json(silent=True) or {}
    nome = (data.get("nome") or "").strip()[:120]
    if not nome:
        return jsonify(error="Campo 'nome' do cliente e obrigatorio."), 400

    rate_limit = data.get("rate_limit_per_min")
    try:
        rate_limit = max(1, min(int(rate_limit), 600))
    except (TypeError, ValueError):
        rate_limit = FALLBACK_LIMIT

    raw_key = f"aa_{secrets.token_urlsafe(32)}"
    key_hash = _hash_api_key(raw_key)
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                "INSERT INTO api_clients (nome, api_key_hash, api_key_prefix, rate_limit_per_min) "
                "VALUES (%s, %s, %s, %s)",
                (nome, key_hash, _api_key_prefix(raw_key), rate_limit),
            )
    except Exception as exc:
        logger.error("Erro ao criar API key: %s", exc, exc_info=True)
        return jsonify(error="Erro interno ao criar a chave."), 500

    logger.info("B2B: nova API key criada para %s (prefixo %s)", nome, _api_key_prefix(raw_key))
    return jsonify({
        "success": True,
        "client_nome": nome,
        "api_key": raw_key,   # exibida UMA vez
        "api_key_prefix": _api_key_prefix(raw_key),
        "rate_limit_per_min": rate_limit,
        "aviso": "Guarde esta chave agora: ela nao podera ser recuperada depois.",
    }), 201


def _b2b_admin_user_id():
    """Retorna o id do usuario se for admin, senao None."""
    try:
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        verify_jwt_in_request()
        uid = get_jwt_identity()
    except Exception:
        return None
    try:
        with get_db() as (cursor, conn):
            cursor.execute("SELECT is_admin FROM users WHERE id = %s", (uid,))
            row = cursor.fetchone()
        if row and row.get("is_admin"):
            return uid
    except Exception:
        return None
    return None


def _clean(value, max_len):
    if value is None:
        return ""
    return " ".join(str(value).split())[:max_len]


@b2b_bp.route("/api/b2b/leads", methods=["POST"])
@limiter.limit("10 per minute")
def post_b2b_lead():
    """Captura um lead do formulario publico da pagina B2B."""
    data = request.get_json(silent=True) or {}
    nome = _clean(data.get("nome"), 120)
    email = _clean(data.get("email"), 120)
    if not nome or not email:
        return jsonify(error="nome e email sao obrigatorios."), 400
    empresa = _clean(data.get("empresa"), 120)
    telefone = _clean(data.get("telefone"), 30)
    mensagem = _clean(data.get("mensagem"), 2000)
    origem = _clean(data.get("origem") or "site_b2b", 60)
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                """
                INSERT INTO b2b_leads (nome, email, empresa, telefone, mensagem, origem)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (nome, email, empresa, telefone, mensagem, origem),
            )
        return jsonify(message="Recebemos seu contato! Nossa equipe B2B entrara em contato."), 201
    except Exception as e:
        logger.error("Erro ao salvar lead B2B: %s", e, exc_info=True)
        return jsonify(error="Erro interno ao enviar contato."), 500


@b2b_bp.route("/api/admin/b2b/leads", methods=["GET"])
@limiter.limit("20 per minute")
def list_b2b_leads():
    if _b2b_admin_user_id() is None:
        return jsonify(error="Acesso restrito."), 403
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                "SELECT id, nome, email, empresa, telefone, mensagem, origem, created_at "
                "FROM b2b_leads ORDER BY created_at DESC LIMIT 200"
            )
            leads = cursor.fetchall()
        return jsonify(leads=leads), 200
    except Exception as e:
        logger.error("Erro ao listar leads B2B: %s", e, exc_info=True)
        return jsonify(error="Erro interno."), 500
