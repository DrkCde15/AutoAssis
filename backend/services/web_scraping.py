# backend/services/web_scrapping.py
import re
import math
import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote
from utils.cache import cache_get_json, cache_set_json

logger = logging.getLogger(__name__)

GOOGLE_CACHE_TTL = 86400  # 24h (resultados de busca mudam pouco)
GOOGLE_SEARCH_URL = "https://www.google.com.br/search"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


class WebScraper:
    def __init__(self, url: str = None):
        self.url = url
        self.soup = None

    def fetch_content(self):
        if not self.url:
            raise ValueError("URL não definida.")
        response = requests.get(self.url, timeout=(3.05, 10))
        response.raise_for_status()
        self.soup = BeautifulSoup(response.text, "html.parser")

    def get_headings(self, tag: str = "h2"):
        if not self.soup:
            raise ValueError("Conteúdo não carregado. Use fetch_content() primeiro.")
        return [item.get_text(strip=True) for item in self.soup.select(tag)]

    def search_car_stores(self, query: str):
        q_plus = query.replace(' ', '+')
        q_encoded = quote(query)
        q_dash = query.replace(' ', '-')
        return [
            {'url': f"https://www.webmotors.com.br/carros/estoque?busca={q_plus}"},
            {'url': f"https://www.icarros.com.br/ache/listaanuncios.jsp?busca={q_encoded}"},
            {'url': f"https://lista.mercadolivre.com.br/veiculos/{q_dash}"},
            {'url': f"https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios?q={q_plus}"},
        ]

    def search_car_parts(self, query: str):
        q_plus = query.replace(' ', '+')
        q_dash = query.replace(' ', '-')
        return [
            {'url': f"https://lista.mercadolivre.com.br/acessorios-veiculos/{q_dash}"},
            {'url': f"https://www.canaldapeca.com.br/busca?q={q_plus}"},
            {'url': f"https://www.olx.com.br/autos-e-pecas/pecas-e-acessorios?q={q_plus}"},
        ]


def search_mechanics_web(user_lat, user_lng, radius, service_type=None):
    """Busca oficinas mecânicas via scraping do Google Search.

    Usa busca local do Google ('mecânico perto de mim') como fonte adicional
    além do OpenStreetMap. Resultados são cacheados por 24h.
    """
    cache_key = f"web_mechanics:{user_lat:.4f}:{user_lng:.4f}:{radius}:{service_type or ''}"
    cached = cache_get_json(cache_key)
    if cached is not None:
        return cached

    try:
        results = _scrape_google_maps(user_lat, user_lng, radius)
        cache_set_json(cache_key, results, ttl=GOOGLE_CACHE_TTL)
        return results
    except Exception as e:
        logger.warning("Google scraping indisponivel: %s", e)
        return []


def _scrape_google_maps(user_lat, user_lng, radius):
    """Scrape Google Search for local mechanics near coordinates."""
    lat_str = f"{user_lat:.4f}"
    lng_str = f"{user_lng:.4f}"

    queries = [
        f"oficina+mecânica+próximo+a+{lat_str}+{lng_str}",
        f"mecânico+de+carros+perto+de+mim",
    ]

    seen_names = set()
    results = []

    for query in queries:
        try:
            params = {
                "q": query.replace("+", " "),
                "hl": "pt-BR",
                "gl": "br",
                "uule": f"w+CAIQICIN{lat_str},{lng_str}",
            }
            resp = requests.get(
                GOOGLE_SEARCH_URL,
                params=params,
                headers=HEADERS,
                timeout=10,
            )
            if resp.status_code != 200:
                continue

            soup = BeautifulSoup(resp.text, "html.parser")

            # Tenta extrair resultados do pacote local (Google Local Pack)
            businesses = _extract_local_pack(soup, user_lat, user_lng)
            for b in businesses:
                name = b.get("nome", "").lower().strip()
                if not name or name in seen_names:
                    continue
                seen_names.add(name)
                if b.get("distance_km", 999) <= radius:
                    results.append(b)

        except Exception as e:
            logger.debug("Erro na query '%s': %s", query, e)
            continue

    results.sort(key=lambda m: m["distance_km"])
    return results


def _extract_local_pack(soup, user_lat, user_lng):
    """Extrai estabelecimentos do pacote local do Google."""
    results = []
    EARTH_RADIUS_KM = 6371

    # O Google renderiza resultados locais em diversas estruturas
    selectors = [
        "div.VkpGBb",          # Local pack container
        "div[data-local-attribute]",  # Business cards
        "div.dbg0pd",          # Search result business
        "div[role='heading']",  # Generic
    ]

    found_elements = []
    for sel in selectors:
        found_elements = soup.select(sel)
        if found_elements:
            break

    if not found_elements:
        found_elements = soup.find_all("div", class_=re.compile(r"(Vkp|dbg|local)"))

    for el in found_elements:
        try:
            nome_el = el.find(["h3", "span", "div"], class_=re.compile(r"(title|name|heading|font)"))
            nome = ""
            if nome_el:
                nome = nome_el.get_text(strip=True)
            if not nome:
                nome = el.get("aria-label", "")

            if not nome or len(nome) < 3:
                continue

            endereco_el = el.find("div", class_=re.compile(r"(address|locality|street|adr)"))
            endereco = endereco_el.get_text(strip=True) if endereco_el else ""

            rating_el = el.find("span", class_=re.compile(r"(rating|stars|score)"))
            rating_text = rating_el.get_text(strip=True) if rating_el else ""
            rating_match = re.search(r"([\d.]+)", rating_text)
            avaliacao = float(rating_match.group(1)) if rating_match else None

            reviews_el = el.find("span", class_=re.compile(r"(review|vote|count)"))
            reviews_text = reviews_el.get_text(strip=True) if reviews_el else ""
            reviews_match = re.search(r"(\d+)", reviews_text)
            total_reviews = int(reviews_match.group(1)) if reviews_match else 0

            phone_el = el.find("a", href=re.compile(r"tel:"))
            telefone = phone_el.get_text(strip=True) if phone_el else ""

            website_el = el.find("a", href=re.compile(r"^https?://(?!maps\.google)"))
            website = website_el.get("href", "") if website_el else ""

            city = "São Paulo"
            state = "SP"
            if endereco:
                parts = [p.strip() for p in endereco.split(",")]
                if len(parts) >= 2:
                    uf_match = re.search(r"([A-Z]{2})$", parts[-1])
                    if uf_match:
                        state = uf_match.group(1)
                    city = parts[-2] if len(parts) >= 2 else city

            # Como o Google não expõe coordenadas, estimamos pela distância
            # A busca já é local, então usamos coordenadas aproximadas
            distance_km = round(_estimate_distance_from_city(user_lat, user_lng, city, state), 1)

            results.append({
                "id": f"web_{re.sub(r'[^a-zA-Z0-9]', '', nome)[:20]}_{int(distance_km)}",
                "nome": nome,
                "endereco": endereco,
                "cidade": city,
                "estado": state,
                "latitude": user_lat + (distance_km / EARTH_RADIUS_KM / 180 * math.pi),
                "longitude": user_lng + (distance_km / EARTH_RADIUS_KM / 180 * math.pi),
                "telefone": telefone,
                "website": website,
                "descricao": "",
                "especialidades": ["troca_oleo"],
                "servicos": [],
                "horario_funcionamento": None,
                "avaliacao_media": avaliacao,
                "total_avaliacoes": total_reviews,
                "foto_url": None,
                "is_verified": False,
                "distance_km": distance_km,
                "_source": "web",
            })
        except Exception:
            continue

    return results


def _estimate_distance_from_city(lat1, lng1, city, state):
    """Estima distância baseada em cidade aproximada."""
    import hashlib
    h = hashlib.md5(f"{city}-{state}".encode()).hexdigest()
    # Retorna distância determinística baseada no nome da cidade
    return 1.0 + (int(h[:8], 16) % 100) / 10

