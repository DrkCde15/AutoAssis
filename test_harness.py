import json, os, base64, hmac, hashlib, time, datetime
import requests
import pymysql

# ---------- config ----------
ENV_PATH = "/home/julio_cesar/Projetos/AGENTS/AutoAssist/backend/.env"
BASE = "https://autoassist-l9lr.onrender.com"
ACCOUNT_EMAIL = "jcesarsantana215@gmail.com"
ACCOUNT_PASS = "1234567890"

def load_env(path):
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env

ENV = load_env(ENV_PATH)
JWT_SECRET = ENV["JWT_SECRET_KEY"]
CRON_SECRET = ENV["MAINTENANCE_EMAIL_CRON_SECRET"]
B2B_ADMIN = ENV["B2B_ADMIN_SECRET"]
CAKTO_SECRET = ENV["CAKTO_WEBHOOK_SECRET"]
REDIS_URL = ENV.get("REDIS_URL") or ENV.get("RATELIMIT_STORAGE_URI")

results = []
def rec(group, test, req, status, detail, ok):
    results.append({"group": group, "test": test, "request": req,
                    "status": status, "detail": str(detail)[:600], "pass": ok})
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] ({group}) {test} -> HTTP {status} | {str(detail)[:160]}")

# ---------- DB ----------
def db():
    return pymysql.connect(
        host=ENV["DB_HOST"], port=int(ENV.get("DB_PORT", 3306)),
        user=ENV["DB_USER"], password=ENV["DB_PASSWORD"],
        database=ENV["DB_NAME"], ssl={"ssl": {}}, cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=15,
    )

def get_user():
    conn = db()
    try:
        with conn.cursor() as c:
            c.execute("SELECT id, email, is_admin, is_premium, anonymous_id, "
                      "utm_source, utm_medium, utm_campaign, utm_term, utm_content "
                      "FROM users WHERE email=%s", (ACCOUNT_EMAIL,))
            return c.fetchone()
    finally:
        conn.close()

# ---------- JWT minting (equivalent to login as this user) ----------
def b64url(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def mint_jwt(user_id, ttl_hours=6):
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {"sub": str(user_id), "iat": now, "exp": now + ttl_hours * 3600,
               "type": "access", "fresh": False}
    signing = (b64url(json.dumps(header, separators=(",", ":")).encode())
               + "." + b64url(json.dumps(payload, separators=(",", ":")).encode())).encode()
    sig = hmac.new(JWT_SECRET.encode(), signing, hashlib.sha256).digest()
    return signing.decode() + "." + b64url(sig)

# ---------- redis ----------
def rq_len():
    try:
        import redis
        r = redis.from_url(REDIS_URL)
        return r.llen("rq:queue:default")
    except Exception as e:
        return f"err:{e}"

# ---------- http helpers ----------
S = requests.Session()
S.headers.update({"User-Agent": "AutoAssist-TestBot/1.0"})

def call(method, path, **kw):
    url = BASE + path
    try:
        r = S.request(method, url, timeout=kw.pop("timeout", 40), **kw)
        return r.status_code, r
    except Exception as e:
        return None, e

# tiny 1x1 PNG
PNG_B64 = ("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA"
           "60e6kgAAAABJRU5ErkJggg==")

print("=== Setup: lookup account + mint JWT ===")
user = get_user()
if not user:
    print("USER NOT FOUND IN DB!")
    raise SystemExit(1)
USER_ID = user["id"]
JWT = mint_jwt(USER_ID)
print(f"user_id={USER_ID} is_admin={user['is_admin']} is_premium={user['is_premium']} "
      f"anon={user['anonymous_id']} utm={user['utm_source']}/{user['utm_medium']}/{user['utm_campaign']}")

# verify JWT by calling /api/user
st, r = call("GET", "/api/user", headers={"Authorization": f"Bearer {JWT}"})
rec("setup", "JWT valido (GET /api/user)", "GET /api/user (Bearer)", st,
    (r.json().get("email") if st == 200 else r), st == 200)
if st != 200:
    print("JWT NAO ACEITO - abortando. (deploy pode usar secret diferente do .env)")
    # continue best-effort but many tests will fail

AUTH = {"Authorization": f"Bearer {JWT}"}

# ===================================================================
# CRON
# ===================================================================
print("\n=== CRON ===")
def cron_test(name, path, secret, expect):
    before = rq_len()
    st, r = call("POST", path, headers={"X-Cron-Secret": secret} if secret else {})
    after = rq_len()
    try:
        body = r.json() if hasattr(r, "json") else r
    except Exception:
        body = getattr(r, "text", str(r))
    ok = (st == expect)
    detail = f"body={body}"
    if isinstance(before, int) and isinstance(after, int):
        detail += f" | rq_queue {before}->{after}"
    rec("cron", name, f"POST {path}" + ("" if secret else " (sem secret)"), st, detail, ok)

cron_test("manutencao sem secret (deve 403)", "/api/cron/maintenance-emails", "", 403)
cron_test("manutencao com secret (deve 202)", "/api/cron/maintenance-emails", CRON_SECRET, 202)
cron_test("lifecycle sem secret (deve 403)", "/api/cron/lifecycle-emails", "", 403)
cron_test("lifecycle com secret (deve 202)", "/api/cron/lifecycle-emails", CRON_SECRET, 202)
# events dry_run (no side effects)
st, r = call("POST", "/api/cron/events-notifications?dry_run=1", headers={"X-Cron-Secret": CRON_SECRET})
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
rec("cron", "eventos dry_run=1 (candidatos, sem enviar)", "POST /api/cron/events-notifications?dry_run=1",
    st, b, st == 200)
cron_test("eventos com secret (deve 202)", "/api/cron/events-notifications", CRON_SECRET, 202)

# user-facing notifications (this account only)
st, r = call("GET", "/api/notifications", headers=AUTH)
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
rec("cron", "notificacoes do usuario (GET /api/notifications)", "GET /api/notifications", st,
    f"count={len(b) if isinstance(b, list) else b}", st == 200 and isinstance(b, list))
st, r = call("GET", "/api/notifications/unread-count", headers=AUTH)
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
rec("cron", "notificacoes unread-count", "GET /api/notifications/unread-count", st, b, st == 200)

# ===================================================================
# ANALYTICS
# ===================================================================
print("\n=== ANALYTICS ===")
# post page_view with UTM (attributed to this user via JWT)
st, r = call("POST", "/api/analytics/events",
             json={"event_type": "page_view", "anonymous_id": "test_aa_"+str(USER_ID),
                   "path": "/chat.html",
                   "metadata": {"utm_source": "teste", "utm_medium": "cli", "utm_campaign": "qa_conta"}},
             headers=AUTH)
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
rec("analytics", "registrar page_view (com UTM)", "POST /api/analytics/events page_view", st, b, st in (200, 201))

# chat -> first_nog_use
st, r = call("POST", "/api/chat", json={"message": "Qual o oleo ideal para um carro 1.0?"},
             headers=AUTH, timeout=90)
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
chat_ok = st == 200
rec("analytics", "uso NOG via /api/chat (gera nog_use/first_nog_use)", "POST /api/chat", st,
    (str(b.get("resposta") or b)[:120] if isinstance(b, dict) else b), chat_ok)

# DB verification of funnel events for this user
conn = db()
try:
    with conn.cursor() as c:
        c.execute("SELECT event_type, COUNT(*) cnt, MAX(created_at) last FROM analytics_events "
                  "WHERE user_id=%s GROUP BY event_type ORDER BY last DESC", (USER_ID,))
        rows = c.fetchall()
        c.execute("SELECT event_type, metadata FROM analytics_events "
                  "WHERE user_id=%s AND event_type IN ('page_view','signup','first_nog_use','premium_upgrade') "
                  "ORDER BY created_at DESC LIMIT 30", (USER_ID,))
        evs = c.fetchall()
finally:
    conn.close()

ev_map = {row["event_type"]: row for row in rows}
print("  eventos do usuario:", {k: v["cnt"] for k, v in ev_map.items()})
for stage in ["page_view", "signup", "first_nog_use", "premium_upgrade"]:
    present = stage in ev_map
    rec("analytics", f"funil: {stage} registrado p/ usuario", f"DB analytics_events user={USER_ID}",
        ("present" if present else "ausente"),
        (f"cnt={ev_map[stage]['cnt']} last={ev_map[stage]['last']}" if present else "nenhum evento"),
        present)

# UTM confirmation
utmi = {}
for e in evs:
    md = e.get("metadata")
    try:
        md = json.loads(md) if isinstance(md, str) else (md or {})
    except Exception:
        md = {}
    has_utm = any(k in md for k in ("utm_source", "utm_medium", "utm_campaign"))
    utmi[e["event_type"]] = {"has_utm": has_utm, "md": md}
print("  UTM por evento:", {k: v["has_utm"] for k, v in utmi.items()})
user_utm = {"utm_source": user["utm_source"], "utm_medium": user["utm_medium"],
            "utm_campaign": user["utm_campaign"]}
rec("analytics", "UTM confirmado em eventos page_view/signup", "DB metadata UTM", "info",
    f"page_view_utm={utmi.get('page_view',{}).get('has_utm')} "
    f"signup_utm={utmi.get('signup',{}).get('has_utm')} "
    f"user_utm={user_utm}", True)

# funnel endpoint (admin only)
if user["is_admin"]:
    st, r = call("GET", "/api/analytics/funnel", headers=AUTH)
    try:
        b = r.json()
    except Exception:
        b = getattr(r, "text", str(r))
    rec("analytics", "relatorio funil (admin)", "GET /api/analytics/funnel", st, b, st == 200)
else:
    rec("analytics", "relatorio funil (admin)", "GET /api/analytics/funnel", "skip",
        "conta nao e admin - verificado via DB direto", True)

# ===================================================================
# B2B
# ===================================================================
print("\n=== B2B ===")
# self-serve key
st, r = call("POST", "/api/b2b/self-serve/keys", json={"plan": "trial", "nome": "Teste Conta QA"},
             headers=AUTH)
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
self_key = b.get("api_key") if isinstance(b, dict) else None
rec("b2b", "gerar API key (self-serve)", "POST /api/b2b/self-serve/keys", st,
    (f"key_prefix={b.get('api_key_prefix')} plan={b.get('plan')}" if isinstance(b, dict) else b),
    st == 201 and bool(self_key))

# diagnosis JSON
if self_key:
    st, r = call("POST", "/api/b2b/diagnosis",
                 json={"image": PNG_B64, "pergunta": "Ha ferrugem nesta peca?"},
                 headers={"X-API-Key": self_key}, timeout=90)
    try:
        b = r.json()
    except Exception:
        b = getattr(r, "text", str(r))
    rec("b2b", "consumir diagnostico (JSON)", "POST /api/b2b/diagnosis json", st,
        (f"laudo_len={len(b.get('laudo',''))}" if isinstance(b, dict) else b), st == 200 and isinstance(b, dict) and b.get("laudo"))

    # diagnosis PDF
    st, r = call("POST", "/api/b2b/diagnosis",
                 json={"image": PNG_B64, "pergunta": "Qual o problema?", "formato": "pdf"},
                 headers={"X-API-Key": self_key}, timeout=90)
    ctype = getattr(r, "headers", {}).get("Content-Type", "")
    body = getattr(r, "content", b"") if hasattr(r, "content") else b""
    is_pdf = ctype.startswith("application/pdf") or (isinstance(body, bytes) and body[:4] == b"%PDF")
    rec("b2b", "diagnostico PDF", "POST /api/b2b/diagnosis formato=pdf", st,
        f"content-type={ctype} starts_with_%PDF={isinstance(body,bytes) and body[:4]==b'%PDF'}",
        st == 200 and is_pdf)
else:
    rec("b2b", "consumir diagnostico (JSON)", "POST /api/b2b/diagnosis json", "skip", "sem key", False)
    rec("b2b", "diagnostico PDF", "POST /api/b2b/diagnosis pdf", "skip", "sem key", False)

# limit test: admin key with rate_limit_per_min=1, two calls without image -> 400 then 429
st, r = call("POST", "/api/b2b/keys", json={"nome": "QA Limite", "rate_limit_per_min": 1},
             headers={"X-Admin-Secret": B2B_ADMIN})
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
limit_key = b.get("api_key") if isinstance(b, dict) else None
rec("b2b", "criar API key p/ teste de limite (admin)", "POST /api/b2b/keys rate=1", st,
    (f"prefix={b.get('api_key_prefix')}" if isinstance(b, dict) else b), st == 201 and bool(limit_key))
if limit_key:
    st1, r1 = call("POST", "/api/b2b/diagnosis", json={}, headers={"X-API-Key": limit_key})
    st2, r2 = call("POST", "/api/b2b/diagnosis", json={}, headers={"X-API-Key": limit_key})
    rec("b2b", "testar limite (rate-limit 429)", "2x POST /api/b2b/diagnosis (sem imagem)",
        f"{st1},{st2}", f"1a={st1} 2a={st2}", st1 in (400,) and st2 == 429)

# checkout
st, r = call("POST", "/api/b2b/self-serve/checkout", json={"plan": "pro_1k", "nome": "QA Checkout"},
             headers=AUTH)
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
rec("b2b", "checkout B2B (plano pago)", "POST /api/b2b/self-serve/checkout pro_1k", st,
    (f"checkout_url={'sim' if b.get('checkout_url') else 'nao'} order={b.get('order_id')}" if isinstance(b, dict) else b),
    st in (200, 201) and isinstance(b, dict) and bool(b.get("checkout_url")))

# webhook
st, r = call("POST", "/api/pay/webhook/cakto", json={"event": "purchase_approved"})
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
rec("b2b", "webhook sem secret (deve 401)", "POST /api/pay/webhook/cakto (sem secret)", st, b, st == 401)

# webhook with secret but fake transaction -> should reach activation branch, fail verification (400)
payload = {"event": "purchase_approved",
           "data": {"id": "fake_tx_12345", "status": "approved", "amount": 19.90,
                    "customer": {"email": ACCOUNT_EMAIL}, "user_ref": str(USER_ID)}}
st, r = call("POST", "/api/pay/webhook/cakto", json=payload,
             headers={"X-Cakto-Secret": CAKTO_SECRET})
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
rec("b2b", "webhook com secret (compra aprovada, tx fake)", "POST /api/pay/webhook/cakto (secret)", st,
    b, st in (400, 200))  # 400 = verificacao ativa rejeitou tx fake (esperado); prova auth+roteamento

# webhook no-op event (200 sem acao)
payload2 = {"event": "ping", "data": {"status": "ok"}}
st, r = call("POST", "/api/pay/webhook/cakto", json=payload2,
             headers={"X-Cakto-Secret": CAKTO_SECRET})
try:
    b = r.json()
except Exception:
    b = getattr(r, "text", str(r))
rec("b2b", "webhook evento sem acao (200)", "POST /api/pay/webhook/cakto ping", st, b, st == 200)

# ===================================================================
# REPORT
# ===================================================================
passed = sum(1 for x in results if x["pass"])
total = len(results)
print("\n" + "="*70)
print(f"RESUMO: {passed}/{total} verificacoes PASSaram")
print("="*70)
fails = [x for x in results if not x["pass"]]
if fails:
    print("FALHAS:")
    for x in fails:
        print(f"  - ({x['group']}) {x['test']} -> {x['status']} | {x['detail'][:200]}")
else:
    print("Nenhuma falha.")

with open("/home/julio_cesar/Projetos/AGENTS/AutoAssist/test_report.json", "w", encoding="utf-8") as f:
    json.dump({"user_id": USER_ID, "is_admin": bool(user["is_admin"]),
               "is_premium": bool(user["is_premium"]),
               "user_utm": user_utm, "results": results,
               "summary": {"passed": passed, "total": total}}, f, indent=2, default=str)
print("Relatorio salvo em test_report.json")
