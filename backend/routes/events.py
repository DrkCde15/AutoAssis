"""
Eventos API - Varredura de eventos automotivos
Fontes: NFeiras.com, Sindirepa Brasil, Diretriz, Shopping Interlagos, Google (Sympla)
"""
import logging
from flask import Blueprint, request, jsonify
from services.automotive_events import scan_automotive_events, filter_events

events_bp = Blueprint('events', __name__)
logger = logging.getLogger(__name__)


@events_bp.route('/api/events/automotive', methods=['GET'])
def automotive_events():
    """
    Retorna eventos automotivos coletados por web scraping / Google.

    Query params:
      - force=1       : ignora o cache e refaz a varredura
      - uf=SP         : filtra por UF (BR) — "INT" para internacionais
      - q=auto        : filtra por termo no título/descrição/cidade/local
      - categoria=    : feira | encontro | competicao | exposicao | congresso | outros
      - periodo=      : "30" | "90" | "ano" | "todos" — janela a partir de hoje
    """
    try:
        force = request.args.get('force', '').lower() in ('1', 'true', 'yes')
        uf = (request.args.get('uf') or '').strip().upper()
        q = (request.args.get('q') or '').strip().lower()
        categoria = (request.args.get('categoria') or '').strip().lower()
        periodo = (request.args.get('periodo') or '').strip().lower()

        data = scan_automotive_events(force=force)

        events = filter_events(
            data.get('events', []),
            uf=uf or None,
            q=q or None,
            categoria=categoria or None,
            periodo=periodo or None,
        )

        data['count'] = len(events)
        data['events'] = events
        return jsonify(data), 200

    except Exception as e:
        logger.error(f"Erro na varredura de eventos: {e}")
        return jsonify({"success": False, "error": "Erro interno na varredura de eventos"}), 500