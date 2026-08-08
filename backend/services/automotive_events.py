# backend/services/automotive_events.py
"""Varredura de eventos automotivos.

Fontes por web scraping:
  - nfeiras.com (calendário de feiras de automobilismo no Brasil)
  - sindirepabrasil.org.br/eventos (feiras e eventos da reparação)
  - diretriz.com.br (promotora de feiras — Autopar, Minasparts, ...)
  - interlagos.com.br (Shopping Interlagos — apenas itens automotivos)
  - Google Search (fallback + eventos Sympla via site:sympla.com.br,
    além de feiras/encontros automotivos em geral)

Se uma fonte falhar, o erro é registrado e não quebra as demais.
Resultados são normalizados num schema comum e cacheados (padrão 6h).
"""
import re
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timezone

import requests
from bs4 import BeautifulSoup

from utils.cache import cache_get_json, cache_set_json

logger = logging.getLogger(__name__)

EVENTS_CACHE_TTL = 6 * 3600  # 6 horas
REQUEST_TIMEOUT = 6
MAX_EVENTS = 150
MAX_GOOGLE_EVENTS = 30

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

# Filtra conteúdos não-automotivos das fontes genéricas
AUTOMOTIVE_KEYWORDS = (
    "automot", "autopar", "automecanika", "automec", "auto", "veicul", "veiculo",
    "automove", "autopec", "pecas", "peca", "reposicao", "reposto", "pneu",
    "mecanic", "oficina", "carro", "caminhao", "truck", "parts", "moto",
    "turbo", "drift", "rally", "corrida", "formula", "eletrocar",
    "fenajeep", "jeep", "suv", "atv", "motoshow", "encontro",
)

GOOGLE_QUERIES = [
    "site:sympla.com.br evento automotivo 2026",
    "site:sympla.com.br encontro de carros 2026",
    "site:sympla.com.br feira autopecas 2026",
    "feira automotiva salao do automovel encontro de carros 2026",
]


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
                return parts[0], "", ""
            if len(parts) > 2:
                return parts[0], "INT", "".join(parts[1:])
            return parts[0], "INT", ""
        return parts[0], "", ""
    return "", "", ""


def _is_automotive(text: str) -> bool:
    """True se o texto citar termos do mundo automotivo."""
    t = (text or "").lower()
    return any(k in t for k in AUTOMOTIVE_KEYWORDS)


def _make_event(*, titulo, url, fonte, fonte_nome, data_inicio=None, data_fim=None,
                cidade="", uf="", local="", descricao=""):
    hoje = date.today().isoformat()
    return {
        "id": f"{fonte}_{abs(hash(titulo.lower() + '|' + url)) % 99999999}",
        "titulo": _clean_text(titulo)[:160],
        "url": (url or "").strip(),
        "data_inicio": data_inicio,
        "data_fim": data_fim,
        "cidade": _clean_text(cidade)[:80],
        "uf": (uf or "").upper(),
        "local": _clean_text(local)[:120],
        "descricao": _clean_text(descricao)[:400],
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


def _extract_google_organic(soup):
    """Extrai resultado orgânico do Google (h3 + url + snippet + datas)."""
    results = []
    for el in soup.select("div.MjjYud, div.tF2Cxc"):
        try:
            link = el.select_one("a[href]")
            if not link:
                continue
            url = link.get("href", "")
            if not url.startswith("http"):
                continue
            if any(dom in url for dom in ("google.", "gstatic", "/redirect?")):
                continue
            h3 = el.select_one("h3")
            titulo = _clean_text(h3.get_text(strip=True))
            if not titulo:
                continue
            snippet = ""
            s = el.select_one(".VwiC3b, .IsZvec")
            if s:
                snippet = _clean_text(s.get_text(" ", strip=True))[:300]
            inicio, fim = _parse_br_dates(snippet)
            results.append(_make_event(
                titulo=titulo,
                url=url,
                data_inicio=inicio,
                data_fim=fim,
                descricao=snippet,
                fonte="google",
                fonte_nome="Google",
            ))
        except Exception:
            continue
    return results


def _scrape_google_events():
    """Busca no Google (orgânico) — cobre Sympla via site: e encontros em geral."""
    events = []
    seen_urls = set()
    for query in GOOGLE_QUERIES:
        if len(events) >= MAX_GOOGLE_EVENTS:
            break
        try:
            resp = requests.get(
                "https://www.google.com.br/search",
                params={"q": query, "hl": "pt-BR", "gl": "br", "num": "15"},
                headers=HEADERS,
                timeout=REQUEST_TIMEOUT,
            )
            if resp.status_code != 200:
                continue
            soup = BeautifulSoup(resp.text, "html.parser")
            for item in _extract_google_organic(soup):
                if item["url"] in seen_urls:
                    continue
                seen_urls.add(item["url"])
                events.append(item)
        except Exception as e:
            logger.debug("Google events falhou (%s): %s", query, e)
    return events


# ─────────────────────────── orquestrador / API ───────────────────────────

SOURCE_RUNNERS = [
    ("nfeas", "NFeiras.com", _scrape_nfeiras),
    ("sindirepa", "Sindirepa Brasil", _scrape_sindirepa),
    ("diretriz", "Diretriz Feiras", _scrape_diretriz),
    ("interlagos", "Shopping Interlagos", _scrape_interlagos),
    ("google", "Google", _scrape_google_events),
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
        try:
            found = runner() or []
            return (slug, name, True, None, found)
        except Exception as e:
            logger.warning("Varredura de eventos %s falhou: %s", slug, e)
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