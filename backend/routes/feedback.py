import logging

import bleach
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request

from extensions import limiter
from .database import get_db

feedback_bp = Blueprint("feedback_bp", __name__)
logger = logging.getLogger(__name__)


def _clean_text(value, max_length):
    if value is None:
        return ""
    raw = str(value)
    cleaned = bleach.clean(raw, tags=[], attributes={}, strip=True) if any(ch in raw for ch in "<>&") else raw
    cleaned = " ".join(cleaned.split())
    return cleaned[:max_length]


def _get_optional_user_id():
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None


@feedback_bp.route("/api/feedback", methods=["POST"])
@limiter.limit("10 per minute")
def post_feedback():
    data = request.get_json(silent=True) or {}
    nome = _clean_text(data.get("nome"), 100)
    email = _clean_text(data.get("email"), 100)
    estrelas = data.get("estrelas", 5)
    comentario = _clean_text(data.get("comentario"), 2000)

    if not comentario:
        return jsonify(error="O comentario e obrigatorio."), 400

    try:
        estrelas_int = int(estrelas)
    except (TypeError, ValueError):
        estrelas_int = 5
    estrelas_int = max(1, min(estrelas_int, 5))

    user_id = _get_optional_user_id()

    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                """
                INSERT INTO feedbacks (user_id, nome, email, estrelas, comentario)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_id, nome, email, estrelas_int, comentario),
            )
        return jsonify(message="Feedback enviado com sucesso!"), 201
    except Exception as e:
        logger.error("Erro ao salvar feedback: %s", e, exc_info=True)
        return jsonify(error="Erro interno ao salvar feedback."), 500


@feedback_bp.route("/api/feedbacks", methods=["GET"])
@limiter.limit("30 per minute")
def get_feedbacks():
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                "SELECT id, user_id, nome, estrelas, comentario, created_at FROM feedbacks ORDER BY created_at DESC LIMIT 50"
            )
            feedbacks = cursor.fetchall()
            for item in feedbacks:
                item["nome"] = _clean_text(item.get("nome"), 100)
                item["comentario"] = _clean_text(item.get("comentario"), 2000)
            return jsonify(feedbacks=feedbacks), 200
    except Exception as e:
        logger.error("Erro ao listar feedbacks: %s", e, exc_info=True)
        return jsonify(error="Erro interno ao listar feedbacks."), 500


@feedback_bp.route("/api/feedback/<int:feedback_id>", methods=["PUT"])
@jwt_required()
def update_feedback(feedback_id):
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    estrelas = data.get("estrelas")
    comentario = _clean_text(data.get("comentario"), 2000)

    if not comentario:
        return jsonify(error="O comentario e obrigatorio."), 400

    try:
        estrelas_int = int(estrelas)
    except (TypeError, ValueError):
        estrelas_int = 5
    estrelas_int = max(1, min(estrelas_int, 5))

    try:
        with get_db() as (cursor, conn):
            # Verificar se o feedback pertence ao usuário
            cursor.execute("SELECT user_id FROM feedbacks WHERE id = %s", (feedback_id,))
            feedback = cursor.fetchone()

            if not feedback:
                return jsonify(error="Feedback não encontrado."), 404

            if str(feedback["user_id"]) != str(user_id):
                return jsonify(error="Você não tem permissão para editar este feedback."), 403

            cursor.execute(
                "UPDATE feedbacks SET estrelas = %s, comentario = %s WHERE id = %s",
                (estrelas_int, comentario, feedback_id),
            )
        return jsonify(message="Feedback atualizado com sucesso!"), 200
    except Exception as e:
        logger.error("Erro ao atualizar feedback: %s", e, exc_info=True)
        return jsonify(error="Erro interno ao atualizar feedback."), 500


@feedback_bp.route("/api/feedback/<int:feedback_id>", methods=["DELETE"])
@jwt_required()
def delete_feedback(feedback_id):
    user_id = get_jwt_identity()

    try:
        with get_db() as (cursor, conn):
            # Verificar se o feedback pertence ao usuário
            cursor.execute("SELECT user_id FROM feedbacks WHERE id = %s", (feedback_id,))
            feedback = cursor.fetchone()

            if not feedback:
                return jsonify(error="Feedback não encontrado."), 404

            if str(feedback["user_id"]) != str(user_id):
                return jsonify(error="Você não tem permissão para excluir este feedback."), 403

            cursor.execute("DELETE FROM feedbacks WHERE id = %s", (feedback_id,))
        return jsonify(message="Feedback excluído com sucesso!"), 200
    except Exception as e:
        logger.error("Erro ao excluir feedback: %s", e, exc_info=True)
        return jsonify(error="Erro interno ao excluir feedback."), 500


@feedback_bp.route("/api/chat/feedback", methods=["POST"])
@limiter.limit("30 per minute")
def post_chat_feedback():
    data = request.get_json(silent=True) or {}
    avaliacao = data.get("avaliacao")
    if str(avaliacao) not in ("1", "-1"):
        return jsonify(error="avaliacao deve ser 1 (util) ou -1 (inutil)."), 400
    avaliacao_int = 1 if str(avaliacao) == "1" else -1
    motivo = _clean_text(data.get("motivo"), 60)
    comentario = _clean_text(data.get("comentario"), 2000)
    chat_id = data.get("chat_id")
    message_id = _clean_text(data.get("message_id"), 80)
    user_id = _get_optional_user_id()
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                """
                INSERT INTO chat_feedback (user_id, chat_id, message_id, avaliacao, motivo, comentario)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (user_id, chat_id, message_id, avaliacao_int, motivo, comentario),
            )
        return jsonify(message="Obrigado pelo feedback!"), 201
    except Exception as e:
        logger.error("Erro ao salvar chat_feedback: %s", e, exc_info=True)
        return jsonify(error="Erro interno ao salvar feedback."), 500


def _admin_user_id():
    """Retorna o id do usuario se ele for admin, ou None."""
    try:
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


@feedback_bp.route("/api/admin/chat-feedback-summary", methods=["GET"])
@limiter.limit("20 per minute")
def chat_feedback_summary():
    if _admin_user_id() is None:
        return jsonify(error="Acesso restrito."), 403
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                "SELECT COUNT(*) AS total, SUM(avaliacao=1) AS positivos, "
                "SUM(avaliacao=-1) AS negativos FROM chat_feedback"
            )
            totals = cursor.fetchone() or {}
            cursor.execute(
                "SELECT motivo, COUNT(*) AS n FROM chat_feedback "
                "WHERE motivo IS NOT NULL AND CHAR_LENGTH(motivo) > 0 GROUP BY motivo ORDER BY n DESC"
            )
            por_motivo = cursor.fetchall()
            cursor.execute(
                "SELECT DATE(created_at) AS dia, SUM(avaliacao=1) AS positivos, "
                "SUM(avaliacao=-1) AS negativos FROM chat_feedback "
                "GROUP BY dia ORDER BY dia DESC LIMIT 30"
            )
            por_dia = cursor.fetchall()
        return jsonify(
            total=totals.get("total") or 0,
            positivos=totals.get("positivos") or 0,
            negativos=totals.get("negativos") or 0,
            por_motivo=por_motivo,
            por_dia=por_dia,
        ), 200
    except Exception as e:
        logger.error("Erro ao resumir chat_feedback: %s", e, exc_info=True)
        return jsonify(error="Erro interno."), 500


@feedback_bp.route("/api/chat/feedback/stats", methods=["GET"])
@limiter.limit("30 per minute")
def chat_feedback_stats():
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                "SELECT COUNT(*) AS total, SUM(avaliacao=1) AS positivos, "
                "SUM(avaliacao=-1) AS negativos FROM chat_feedback"
            )
            totals = cursor.fetchone() or {}
        return jsonify(
            total=totals.get("total") or 0,
            positivos=totals.get("positivos") or 0,
            negativos=totals.get("negativos") or 0,
        ), 200
    except Exception as e:
        logger.error("Erro ao calcular stats chat_feedback: %s", e, exc_info=True)
        return jsonify(error="Erro interno."), 500
