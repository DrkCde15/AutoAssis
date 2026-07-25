"""
Mecânicos API - Busca e gestão de mecânicos
Fontes: OpenStreetMap (Overpass API) + Web Scraping (Google)
"""
import logging
import math
import json
import re
import requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from routes.database import get_db
from utils.cache import cache_get_json, cache_set_json
from services.web_scraping import search_mechanics_web

mechanics_bp = Blueprint('mechanics', __name__)
logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OSM_CACHE_TTL = 3600  # 1 hora


def calculate_distance(lat1, lng1, lat2, lng2):
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * \
        math.sin(delta_lng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def search_osm(user_lat, user_lng, radius, service_type=None):
    """Busca oficinas mecânicas via Overpass API (OpenStreetMap)."""
    cache_key = f"osm_mechanics:{user_lat:.4f}:{user_lng:.4f}:{radius}:{service_type or ''}"
    cached = cache_get_json(cache_key)
    if cached is not None:
        return cached

    # Mapeia service_type para tags OSM
    osm_tags = ['"shop"="car_repair"', '"amenity"="car_repair"', '"craft"="auto_mechanic"']
    if service_type:
        if service_type in ('eletrica',):
            osm_tags.append('"craft"="auto_electrician"')

    radius_m = int(radius * 1000)

    parts = []
    for tag in osm_tags:
        for elem in ('node', 'way', 'relation'):
            parts.append(f'{elem}[{tag}](around:{radius_m},{user_lat},{user_lng});')

    query = f"""\
[out:json][timeout:45];
({''.join(parts)});
out center;
"""

    try:
        resp = requests.post(OVERPASS_URL, data={'data': query}, timeout=50,
                             headers={
                                 'Accept': 'application/json',
                                 'User-Agent': 'AutoAssist/1.0 (vehicle maintenance assistant)'
                             })
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.error(f"Erro Overpass API: {e}")
        return []

    results = []
    seen = set()

    for element in data.get('elements', []):
        lat = element.get('lat')
        lng = element.get('lon')
        if lat is None or lng is None:
            center = element.get('center')
            if center:
                lat = center.get('lat')
                lng = center.get('lon')
        if lat is None or lng is None:
            continue

        tags = element.get('tags', {})
        nome = tags.get('name', '').strip()
        if not nome:
            nome = 'Oficina Mecânica'

        endereco_parts = []
        if tags.get('addr:street'):
            number = tags.get('addr:housenumber', '')
            endereco_parts.append(f"{tags['addr:street']} {number}".strip())
        if tags.get('addr:city'):
            endereco_parts.append(tags['addr:city'])
        if tags.get('addr:postcode'):
            endereco_parts.append(tags['addr:postcode'])

        endereco = ', '.join(endereco_parts) if endereco_parts else tags.get('display_name', '')
        cidade = tags.get('addr:city', '')
        estado = tags.get('addr:state', '')

        telefone = tags.get('phone', '')
        website = tags.get('website', '') or tags.get('url', '')

        descricao_parts = []
        if tags.get('description'):
            descricao_parts.append(tags['description'])
        if tags.get('opening_hours'):
            descricao_parts.append(f"Horários: {tags['opening_hours']}")
        descricao = '. '.join(descricao_parts)

        # Deriva especialidades das tags OSM
        especialidades = set()
        tag_map = {
            'shop=car_repair': 'troca_oleo',
            'craft=auto_mechanic': 'motor',
            'craft=auto_electrician': 'eletrica',
            'service=dealer': 'suspensao',
        }
        for osm_key, service in tag_map.items():
            key, val = osm_key.split('=')
            if tags.get(key) == val:
                especialidades.add(service)

        # Constrói horário se disponível
        horarios = None
        if tags.get('opening_hours'):
            try:
                horarios = parse_opening_hours(tags['opening_hours'])
            except Exception:
                pass

        osm_id = element.get('id', 0)
        uid = f"osm_{osm_id}"
        if uid in seen:
            continue
        seen.add(uid)

        distance = round(calculate_distance(user_lat, user_lng, lat, lng), 1)
        if distance > radius:
            continue

        results.append({
            "id": uid,
            "nome": nome,
            "endereco": endereco,
            "cidade": cidade,
            "estado": estado,
            "latitude": lat,
            "longitude": lng,
            "telefone": telefone,
            "website": website,
            "descricao": descricao,
            "especialidades": sorted(especialidades) or ['troca_oleo'],
            "servicos": [],
            "horario_funcionamento": horarios,
            "avaliacao_media": None,
            "total_avaliacoes": 0,
            "foto_url": None,
            "is_verified": False,
            "distance_km": distance,
            "_source": "osm"
        })

    results.sort(key=lambda m: m['distance_km'])
    cache_set_json(cache_key, results, ttl=OSM_CACHE_TTL)
    return results


def parse_opening_hours(oh_string):
    """Converte string de horário OSM para formato do app (dias da semana)."""
    day_map = {
        'mo': 'seg', 'tu': 'ter', 'we': 'qua',
        'th': 'qui', 'fr': 'sex', 'sa': 'sab', 'su': 'dom'
    }
    result = {}

    # Padrão simples: "Mo-Fr 08:00-18:00; Sa 09:00-13:00"
    parts = re.split(r';\s*', oh_string)
    for part in parts:
        part = part.strip()
        match = re.match(
            r'([A-Za-z]{2})(?:-([A-Za-z]{2}))?\s+([0-9]{2}:[0-9]{2})-([0-9]{2}:[0-9]{2})',
            part
        )
        if match:
            start_day = match.group(1).lower()
            end_day = match.group(2)
            open_time = match.group(3)
            close_time = match.group(4)

            days = list(day_map.keys())
            if start_day in day_map:
                if end_day:
                    end_day = end_day.lower()
                    if end_day in day_map:
                        start_idx = days.index(start_day)
                        end_idx = days.index(end_day)
                        for i in range(start_idx, end_idx + 1):
                            result[day_map[days[i]]] = f"{open_time}-{close_time}"
                else:
                    result[day_map[start_day]] = f"{open_time}-{close_time}"

    # Preenche dias não definidos como fechado
    for d in ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']:
        if d not in result:
            result[d] = 'fechado'

    return result


@mechanics_bp.route('/api/mechanics/search', methods=['GET'])
def search_mechanics():
    """
    Busca mecânicos próximos.
    Fontes: MySQL (mecânicos salvos) + OpenStreetMap + Web Scraping
    """
    try:
        user_lat = request.args.get('lat', type=float)
        user_lng = request.args.get('lng', type=float)

        if user_lat is None or user_lng is None:
            return jsonify(error="Coordenadas lat e lng são obrigatórias"), 400

        radius = request.args.get('radius', default=10, type=float)
        service_type = request.args.get('service_type', default=None)
        min_rating = request.args.get('min_rating', default=0, type=float)
        sort_by = request.args.get('sort_by', default='distance')
        limit = request.args.get('limit', default=20, type=int)

        mechanics = []

        # 1. MySQL — mecânicos já salvos (favoritados, cadastrados)
        try:
            with get_db() as (cursor, conn):
                cursor.execute("""
                    SELECT id, nome, endereco, cidade, estado, cep,
                           latitude, longitude, telefone, email, website,
                           descricao, especialidades, servicos,
                           horario_funcionamento, avaliacao_media,
                           total_avaliacoes, foto_url, is_verified,
                           (
                               %s * ACOS(
                                   COS(RADIANS(%s)) * COS(RADIANS(latitude)) *
                                   COS(RADIANS(longitude) - RADIANS(%s)) +
                                   SIN(RADIANS(%s)) * SIN(RADIANS(latitude))
                               )
                           ) AS distance_km
                    FROM mechanics
                    WHERE is_active = TRUE
                      AND latitude IS NOT NULL
                      AND longitude IS NOT NULL
                    HAVING distance_km <= %s
                    ORDER BY distance_km ASC
                    LIMIT %s
                """, (EARTH_RADIUS_KM, user_lat, user_lng, user_lat, radius, limit))

                for m in cursor.fetchall():
                    if m.get('especialidades'):
                        m['especialidades'] = json.loads(m['especialidades'])
                    if m.get('servicos'):
                        m['servicos'] = json.loads(m['servicos'])
                    if m.get('horario_funcionamento'):
                        m['horario_funcionamento'] = json.loads(m['horario_funcionamento'])
                    m['distance_km'] = round(m['distance_km'], 1)
                    m['_source'] = 'db'
                    mechanics.append(m)
        except Exception as e:
            logger.error(f"Erro na busca MySQL: {e}")

        existing_ids = {m.get('id') for m in mechanics}

        # 2. OpenStreetMap (Overpass API)
        if len(mechanics) < limit:
            try:
                osm_results = search_osm(user_lat, user_lng, radius, service_type)
                for osm_m in osm_results:
                    if osm_m['id'] not in existing_ids:
                        mechanics.append(osm_m)
                        existing_ids.add(osm_m['id'])
                        if len(mechanics) >= limit:
                            break
            except Exception as e:
                logger.error(f"Erro na busca OSM: {e}")

        # 3. Web Scraping (Google Search)
        if len(mechanics) < limit:
            try:
                web_results = search_mechanics_web(user_lat, user_lng, radius, service_type)
                for web_m in web_results:
                    if web_m['id'] not in existing_ids:
                        mechanics.append(web_m)
                        existing_ids.add(web_m['id'])
                        if len(mechanics) >= limit:
                            break
            except Exception as e:
                logger.error(f"Erro na busca web: {e}")

        # Filtro por avaliação mínima
        if min_rating > 0:
            mechanics = [m for m in mechanics if (m.get('avaliacao_media') or 0) >= min_rating]

        # Ordenação final
        if sort_by == 'rating':
            mechanics.sort(key=lambda m: (m.get('avaliacao_media') or 0, -m['distance_km']), reverse=True)
        elif sort_by == 'name':
            mechanics.sort(key=lambda m: (m.get('nome', '').lower(), m['distance_km']))
        else:
            mechanics.sort(key=lambda m: m['distance_km'])

        mechanics = mechanics[:limit]

        return jsonify({
            "success": True,
            "count": len(mechanics),
            "mechanics": mechanics
        }), 200

    except Exception as e:
        logger.error(f"Erro na busca de mecânicos: {e}")
        return jsonify(error="Erro interno na busca"), 500


@mechanics_bp.route('/api/mechanics/<mechanic_id>', methods=['GET'])
def get_mechanic_profile(mechanic_id):
    """
    Retorna perfil completo de um mecânico.
    Suporta IDs do MySQL (int), OSM ("osm_...") e Web ("web_...").
    """
    try:
        sid = str(mechanic_id)
        if sid.startswith('osm_') or sid.startswith('web_'):
            return jsonify({
                "success": True,
                "mechanic": {
                    "id": mechanic_id,
                    "nome": "",
                    "endereco": "",
                    "avaliacao_media": None,
                    "total_avaliacoes": 0,
                    "reviews": [],
                    "servicos": [],
                    "horario_funcionamento": None,
                    "_source": "osm" if sid.startswith('osm_') else "web"
                }
            }), 200

        # ID do MySQL
        mechanic_id = int(mechanic_id)

        with get_db() as (cursor, conn):
            cursor.execute("""
                SELECT * FROM mechanics
                WHERE id = %s AND is_active = TRUE
            """, (mechanic_id,))

            mechanic = cursor.fetchone()

            if not mechanic:
                return jsonify(error="Mecânico não encontrado"), 404

            if mechanic.get('especialidades'):
                mechanic['especialidades'] = json.loads(mechanic['especialidades'])
            if mechanic.get('servicos'):
                mechanic['servicos'] = json.loads(mechanic['servicos'])
            if mechanic.get('horario_funcionamento'):
                mechanic['horario_funcionamento'] = json.loads(mechanic['horario_funcionamento'])

            cursor.execute("""
                SELECT r.*, u.nome as user_nome, u.profile_pic
                FROM mechanic_reviews r
                LEFT JOIN users u ON u.id = r.user_id
                WHERE r.mechanic_id = %s
                ORDER BY r.created_at DESC
                LIMIT 10
            """, (mechanic_id,))
            mechanic['reviews'] = cursor.fetchall()

            return jsonify({
                "success": True,
                "mechanic": mechanic
            }), 200

    except Exception as e:
        logger.error(f"Erro ao buscar perfil do mecânico: {e}")
        return jsonify(error="Erro interno"), 500


@mechanics_bp.route('/api/mechanics/<int:mechanic_id>/reviews', methods=['POST'])
@jwt_required()
def add_mechanic_review(mechanic_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        avaliacao = data.get('avaliacao')
        comentario = data.get('comentario', '')
        service_type = data.get('service_type', '')

        if not avaliacao or avaliacao < 1 or avaliacao > 5:
            return jsonify(error="Avaliação deve ser entre 1 e 5"), 400

        with get_db() as (cursor, conn):
            cursor.execute("SELECT id FROM mechanics WHERE id = %s", (mechanic_id,))
            if not cursor.fetchone():
                return jsonify(error="Mecânico não encontrado"), 404

            cursor.execute("""
                INSERT INTO mechanic_reviews
                (mechanic_id, user_id, avaliacao, comentario, service_type)
                VALUES (%s, %s, %s, %s, %s)
            """, (mechanic_id, user_id, avaliacao, comentario, service_type))

            cursor.execute("""
                UPDATE mechanics
                SET avaliacao_media = (
                    SELECT AVG(avaliacao) FROM mechanic_reviews
                    WHERE mechanic_id = %s
                ),
                total_avaliacoes = (
                    SELECT COUNT(*) FROM mechanic_reviews
                    WHERE mechanic_id = %s
                )
                WHERE id = %s
            """, (mechanic_id, mechanic_id, mechanic_id))

            return jsonify({
                "success": True,
                "message": "Avaliação adicionada com sucesso"
            }), 201

    except Exception as e:
        logger.error(f"Erro ao adicionar avaliação: {e}")
        return jsonify(error="Erro interno"), 500


def upsert_mechanic(data):
    """Insere ou atualiza um mecânico no MySQL.

    Usa nome + latitude + longitude como chave de unicidade.
    Retorna o id do mecânico no MySQL.
    """
    nome = (data.get('nome') or '').strip()
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    if not nome or latitude is None or longitude is None:
        return None

    with get_db() as (cursor, conn):
        cursor.execute(
            "SELECT id FROM mechanics WHERE nome = %s AND latitude = %s AND longitude = %s",
            (nome, latitude, longitude)
        )
        existing = cursor.fetchone()
        if existing:
            mechanic_id = existing['id']
            cursor.execute("""
                UPDATE mechanics SET
                    endereco = COALESCE(%s, endereco),
                    cidade = COALESCE(%s, cidade),
                    estado = COALESCE(%s, estado),
                    telefone = COALESCE(%s, telefone),
                    website = COALESCE(%s, website),
                    descricao = COALESCE(%s, descricao)
                WHERE id = %s
            """, (
                data.get('endereco'), data.get('cidade'), data.get('estado'),
                data.get('telefone'), data.get('website'), data.get('descricao'),
                mechanic_id
            ))
        else:
            cursor.execute("""
                INSERT INTO mechanics
                    (nome, endereco, cidade, estado, latitude, longitude, telefone,
                     website, descricao, especialidades, is_active, is_verified)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, FALSE)
            """, (
                nome, data.get('endereco', ''), data.get('cidade', ''),
                data.get('estado', ''), latitude, longitude,
                data.get('telefone', ''), data.get('website', ''),
                data.get('descricao', ''),
                json.dumps(data.get('especialidades', ['troca_oleo']))
            ))
            mechanic_id = cursor.lastrowid
        return mechanic_id


@mechanics_bp.route('/api/mechanics/<mechanic_id>/favorite', methods=['POST', 'DELETE'])
@jwt_required()
def toggle_favorite(mechanic_id):
    try:
        user_id = get_jwt_identity()
        is_external = not mechanic_id.isdigit()

        if is_external and request.method == 'POST':
            data = request.get_json() or {}
            data['latitude'] = data.get('latitude') or data.get('lat')
            data['longitude'] = data.get('longitude') or data.get('lng')
            new_id = upsert_mechanic(data)
            if not new_id:
                return jsonify(error="Dados insuficientes para salvar mecânico"), 400
            mechanic_id = str(new_id)

        if not mechanic_id.isdigit():
            return jsonify(error="ID inválido. Favoritos só podem ser gerenciados para mecânicos salvos no banco."), 400

        mid = int(mechanic_id)
        with get_db() as (cursor, conn):
            if request.method == 'POST':
                cursor.execute("""
                    INSERT IGNORE INTO mechanic_favorites (user_id, mechanic_id)
                    VALUES (%s, %s)
                """, (user_id, mid))
                return jsonify({
                    "success": True,
                    "message": "Mecânico favoritado",
                    "mechanic_id": mid
                }), 200
            else:
                cursor.execute("""
                    DELETE FROM mechanic_favorites
                    WHERE user_id = %s AND mechanic_id = %s
                """, (user_id, mid))
                return jsonify({"success": True, "message": "Mecânico removido dos favoritos"}), 200

    except Exception as e:
        logger.error(f"Erro ao gerenciar favorito: {e}")
        return jsonify(error="Erro interno"), 500


@mechanics_bp.route('/api/mechanics/favorites', methods=['GET'])
@jwt_required()
def get_favorites():
    try:
        user_id = get_jwt_identity()

        with get_db() as (cursor, conn):
            cursor.execute("""
                SELECT m.* FROM mechanics m
                INNER JOIN mechanic_favorites f ON f.mechanic_id = m.id
                WHERE f.user_id = %s AND m.is_active = TRUE
                ORDER BY f.created_at DESC
            """, (user_id,))

            favorites = cursor.fetchall()

            for mechanic in favorites:
                if mechanic.get('especialidades'):
                    mechanic['especialidades'] = json.loads(mechanic['especialidades'])

            return jsonify({
                "success": True,
                "favorites": favorites
            }), 200

    except Exception as e:
        logger.error(f"Erro ao buscar favoritos: {e}")
        return jsonify(error="Erro interno"), 500
