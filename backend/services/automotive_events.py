# backend/services/automotive_events.py
"""Varredura de eventos automotivos.

Fontes por web scraping:
  - nfeiras.com (calendário de feiras de automobilismo no Brasil)
  - sindirepabrasil.org.br/eventos (feiras e eventos da reparação)
  - diretriz.com.br (promotora de feiras — Autopar, Minasparts, ...)
  - interlagos.com.br (Shopping Interlagos — apenas itens automotivos)
  - Google Search (fallback + eventos Sympla via site:sympla.com.br,
    além de busca geral por feiras/encontros/exposições automotivas)

Se uma fonte falhar, o erro é registrado e não quebra as demais.
Resultados são normalizados num schema comum e cacheados (padrão 6h).
"""
import re
import os
import base64
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone

import requests
from bs4 import BeautifulSoup

from utils.cache import cache_get_json, cache_set_json
from urllib.parse import quote

logger = logging.getLogger(__name__)

EVENTS_CACHE_TTL = 6 * 3600  # 6 horas
REQUEST_TIMEOUT = 6
MAX_EVENTS = 150
MAX_GOOGLE_EVENTS = 80

WEB_SEARCH_URL = "https://www.bing.com/search"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

MONTHS = {
    "janeiro": 1, "jan": 1, "januar": 1,
    "fevereiro": 2, "fev": 2, "februar": 2,
    "marco": 3, "mar": 3,
    "abril": 4, "abr": 4,
    "maio": 5, "mai": 5,
    "junho": 6, "jun": 6,
    "julho": 7, "jul": 7,
    "agosto": 8, "ago": 8,
    "setembro": 9, "set": 9,
    "outubro": 10, "out": 10,
    "novembro": 11, "nov": 11,
    "dezembro": 12, "dez": 12,
}
_MONTH_ALT = "|".join(sorted(set(MONTHS), key=len, reverse=True))

# Filtra conteúdos não-automotivos das fontes genéricas.
# STRONG: termo sozinho já indica automotivo (carro, peça, marca, etc.).
# WEAK: substantivo de evento ("encontro", "exposição", "feira"...) que só
#   conta SE vier acompanhado de um termo veicular — evita falsos positivos
#   como "Encontro com Patrícia Poeta" ou "Exposição no MASP".
AUTOMOTIVE_STRONG = (
    "automot", "autopar", "automecanika", "automec", "veicul", "veiculo",
    "automove", "autopec", "autop", "pecas", "peca", "reposicao", "reposto",
    "pneu", "mecanic", "oficina", "carro", "carros", "caminhao", "caminhão",
    "truck", "parts", "moto", "motos", "turbo", "drift", "rally", "rali",
    "corrida", "formula", "eletrocar", "fenajeep", "jeep", "suv", "atv",
    "motoshow", "hot wheels", "hotwheel", "diecast", "miniatura", "colecionador",
    "leilao", "leilão", "motor", "trackday", "arrancada", "off road", "off-road",
    "4x4", "jipe", "jipeiro", "kart", "monster", "tuning", "trator", "ônibus",
    "onibus", "pilotagem", "restauracao", "restauração", "garagem", "chassi",
    "motorista", "combustivel", "gasolina", "diesel", "bumper", "carroceria",
    "autodrom",
)
AUTOMOTIVE_WEAK = (
    "encontro", "expo", "exposi", "feira", "salao", "salão", "mostra",
    "show", "feirinha", "antigo", "antiga", "classic", "clássico", "clássicos",
    "clubes", "clube", "encontros", "meet", "meetup",
)
# palavras-veículo usadas para validar os termos WEAK
_VEHICLE_WORDS = (
    "carro", "carros", "veicul", "moto", "caminhao", "caminhão", "auto", "pneu",
    "jeep", "4x4", "trator", "ônibus", "onibus", "bike", "quadriciclo",
    "hot wheels", "diecast", "miniatura", "reboque", "tanque",
)

def _web_queries(location="São Paulo"):
    """Queries do Google: Sympla (plataforma) + buscas gerais amplas + viés local.

    - O ano é calculado dinamicamente (e o próximo, se estivermos no fim do ano).
    - As queries "broad" capturam eventos genéricos (feira/expo/encontro/leilão)
      que antes escapavam (ex.: Hot Wheels, colecionadores, comunidade).
    - As queries "local" incluem a cidade para surfar a aba de Eventos do Google
      e o Google Maps ("Próximos eventos"), que é onde eventos de bairro
      (ex.: Aricanduva)_costumam aparecer.
    """
    year = datetime.now().year
    years = [year]
    if datetime.now().month >= 10:
        years.append(year + 1)

    base = []
    for y in years:
        base += [
            f"site:sympla.com.br evento automotivo {y}",
            f"site:sympla.com.br encontro de carros {y}",
            f"site:sympla.com.br feira autopecas {y}",
        ]

    broad = [
        "eventos automotivos",
        "evento de carros",
        "feira de carros",
        "encontro de carros",
        "exposição de carros",
        "feira auto peças",
        "salão do automóvel",
        "hot wheels evento",
        "hot wheels encontro",
        "leilão de carros",
        "encontro de motos",
        "rally de carros",
        "expo automotiva",
        "feirinha de carros",
    ]

    local = [
        f"eventos de carros em {location}",
        f"feira de carros em {location}",
        f"encontro de carros em {location}",
        f"evento automotivo {location}",
        f"hot wheels {location}",
        f"encontro de carros antigos {location}",
    ]

    # anexa o ano a cada query ampla/local para restringir a eventos atuais
    broad = [f"{q} {year}" for q in broad]
    local = [f"{q} {year}" for q in local]
    return base + broad + local

# Classificação de categoria por palavras-chave (ordem importa: a primeira
# regra que bater define a categoria — específicas antes das genéricas).
CATEGORIA_RULES = [
    ("encontro", ("encontro", "encontros", "meetup", "meet up", "car meeting")),
    ("competicao", ("corrida", "rally", "rali", "drift", "competi", "campeonato",
                    "prova", "copa de", "temporada", "etapa de")),
    ("congresso", ("congresso", "semin", "palestr", "workshop", "forum", "conference")),
    ("feira", ("feira", "autopecas", "autopecas", "autopar", "autop", "reposicao",
               "reposto", "automecanika", "automec", "parts", "expoautopecas",
               "fenatra", "reparacao")),
    ("exposicao", ("exposi", "expo ", "salao", "salao", "mostra", "showroom",
                   "avante", "classic show")),
]

CATEGORIA_LABELS = {
    "feira": "Feira",
    "encontro": "Encontro",
    "competicao": "Competição",
    "exposicao": "Exposição",
    "congresso": "Congresso",
    "outros": "Outros",
}

_ACCENTS_TRANS = str.maketrans(
    "áàâãäéèêëíìîïóòôõöúùûüç",
    "aaaaaeeeeiiiiooooouuuuc",
)


# ─────────────────────── helpers genéricos ───────────────────────


def _clean_text(value):
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def _fetch_html(url: str) -> str:
    resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.text


def _parse_br_dates(text: str):
    """Extrai (data_inicio, data_fim) de textos de data em pt-BR.

    Formatos suportados:
      "06 a 09 de maio de 2026"           -> (2026-05-06, 2026-05-09)
      "21 de julho a 1 de agosto de 2026" -> (2026-07-21, 2026-08-01)
      "19 a 22 agosto 2026"
      "Abril de 2026"                      -> (2026-04-01, 2026-04-30)
    Retorna (None, None) se não for possível parsear.
    """
    if not text:
        return None, None
    t = text.lower()
    t = t.replace("º", "").replace("°", "")
    t = re.sub(r"[^\w\s]", " ", t)   # remove pontuação (inclui º, à, ...)
    t = re.sub(r"\s+", " ", t).strip()

    # 1) período cruzando mês: "21 de julho a 1 de agosto de 2026"
    m = re.search(
        rf"(\d{{1,2}})\s*(?:de\s+)?({_MONTH_ALT})\s*(?:de\s+)?a\s+"
        rf"(\d{{1,2}})\s*(?:de\s+)?({_MONTH_ALT})\s*(?:de\s+)?(20\d{{2}})",
        t,
    )
    if m:
        d1, m1s, d2, m2s, y = m.groups()
        m1, m2 = MONTHS.get(m1s), MONTHS.get(m2s)
        if m1 and m2:
            return f"{y}-{m1:02d}-{int(d1):02d}", f"{y}-{m2:02d}-{int(d2):02d}"

    # 2) mesmo mês: "06 a 09 de maio de 2026"
    m = re.search(
        rf"(\d{{1,2}})\s*(?:de\s+)?a\s+(\d{{1,2}})\s*(?:de\s+)?({_MONTH_ALT})"
        rf"\s*(?:de\s+)?(20\d{{2}})",
        t,
    )
    if m:
        d1, d2, ms, y = m.groups()
        mo = MONTHS.get(ms)
        if mo:
            return f"{y}-{mo:02d}-{int(d1):02d}", f"{y}-{mo:02d}-{int(d2):02d}"

    # 3) data única: "7 de maio de 2026"
    m = re.search(rf"(\d{{1,2}})\s*(?:de\s+)?({_MONTH_ALT})\s*(?:de\s+)?(20\d{{2}})", t)
    if m:
        d, ms, y = m.groups()
        mo = MONTHS.get(ms)
        if mo:
            return f"{y}-{mo:02d}-{int(d):02d}", f"{y}-{mo:02d}-{int(d):02d}"

    # 4) só mês e ano: "Abril de 2026"
    m = re.search(rf"({_MONTH_ALT})\s*(?:de\s+)?(20\d{{2}})", t)
    if m:
        ms, y = m.groups()
        mo = MONTHS.get(ms)
        if mo:
            last = 30 if mo in (4, 6, 9, 11) else (29 if mo == 2 else 31)
            return f"{y}-{mo:02d}-01", f"{y}-{mo:02d}-{last:02d}"
    return None, None


def _extract_city_uf(text: str):
    """Extrai (cidade, uf, local_detalhe) de textos como:
    "Curitiba (PR) - Expotrade Pinhais" | "Fortaleza, Brasil" | "Buenos Aires - Argentina".
    """
    text = _clean_text(text)
    if not text:
        return "", "", ""
    m = re.search(
        r"([A-Za-zÁÃÂÀÉÊÍÓÔÚÛÇáãâàéêíóôúûç'’\-\. ]+?)\s*\(\s*([A-Z]{2})\s*\)",
        text,
    )
    if m:
        cidade = _clean_text(m.group(1))
        uf = m.group(2).upper()
        resto = _clean_text(text[m.end():]).lstrip("- ").strip()
        return cidade, uf, resto or _clean_text(text[:m.start()])
    parts = [p.strip() for p in re.split(r"[,\-]|\s-\s", text) if p.strip()]
    if parts:
        if len(parts) >= 2 and re.fullmatch(r"[A-Z]{2}", parts[1]):
            return parts[0], parts[1].upper(), parts[2] if len(parts) > 2 else ""
        if len(parts) >= 2:
            # "Fortaleza, Brasil" (UF não informada) ou "Buenos Aires - Argentina" (exterior)
            if parts[1].lower() == "brasil":
                return parts[0], _uf_from_city(parts[0]), ""
            if len(parts) > 2:
                return parts[0], "INT", "".join(parts[1:])
            return parts[0], "INT", ""
        # token único: só é cidade se reconhecida no mapeamento (evita
        # poluir o campo com o snippet inteiro quando não há localização)
        cidade = parts[0]
        uf = _uf_from_city(cidade)
        return (cidade, uf, "") if uf else ("", "", "")
    return "", "", ""


# Capitais e principais cidades → UF (usado quando a fonte não informa a UF)
_CITY_TO_UF = {
    # Norte
    "rio branco": "AC", "macapa": "AP", "manaus": "AM", "belem": "PA",
    "porto velho": "RO", "boa vista": "RR", "palmas": "TO",
    # Nordeste
    "maceio": "AL", "salvador": "BA", "fortaleza": "CE", "sao luis": "MA",
    "joao pessoa": "PB", "recife": "PE", "teresina": "PI", "natal": "RN",
    "aracaju": "SE", "feira de santana": "BA",
    # Centro-Oeste
    "brasilia": "DF", "goiania": "GO", "cuiaba": "MT", "campo grande": "MS",
    # Sudeste
    "vitoria": "ES", "belo horizonte": "MG", "contagem": "MG",
    "uberlancia": "MG", "juiz de fora": "MG", "sao paulo": "SP",
    "campinas": "SP", "santos": "SP", "guarulhos": "SP",
    "osasco": "SP", "sao jose dos campos": "SP", "ribeirao preto": "SP",
    "sorocaba": "SP", "rio de janeiro": "RJ", "niteroi": "RJ",
    "sao goncalo": "RJ", "nova iguacu": "RJ", "duque de caxias": "RJ",
    # Sul
    "curitiba": "PR", "londrina": "PR", "maringa": "PR", "cascavel": "PR",
    "florianopolis": "SC", "joinville": "SC", "blumenau": "SC",
    "criciuma": "SC", "porto alegre": "RS", "caxias do sul": "RS",
    "pelotas": "RS", "santa maria": "RS", "passo fundo": "RS",
    "novo hamburgo": "RS", "gramado": "RS", "canela": "RS",
}


def _uf_from_city(cidade: str) -> str:
    """Infere a UF a partir do nome da cidade (quando a fonte não informa)."""
    key = (cidade or "").strip().lower().translate(_ACCENTS_TRANS)
    return _CITY_TO_UF.get(key, "")


def _is_automotive(text: str) -> bool:
    """True se o texto for claramente do mundo automotivo.

    Termos STRONG validam sozinhos; termos WEAK (encontro, exposição, feira...)
    só contam acompanhados de uma palavra-veículo, para evitar ruído como
    'Encontro com Patrícia Poeta' ou 'Exposição no MASP'.
    """
    t = (text or "").lower()
    if any(k in t for k in AUTOMOTIVE_STRONG):
        return True
    if any(w in t for w in AUTOMOTIVE_WEAK) and any(v in t for v in _VEHICLE_WORDS):
        return True
    return False


def _classify_category(titulo="", descricao="", local=""):
    """Classifica o evento numa categoria amigável de filtro.

    Categorias: feira, encontro, competicao, exposicao, congresso, outros.
    A análise usa título + descrição + local (a primeira regra que bater vence).
    """
    text = " ".join([titulo, descricao, local]).lower().translate(_ACCENTS_TRANS)
    for categoria, keywords in CATEGORIA_RULES:
        if any(k in text for k in keywords):
            return categoria
    return "outros"


def _make_event(*, titulo, url, fonte, fonte_nome, data_inicio=None, data_fim=None,
                cidade="", uf="", local="", descricao=""):
    hoje = date.today().isoformat()
    titulo_clean = _clean_text(titulo)[:160]
    cidade_clean = _clean_text(cidade)[:80]
    return {
        "id": f"{fonte}_{abs(hash(titulo.lower() + '|' + url)) % 99999999}",
        "titulo": titulo_clean,
        "url": (url or "").strip(),
        "data_inicio": data_inicio,
        "data_fim": data_fim,
        "cidade": cidade_clean,
        "uf": ((uf or "").upper()) or _uf_from_city(cidade_clean),
        "local": _clean_text(local)[:120],
        "descricao": _clean_text(descricao)[:400],
        "categoria": _classify_category(titulo_clean, _clean_text(descricao)[:400], _clean_text(local)[:120]),
        "categoria_label": "",
        "fonte": fonte,
        "fonte_nome": fonte_nome,
        "imagem": None,
        "passado": bool(data_inicio and data_inicio < hoje),
    }


# ─────────────────────────────── fontes ───────────────────────────────


def _scrape_nfeiras():
    """https://www.nfeiras.com/automobilismo/brasil — calendário de feiras."""
    soup = BeautifulSoup(_fetch_html("https://www.nfeiras.com/automobilismo/brasil"), "html.parser")
    events = []
    for card in soup.select("article.card-tradeShow"):
        try:
            a = card.select_one("a.text-dark")
            if not a:
                continue
            titulo = _clean_text(a.get_text())
            data_inicio = data_fim = None
            for t in card.select("time"):
                classes = t.get("class") or []
                if "dtstart" in classes:
                    data_inicio = (t.get("datetime") or "")[:10] or None
                if "dtend" in classes:
                    data_fim = (t.get("datetime") or "")[:10] or None
            bloco = card.select_one(".mb-3")
            texto_local = ""
            if bloco:
                linhas = [l.strip() for l in bloco.get_text("|", strip=True).split("|") if l.strip()]
                if len(linhas) >= 2:
                    # última linha costuma ser "Cidade, Brasil"
                    cidade, uf, _ = _extract_city_uf(linhas[-1])
                    texto_local = " - ".join(linhas[:-1])
                    if not uf and len(linhas) > 2:
                        _, uf, _ = _extract_city_uf(" ".join(linhas[:-1]))
                else:
                    cidade, uf, _ = _extract_city_uf(linhas[0] if linhas else "")
            else:
                cidade, uf = "", ""
            events.append(_make_event(
                titulo=titulo,
                url=a.get("href") or card.get("data-href") or "",
                data_inicio=data_inicio,
                data_fim=data_fim,
                cidade=cidade,
                uf=uf or "",
                local=texto_local,
                fonte="nfeas",
                fonte_nome="NFeiras.com",
            ))
        except Exception:
            continue
    return events


def _scrape_sindirepa():
    """https://sindirepabrasil.org.br/eventos — feiras da reparação automotiva."""
    soup = BeautifulSoup(_fetch_html("https://sindirepabrasil.org.br/eventos/"), "html.parser")
    events = []
    for card in soup.select(".se-card"):
        try:
            h3 = card.select_one("h3")
            if not h3:
                continue
            titulo = _clean_text(h3.get_text())
            desc_el = card.select_one(".se-desc")
            descricao = _clean_text(desc_el.get_text()) if desc_el else ""
            data_text = ""
            local_text = ""
            for p in card.select("p.se-info"):
                icon = p.select_one("span.dashicons")
                txt = _clean_text(p.get_text(" ", strip=True))
                if icon:
                    cls = " ".join(icon.get("class") or [])
                    if "calendar" in cls:
                        data_text = txt
                    elif "location" in cls:
                        local_text = txt
                elif not data_text:
                    data_text = txt
            if not data_text:
                data_text = _clean_text(card.get_text(" "))
            inicio, fim = _parse_br_dates(data_text)
            cidade, uf, local = _extract_city_uf(local_text)
            events.append(_make_event(
                titulo=titulo,
                url="https://sindirepabrasil.org.br/eventos/",
                data_inicio=inicio,
                data_fim=fim,
                cidade=cidade,
                uf=uf,
                local=local,
                descricao=descricao,
                fonte="sindirepa",
                fonte_nome="Sindirepa Brasil",
            ))
        except Exception:
            continue
    return events


def _scrape_diretriz():
    """Feiras da Diretriz — mantendo apenas o segmento automotivo.

    A página é Elementor: cada card tem um h2.elementor-heading-title
    (título), um widget-text-editor com "Cidade / UF" e "data | ano" e um
    botão "Visitar site" com o link.
    """
    soup = BeautifulSoup(_fetch_html("https://diretriz.com.br/proximas-feiras/"), "html.parser")
    events = []
    for h2 in soup.select("h2.elementor-heading-title"):
        titulo = _clean_text(h2.get_text())
        if not titulo or not _is_automotive(titulo):
            continue
        # sobe até o bloco ".e-con" que contém o editor de texto
        node = h2
        editor = None
        for _ in range(8):
            node = node.parent
            if node is None:
                break
            editor = node.select_one(".elementor-widget-text-editor")
            if editor:
                break
        if not editor:
            continue
        txt = _clean_text(editor.get_text(" "))
        m_loc = re.search(r"([A-ZÁ-Ú][A-Za-zÁ-Úá-ú'\- ]+?)\s*/\s*([A-Z]{2})", txt)
        cidade = m_loc.group(1).strip() if m_loc else ""
        uf = m_loc.group(2).strip() if m_loc else ""
        inicio, fim = _parse_br_dates(txt)
        link_a = None
        parent = editor.parent
        for _ in range(8):
            if parent is None:
                break
            link_a = parent.select_one("a.elementor-button")
            if link_a:
                break
            parent = parent.parent
        events.append(_make_event(
            titulo=titulo,
            url=link_a.get("href") if link_a else "https://diretriz.com.br",
            data_inicio=inicio,
            data_fim=fim,
            cidade=cidade,
            uf=uf,
            local="",
            descricao=txt[:300],
            fonte="diretriz",
            fonte_nome="Diretriz Feiras",
        ))
    return events


def _scrape_interlagos():
    """Shopping Interlagos — seção ACONTECE (só itens automotivos)."""
    soup = BeautifulSoup(_fetch_html("https://www.interlagos.com.br/"), "html.parser")
    events = []
    for thumb in soup.select("#carousel-noticias .thumbnail"):
        try:
            h4 = thumb.select_one(".caption h4")
            if not h4:
                continue
            titulo = _clean_text(h4.get_text())
            if not _is_automotive(titulo):
                continue
            a = thumb.select_one("a")
            url = a.get("href") if a else ""
            if url.startswith("/"):
                url = "https://www.interlagos.com.br" + url
            events.append(_make_event(
                titulo=titulo,
                url=url,
                cidade="São Paulo",
                uf="SP",
                local="Shopping Interlagos",
                descricao="Shopping Interlagos",
                fonte="interlagos",
                fonte_nome="Shopping Interlagos",
            ))
        except Exception:
            continue
    return events


def _is_bot_page(html: str) -> bool:
    """Detecta páginas de bloqueio/CAPTCHA do Google (devolve 200 mas sem resultados)."""
    markers = (
        "nosso sistema detectou", "verificação de segurança", "unusual traffic",
        "digite os caracteres", "our systems have detected", "before you continue",
        "captcha", "robots", "sistema detectou tráfego incomum",
    )
    low = (html or "").lower()
    return any(m in low for m in markers)


# Domínios de plataformas de evento — isentos da exigência de data (já são
# eventos por definição) e priorizados na busca web.
EVENT_DOMAINS = (
    "sympla", "eventbrite", "feverup", "fever", "facebook.com/events",
    "meetup.com", "ingresso", "bileto", "guiaeventos", "eventos.com.br",
    "wikievents", "loominee", "even3", "tickets", "lewear", "vamos",
)
# Domínios que nunca são eventos — descartados da busca web.
NON_EVENT_DOMAINS = (
    "wikipedia", "wikimedia", "youtube.com", "youtu.be", "gov.br", "gov",
    "nyc.gov", "microsoft", "bing.com", "googleusercontent", "amazon",
    "mercadolivre", "olx", "instagram.com", "twitter.com", "x.com",
    "linkedin.com", "tiktok", "pinterest", "reddit.com",
)


def _is_event_domain(url: str) -> bool:
    u = (url or "").lower()
    return any(d in u for d in EVENT_DOMAINS)


def _is_blocked_domain(url: str) -> bool:
    u = (url or "").lower()
    return any(d in u for d in NON_EVENT_DOMAINS)


def _decode_search_redirect(href: str) -> str:
    """Decodifica URLs de redirecionamento do Bing (`/ck/a?...&u=a1<base64>`).

    O Bing envolve o link real num redirecionador; o alvo vem em base64 no
    parâmetro `u=a1...`. Sem isso, todos os links apontariam para bing.com.
    """
    if not href or "bing.com/ck/a" not in href:
        return href
    m = re.search(r"u=a1([^&]+)", href)
    if not m:
        return href
    try:
        s = m.group(1)
        s += "=" * (-len(s) % 4)
        dec = base64.urlsafe_b64decode(s).decode("utf-8", "ignore")
        if dec.startswith("http"):
            return dec
    except Exception:
        pass
    return href


def _extract_event_blocks(soup, fonte_nome="Busca Web"):
    """Extrai blocos de evento de uma SERP (Bing).

    O Bing renderiza resultados server-side em `li.b_algo` (não exige JS, ao
    contrário do Google que devolve um interstitial "enablejs"). Filtra
    não-automotivos e extrai data/cidade do título+snippet.
    """
    results = []
    for el in soup.select("li.b_algo"):
        try:
            a = el.select_one("h2 a")
            if not a:
                continue
            url = _decode_search_redirect(a.get("href", ""))
            if not url.startswith("http"):
                continue
            if any(d in url for d in ("bing.com", "microsoft.com", "msn.com", "live.com")):
                continue
            if _is_blocked_domain(url):
                continue

            titulo = _clean_text(a.get_text(strip=True))
            if not titulo or len(titulo) < 3:
                continue

            snippet_el = el.select_one(".b_caption p, p")
            snippet = _clean_text(snippet_el.get_text(" ", strip=True)) if snippet_el else ""

            raw = f"{titulo} | {snippet}"
            if not _is_automotive(raw):
                continue

            cidade, uf, local = _extract_city_uf(snippet) if snippet else ("", "", "")
            inicio, fim = _parse_br_dates(raw)
            # Evento de verdade tem data; plataformas de evento são isentas.
            if not _is_event_domain(url) and inicio is None:
                continue
            results.append(_make_event(
                titulo=titulo,
                url=url,
                data_inicio=inicio,
                data_fim=fim,
                cidade=cidade,
                uf=uf,
                local=local,
                descricao=snippet,
                fonte="web",
                fonte_nome=fonte_nome,
            ))
        except Exception:
            continue
    return results


def _scrape_bing_events():
    """Busca web via Bing (último fallback, sem custo, sujeito a bloqueio).

    O Google exige JS (interstitial "enablejs"); o Bing ainda serve o HTML dos
    resultados sem JS. É o fallback quando o Playwright e a Brave API falham.
    """
    queries = _web_queries()

    def _search(query):
        try:
            resp = requests.get(
                WEB_SEARCH_URL,
                params={"q": query, "setlang": "pt-BR", "cc": "BR", "count": "20"},
                headers=HEADERS,
                timeout=REQUEST_TIMEOUT,
            )
            if resp.status_code != 200:
                return []
            if _is_bot_page(resp.text):
                logger.warning("Bing retornou bloqueio para '%s'", query)
                return []
            soup = BeautifulSoup(resp.text, "html.parser")
            return _extract_event_blocks(soup)
        except Exception as e:
            logger.debug("Busca web falhou (%s): %s", query, e)
            return []

    events = []
    seen_urls = set()
    with ThreadPoolExecutor(max_workers=min(len(queries), 12)) as pool:
        futures = [pool.submit(_search, q) for q in queries]
        for fut in as_completed(futures):
            for item in fut.result() or []:
                if len(events) >= MAX_GOOGLE_EVENTS:
                    break
                if item["url"] in seen_urls:
                    continue
                seen_urls.add(item["url"])
                events.append(item)
    return events


BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"


def _parse_iso_date(value):
    """Tenta extrair YYYY-MM-DD de um timestamp ISO (ex.: page_age da Brave)."""
    if not value:
        return None
    m = re.match(r"(\d{4}-\d{2}-\d{2})", str(value))
    if m:
        try:
            date.fromisoformat(m.group(1))
            return m.group(1)
        except ValueError:
            return None
    return None


def _scrape_brave_events(api_key: str):
    """Busca web via Brave Search API (JSON estruturado, sem desafio de JS).

    Retorna resultados muito mais limpos e estáveis que o scraping de SERPs.
    Requer BRAVE_API_KEY. Usa só as queries genéricas/localizadas (as queries
    `site:sympla` são cobertas pelas fontes diretas), para economizar a cota
    gratuita (~2000 consultas/mês).
    """
    queries = [q for q in _web_queries() if "site:sympla" not in q]

    def _search(query):
        try:
            resp = requests.get(
                BRAVE_SEARCH_URL,
                params={
                    "q": query,
                    "country": "BR",
                    "search_lang": "pt-BR",
                    "count": "20",
                    "safesearch": "moderate",
                },
                headers={
                    "X-Subscription-Token": api_key,
                    "Accept": "application/json",
                },
                timeout=REQUEST_TIMEOUT,
            )
            if resp.status_code != 200:
                logger.warning("Brave API status %s para '%s'", resp.status_code, query)
                return []
            data = resp.json() or {}
            results = []
            for item in (data.get("web") or {}).get("results") or []:
                try:
                    url = (item.get("url") or "").strip()
                    if not url.startswith("http"):
                        continue
                    if _is_blocked_domain(url):
                        continue
                    titulo = _clean_text(item.get("title", ""))
                    if not titulo or len(titulo) < 3:
                        continue
                    snippet = _clean_text(item.get("description", ""))
                    raw = f"{titulo} | {snippet}"
                    if not _is_automotive(raw):
                        continue
                    cidade, uf, local = _extract_city_uf(snippet) if snippet else ("", "", "")
                    inicio = _parse_iso_date(item.get("page_age") or item.get("age")) \
                        or _parse_br_dates(raw)[0]
                    # Evento de verdade tem data; plataformas de evento são isentas.
                    if not _is_event_domain(url) and inicio is None:
                        continue
                    results.append(_make_event(
                        titulo=titulo,
                        url=url,
                        data_inicio=inicio,
                        data_fim=None,
                        cidade=cidade,
                        uf=uf,
                        local=local,
                        descricao=snippet,
                        fonte="web",
                        fonte_nome="Brave Search",
                    ))
                except Exception:
                    continue
            return results
        except Exception as e:
            logger.debug("Brave falhou (%s): %s", query, e)
            return []

    events = []
    seen_urls = set()
    with ThreadPoolExecutor(max_workers=min(len(queries), 12)) as pool:
        futures = [pool.submit(_search, q) for q in queries]
        for fut in as_completed(futures):
            for item in fut.result() or []:
                if len(events) >= MAX_GOOGLE_EVENTS:
                    break
                if item["url"] in seen_urls:
                    continue
                seen_urls.add(item["url"])
                events.append(item)
    return events


def _scrape_web_playwright():
    """Busca web via navegador real (Playwright) — alternativa sem custo à Brave API.

    Requisições HTTP puras às SERPs caem em captcha ("enablejs"); acessando a
    busca por um Chromium headless com User-Agent e locale pt-BR, o Bing serve o
    HTML renderizado com `li.b_algo`. É o equivalente ao anti-blocking que o
    Crawlee aplicaria — porém com Playwright direto (o backend do Crawlee não tem
    wheel para o Python 3.13 deste ambiente).
    """
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        logger.debug("[Events] Playwright indisponível — busca web via browser pulada.")
        return []

    queries = _web_queries()
    ua = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
    events = []
    seen = set()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"]
            )
            ctx = browser.new_context(
                user_agent=ua, locale="pt-BR", viewport={"width": 1280, "height": 800}
            )
            for q in queries:
                try:
                    page = ctx.new_page()
                    page.goto(
                        WEB_SEARCH_URL + "?q=" + quote(q),
                        wait_until="domcontentloaded",
                        timeout=30000,
                    )
                    try:
                        page.wait_for_selector("li.b_algo", timeout=8000)
                    except Exception:
                        pass
                    html = page.content()
                    page.close()
                except Exception as e:
                    logger.debug("[Events] Playwright query falhou (%s): %s", q, e)
                    continue
                for item in _extract_event_blocks(BeautifulSoup(html, "html.parser")):
                    key = (item["titulo"].lower(), item["url"])
                    if key in seen:
                        continue
                    seen.add(key)
                    events.append(item)
                    if len(events) >= MAX_GOOGLE_EVENTS:
                        break
            ctx.close()
            browser.close()
    except Exception as e:
        logger.warning("[Events] Playwright indisponível: %s", e)
        return []
    return events[:MAX_GOOGLE_EVENTS]


def _scrape_web_events():
    """Canal de busca web: Playwright (browser, sem custo) -> Brave API -> Bing HTTP.

    O Playwright é a fonte primária: lê a SERP renderizada sem cair em captcha.
    A Brave Search API só entra se BRAVE_API_KEY estiver configurada; o Bing HTTP
    é o último fallback (sem custo, porém sujeito a bloqueio).
    """
    events = _scrape_web_playwright()
    if events:
        return events
    api_key = os.getenv("BRAVE_API_KEY")
    if api_key:
        events = _scrape_brave_events(api_key)
        if events:
            return events
        logger.warning("[Events] Brave Search vazio/indisponível — usando fallback Bing.")
    return _scrape_bing_events()


# ─────────────────────────── orquestrador / API ───────────────────────────

SOURCE_RUNNERS = [
    ("nfeas", "NFeiras.com", _scrape_nfeiras),
    ("sindirepa", "Sindirepa Brasil", _scrape_sindirepa),
    ("diretriz", "Diretriz Feiras", _scrape_diretriz),
    ("interlagos", "Shopping Interlagos", _scrape_interlagos),
    ("web", "Busca Web", _scrape_web_events),
]


def scan_automotive_events(force=False):
    """Executa toda a varredura de eventos automotivos.

    Retorna dict {events, sources, scanned_at, cache_ttl_seconds}.
    Resultado é cacheado por 6 horas (forçar com force=True).
    """
    cache_key = "automotive_events:v1"
    if not force:
        cached = cache_get_json(cache_key)
        if cached is not None:
            return cached

    scanned_at = datetime.now(timezone.utc).isoformat()
    today = date.today().isoformat()
    sources_stats = []
    all_events = []

    def _run_one(slug, name, runner):
        start = datetime.now(timezone.utc)
        logger.info("[Events] Iniciando varredura da fonte %s (%s)", slug, name)
        try:
            found = runner() or []
            elapsed = (datetime.now(timezone.utc) - start).total_seconds()
            logger.info(
                "[Events] Fonte %s concluída: %d evento(s) em %.2fs",
                slug, len(found), elapsed,
            )
            return (slug, name, True, None, found)
        except Exception as e:
            elapsed = (datetime.now(timezone.utc) - start).total_seconds()
            logger.warning("Varredura de eventos %s falhou após %.2fs: %s", slug, elapsed, e)
            return (slug, name, False, str(e)[:200], [])

    with ThreadPoolExecutor(max_workers=len(SOURCE_RUNNERS)) as pool:
        futures = [pool.submit(_run_one, *cfg) for cfg in SOURCE_RUNNERS]
        for fut in as_completed(futures):
            try:
                slug, name, ok, err, found = fut.result()
            except Exception as e:
                logger.error("Erro interno na varredura de %s: %s", slug, e)
                continue
            sources_stats.append({
                "slug": slug,
                "nome": name,
                "ok": ok,
                "error": err,
                "count": len(found),
            })
            for ev in found:
                if ev.get("passado"):
                    continue
                all_events.append(ev)

    # deduplicação por (titulo min + data_inicio) — fontes indexam o mesmo
    # evento com URLs diferentes (ex.: NFeiras x Sindirepa)
    seen = set()
    deduped = []
    for ev in all_events:
        key = (ev["titulo"].lower(), ev["data_inicio"] or ev["url"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(ev)

    def _sort_key(ev):
        return (0, ev["data_inicio"] or "9999") if ev["data_inicio"] else (1, ev["titulo"].lower())

    deduped.sort(key=_sort_key)
    for ev in deduped:
        ev["categoria_label"] = CATEGORIA_LABELS.get(ev["categoria"], ev["categoria"])
    payload = {
        "success": True,
        "count": len(deduped[:MAX_EVENTS]),
        "events": deduped[:MAX_EVENTS],
        "sources": sources_stats,
        "scanned_at": scanned_at,
        "cache_ttl_seconds": EVENTS_CACHE_TTL,
    }
    cache_set_json(cache_key, payload, ttl=EVENTS_CACHE_TTL)
    return payload


def filter_events(events, uf=None, q=None, categoria=None, periodo=None):
    """Aplica os filtros da busca de eventos (usado pela rota /api/events/automotive).

    - uf       : UF (BR, maiúscula) ou "INT" para internacionais
    - q        : termo livre no título/descrição/cidade/local
    - categoria: feira | encontro | competicao | exposicao | congresso | outros
    - periodo  : "30" | "90" | "ano" | "todos" (padrão: "todos" → futuros já
                 filtrados na varredura)
    Resultado é ordenado por data e cortado no limite global.
    """
    result = list(events)

    if uf:
        result = [e for e in result if (e.get("uf") or "").upper() == uf.upper()]

    if q:
        q = q.lower()
        result = [
            e for e in result
            if q in (e.get("titulo") or "").lower()
            or q in (e.get("descricao") or "").lower()
            or q in (e.get("cidade") or "").lower()
            or q in (e.get("local") or "").lower()
        ]

    if categoria:
        result = [e for e in result if (e.get("categoria") or "") == categoria]

    if periodo and periodo != "todos":
        today = date.today()
        if periodo == "ano":
            cutoff_start, cutoff_end = today, date(today.year, 12, 31)
        else:
            try:
                cutoff_end = today + timedelta(days=int(periodo))
            except (TypeError, ValueError):
                cutoff_end = None
            cutoff_start = today
        if cutoff_end:
            result = [
                e for e in result
                if not e.get("data_inicio")
                or cutoff_start <= date.fromisoformat(e["data_inicio"]) <= cutoff_end
            ]

    result.sort(key=lambda ev: (
        0, ev["data_inicio"] or "9999"
    ) if ev["data_inicio"] else (1, ev["titulo"].lower()))

    return result[:MAX_EVENTS]