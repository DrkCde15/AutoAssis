"""
Eventos API - Varredura de eventos automotivos
Fontes: NFeiras.com, Sindirepa Brasil, Diretriz, Shopping Interlagos, Google (Sympla)
"""
import logging
from flask import Blueprint, request, jsonify
from services.automotive_events import scan_automotive_events

events_bp = Blueprint('events', __name__)
logger = logging.getLogger(__name__)


@events_bp.route('/api/events/automotive', methods=['GET'])
def automotive_events():
    """
    Retorna eventos automotivos coletados por web scraping / Google.

    Query params:
      - force=1   : ignora o cache e refaz a varredura
      - uf=SP     : filtra por UF (BR) — "INT" para internacionais
      - q=auto    : filtra por termo no título/descrição
    """
    try:
        force = request.args.get('force', '').lower() in ('1', 'true', 'yes')
        uf = (request.args.get('uf') or '').strip().upper()
        q = (request.args.get('q') or '').strip().lower()

        data = scan_automotive_events(force=force)

        events = data.get('events', [])

        if uf:
            events = [e for e in events if (e.get('uf') or '').upper() == uf]

        if q:
            events = [
                e for e in events
                if q in (e.get('titulo') or '').lower()
                or q in (e.get('descricao') or '').lower()
                or q in (e.get('cidade') or '').lower()
            ]

        data['count'] = len(events)
        data['events'] = events
        return jsonify(data), 200

    except Exception as e:
        logger.error(f"Erro na varredura de eventos: {e}")
        return jsonify({"success": False, "error": "Erro interno na varredura de eventos"}), 500