# AutoAssist Mobile

Esta branch (`feat/react-native`) concentra a conversao do AutoAssist para aplicativo mobile com Expo/React Native. O site permanece na branch `main`; nao use `git merge` desta branch para a `main`.

<p align="center">
  <img src="frontend/public/static/logo2.png" alt="AutoAssist Logo" width="200">
</p>

# AutoAssist IA ðŸš—ðŸ’¨

O **AutoAssist IA** Ã© um ecossistema de inteligÃªncia artificial de Ãºltima geraÃ§Ã£o, desenvolvido especificamente para o mercado automotivo brasileiro. A plataforma integra Processamento de Linguagem Natural (NLP) e VisÃ£o Computacional para fornecer diagnÃ³sticos precisos, avaliaÃ§Ãµes de mercado e consultoria tÃ©cnica especializada.

---

## âœ¨ Funcionalidades

### **Recursos Inteligentes (NOG IA)**

- **Consultoria Contextual:** O assistente "NOG" agora utiliza o **histÃ³rico da conversa** para oferecer respostas mais profundas e evitar resultados repetitivos.
- **E-commerce Automotivo Integrado:** RecomendaÃ§Ã£o automÃ¡tica de links para compra de **veÃ­culos (WebMotors)** e **peÃ§as (Mercado Livre)** baseada na necessidade do usuÃ¡rio.
- **IA de PrevisÃ£o de ManutenÃ§Ã£o:** Sistema que analisa descriÃ§Ãµes (ex: "Troquei o Ã³leo hoje") e utiliza IA para prever a data e quilometragem da prÃ³xima revisÃ£o.
- **Raio-X MecÃ¢nico:** AnÃ¡lise visual avanÃ§ada para identificaÃ§Ã£o de ferrugem, desalinhamentos e vazamentos em fotos.
- **Busca Inteligente de MecÃ¢nicos:** Encontre oficinas reais prÃ³ximas via OpenStreetMap + Google Search, com cache Redis (1h OSM, 24h web). Integrado ao chatbot - pergunte "preciso de um mecÃ¢nico" e a IA responde com opÃ§Ãµes na regiÃ£o.

### **Dashboard e GestÃ£o**

- **HistÃ³rico Proativo:** Painel que monitora a saÃºde das peÃ§as e indica o status de cada manutenÃ§Ã£o (Ok, Aviso ou Atrasado).
- **Agenda de Eventos Automotivos:** Varredura automÃ¡tica de feiras, encontros, competiÃ§Ãµes e exposiÃ§Ãµes do setor, exibidas em cards na pÃ¡gina de eventos (`eventos.html`) com filtros por UF, categoria e perÃ­odo, mais **selo de status** (Agendado / Acontecendo / Cancelado / Encerrado / Data a confirmar) e a **fonte** de cada evento. As fontes de **alta confianÃ§a** sÃ£o sites especializados estruturados (NFeiras, Sindirepa, Diretriz, Shopping Interlagos); a **busca web** (Bing via Scrapling, sem browser) entra como fallback de baixa confianÃ§a.
- **Galeria de VÃ­deos Otimizada:** Nova biblioteca de vÃ­deos com redirecionamento direto para o YouTube, miniaturas em alta resoluÃ§Ã£o e carregamento ultrarrÃ¡pido.
- **NotificaÃ§Ãµes InstantÃ¢neas:** Sistema de e-mail que alerta o usuÃ¡rio **no mesmo dia** em que uma manutenÃ§Ã£o atinge o status crÃ­tico ou vence.
- **Tabela FIPE Real-Time:** IntegraÃ§Ã£o com a API FIPE para fornecer valores de mercado precisos e atualizados.
- **Feedback Inteligente:** Sistema que coleta e organiza o feedback dos usuÃ¡rios para melhoria contÃ­nua do sistema.

### **Programa de IndicaÃ§Ã£o (Link de Convite)**

- Cada usuÃ¡rio recebe um **link de convite** prÃ³prio, obtido via `GET /api/referral` (JWT), que retorna `referral_code` e `referral_link` no formato `https://<dominio>/cadastro.html?ref=CODIGO`.
- Quem se cadastra informando um `referred_by` (o cÃ³digo do convite) **concede 1 mÃªs de crÃ©dito/desconto na assinatura Premium a quem indicou** (aplicado na ativaÃ§Ã£o da assinatura via `referral_credit_months` em `routes/auth.py`/`payment.py`).
- ProteÃ§Ãµes anti-fraude no backend: teto de **20 bÃ´nus por indicador**, mÃ¡ximo de **5 indicaÃ§Ãµes/dia**, mÃ¡ximo de **5 contas por IP/dia** e bloqueio quando o IP do indicado Ã© igual ao do indicador.

### **Mod Passport (recurso Premium)**

- Recurso **exclusivo para contas Premium** (validado por `_require_mod_passport` em `routes/pages.py`).
- Permite registrar **modificaÃ§Ãµes/melhorias** do veÃ­culo (ex.: som, rodas, motor, preparaÃ§Ã£o) e recalcula o **Valor estimado de mercado** (`fipe_ajustada`) com base nos upgrades aplicados.
- A **base do valor** Ã© a **Tabela FIPE** (referÃªncia oficial) ou, quando hÃ¡ amostra confiÃ¡vel, a **mediana de anÃºncios reais** (Mercado Livre, via `get_market_price_estimate` em `services/web_scraping.py`).
- O ajuste por mods Ã© **conservador e transparente**: pesos por categoria (turbo 5%, motor 4%, som 0,5%â€¦) com teto de **12%**, mais qualquer valor em R$ informado por modificaÃ§Ã£o (`_calcular_detalhe` em `routes/pages.py`).
- O painel exibe o valor FIPE base versus o valor estimado, a **fonte** utilizada e um **aviso** de que nÃ£o Ã© avaliaÃ§Ã£o oficial (nÃ£o substitui perÃ­cia para venda/seguro/financiamento).

### **Dashboard - Modais de Detalhes do VeÃ­culo**

- O painel (`dashboard.html`) agora abre **modais interativos** com os detalhes completos de cada veÃ­culo - marca, modelo, ano de fabricaÃ§Ã£o, quilometragem, valor FIPE base/ajustado e status de manutenÃ§Ã£o - alÃ©m de aÃ§Ãµes rÃ¡pidas como editar dados do veÃ­culo e acessar o **Mod Passport**.

### **SeguranÃ§a e Cloud (Hardening de ProduÃ§Ã£o)**

- **ProteÃ§Ã£o AvanÃ§ada:** ImplementaÃ§Ã£o de **SRI (Subresource Integrity)**, **CSP (Content Security Policy)** e sanitizaÃ§Ã£o global contra XSS.
- **Google OAuth 2.0:** Login simplificado e seguro utilizando contas Google com propagaÃ§Ã£o dinÃ¢mica de tokens.
- **AutenticaÃ§Ã£o em Duas Etapas (2FA):** Camada de seguranÃ§a adicional para proteÃ§Ã£o de dados sensÃ­veis.
- **CAPTCHA Cloudflare Turnstile:** ProteÃ§Ã£o anti-bot no cadastro e login - validaÃ§Ã£o server-side de `success`, `action` e `hostname`.
- **Cloud Resiliency:** Conectividade reforÃ§ada com suporte a SSL e timeouts otimizados para bancos de dados em nuvem.

---

## ðŸ› ï¸ Tecnologias Utilizadas

### **Backend & InteligÃªncia Artificial**

| Tecnologia            | FunÃ§Ã£o                                                 |
| :-------------------- | :----------------------------------------------------- |
| **Flask**             | Servidor robusto e orquestraÃ§Ã£o de APIs REST.          |
| **Groq API**         | Modelos de linguagem (LLaMA, Groq Compound) para texto e visÃ£o. |
| **PyMySQL + SSL**     | ConexÃ£o segura e resiliente com o banco de dados.      |
| **SMTP / Gmail API**  | Motor de disparo de notificaÃ§Ãµes proativas por e-mail. |
| **JWT + Refresh**     | AutenticaÃ§Ã£o moderna com Tokens de Acesso e Refresh.   |
| **Overpass API (OSM)**| Consulta de oficinas mecÃ¢nicas via OpenStreetMap.      |
| **Google Search**     | Scraping de resultados locais para mecanicas.           |
| **Scrapling (Bing)**  | Varredura web de eventos via TLS stealth (curl_cffi), sem browser; Brave Search API como fallback se `BRAVE_API_KEY`. |
| **OpenStreetMap Nominatim** | GeocodificaÃ§Ã£o cidadeâ†’lat/lng dos eventos (cache 30d). |
| **MySQL `events`**    | PersistÃªncia estruturada dos eventos (upsert, status, confianÃ§a, coords). |
| **Redis**             | Cache distribuÃ­do de IA, dashboard e mechanics (OSM/Web).|

### **Frontend**

| Tecnologia           | FunÃ§Ã£o                                                     |
| :------------------- | :--------------------------------------------------------- |
| **Vanilla JS**       | LÃ³gica de estado e consumo de APIs sem frameworks pesados. |
| **Glassmorphism UI** | Design moderno com transparÃªncias e animaÃ§Ãµes dinÃ¢micas.   |
| **DOMPurify + Marked**| RenderizaÃ§Ã£o segura de Markdown e sanitizaÃ§Ã£o de HTML.     |
| **Web Speech API**   | Captura e processamento de voz nativo no navegador.        |

---

## ðŸ—ï¸ Estrutura do Projeto

```
AutoAssist/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ models/                    # Modelos de ML para treinamento
â”‚   â”œâ”€â”€ routes/                    # MÃ³dulos de API (Auth, Pages, Database, Mechanics, Events)
â”‚   â”œâ”€â”€ scripts/                   # Treinamento do ML
â”‚   â”œâ”€â”€ services/                  # IA e LÃ³gica (NOG IA, Vision, Maintenance, Web Scraping, Automotive Events)
â”‚   â”œâ”€â”€ utils/                     # Cache Redis, e-mail, tasks assÃ­ncronas e cron auth
â”‚   â”œâ”€â”€ app.py                     # Entry-point (Servidor Flask)
â”‚   â”œâ”€â”€ render.yaml                # Blueprint de deploy (Render)
â”‚   â”œâ”€â”€ docker-compose.yml         # Redis local para desenvolvimento
â”‚   â””â”€â”€ .env                       # VariÃ¡veis de ambiente (nÃ£o commitar)
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ index.html                 # Landing Page
â”‚   â”œâ”€â”€ chat.html                  # Consultor NOG IA
â”‚   â”œâ”€â”€ maps.html                   # Mapa de mecÃ¢nicos (OpenStreetMap)
    â”œâ”€â”€ dashboard.html             # Dashboard
â”‚   â”œâ”€â”€ library.html               # Galeria de VÃ­deos YouTube
â”‚   â”œâ”€â”€ maintenance_history.html   # GestÃ£o de ManutenÃ§Ãµes
â”‚   â”œâ”€â”€ profile.html               # Perfil do UsuÃ¡rio
â”‚   â”œâ”€â”€ planos.html                # Planos e preÃ§os (Premium R$ 19,90/mÃªs)
â”‚   â”œâ”€â”€ b2b.html                   # Landing da API B2B (planos, lead, chave self-serve)
â”‚   â”œâ”€â”€ eventos.html               # Agenda de eventos automotivos
â”‚   â””â”€â”€ static/
â”‚       â”œâ”€â”€ css/
â”‚       â”‚   â”œâ”€â”€ car-scrollytelling.css   # Estilos do carrossel 3D e hero
â”‚       â”‚   â”œâ”€â”€ shared.css               # Estilos compartilhados (navbar, footer)
â”‚       â”‚   â”œâ”€â”€ responsive.css           # Media queries globais
â”‚       â”‚   â”œâ”€â”€ chat.css                 # Estilos do consultor NOG IA
â”‚       â”‚   â”œâ”€â”€ dashboard.css            # Estilos do dashboard
â”‚       â”‚   â””â”€â”€ profile.css              # Estilos do perfil
â”‚       â”œâ”€â”€ js/
â”‚       â”‚   â”œâ”€â”€ car-scrollytelling.js    # Canvas 2D carrossel com fÃ­sica de perspectiva
â”‚       â”‚   â”œâ”€â”€ auth.js                  # AutenticaÃ§Ã£o Google OAuth 2.0
â”‚       â”‚   â””â”€â”€ config.js                # ConfiguraÃ§Ãµes do frontend
â”‚       â””â”€â”€ logo2.png                    # Logotipo do projeto
â””â”€â”€ README.md
```

---

## ðŸš€ Como Executar o Projeto

### 1. PrÃ©-requisitos

- Python 3.10 ou superior
- Servidor MySQL (Local ou Nuvem)
- Chave de API do Groq (https://console.groq.com)

### 2. ConfiguraÃ§Ã£o do Ambiente

Crie um arquivo `.env` na pasta `backend/` com:

```env
# Groq (IA)
API_GROQ=sua_chave_aqui
GROQ_PRIMARY_MODEL=groq/compound-mini
GROQ_UTILITY_MODEL=openai/gpt-oss-20b
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
GROQ_FALLBACK_MODELS=groq/compound

# Busca web de eventos (fallback de baixa confianÃ§a)
# Scrapling/Bing nao exige chave. Brave Search API eleva a qualidade se configurada:
BRAVE_API_KEY=

# Redis (cache de IA, dashboard, filas RQ e rate limit)
# Local (docker-compose): redis://localhost:6379/0
# Upstash (producao): rediss://default:<token>@<host>.upstash.io:6379
REDIS_URL=redis://localhost:6379/0
RATELIMIT_STORAGE_URI=redis://localhost:6379/0

# TTL dos caches de IA (segundos)
GROQ_CACHE_TTL_SECONDS=3600
GROQ_VISION_CACHE_TTL_SECONDS=86400
GROQ_PDF_CACHE_TTL_SECONDS=86400
DASHBOARD_CACHE_TTL_SECONDS=30

# Banco de dados
DB_HOST=seu_host
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=seu_banco
AUTO_INIT_DB=1

# E-mail (provedor google_script usa Google Apps Script)
EMAIL_REMETENTE=seu_email@gmail.com
EMAIL_SENHA_APP=sua_senha_app_gmail
EMAIL_FROM_NAME=AutoAssist
EMAIL_PROVIDER=google_script
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
GOOGLE_SCRIPT_SECRET=xxx

# Google OAuth
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=https://seu-dominio/api/auth/google/callback

# URLs do frontend (CORS/WebSocket e links de e-mail)
URL_DEV=http://127.0.0.1:5000/
URL_PROD=https://seu-dominio

# Seguranca / producao
FLASK_ENV=production
JWT_SECRET_KEY=gere_um_segredo_forte
DEMO_LOGIN_ENABLED=0
CSP_ALLOW_UNSAFE_EVAL=0
HEALTHCHECK_EXTERNAL_CHECKS=1
MAINTENANCE_EMAIL_CRON_SECRET=gere_um_segredo_forte

# Pagamentos (Cakto)
CAKTO_CHECKOUT_URL=https://pay.cakto.com.br/xxx
BASE_URL=https://api.cakto.com.br/
CAKTO_WEBHOOK_SECRET=xxx

# Cloudflare Turnstile (CAPTCHA anti-bot)
# Criar widget: https://dash.cloudflare.com -> Turnstile -> Create Widget
# (ou via API, veja a seÃ§Ã£o "SeguranÃ§a e Boas PrÃ¡ticas")
TURNSTILE_SITE_KEY=0x4AAAAAAA...
TURNSTILE_SECRET_KEY=segredo_do_widget
# Frontends autorizados a emitir token, separados por vÃ­rgula, SEM protocolo
# (produÃ§Ã£o: sÃ³ o domÃ­nio real; dev: localhost,127.0.0.1)
TURNSTILE_HOSTNAMES=seu-dominio.com,localhost,127.0.0.1

# API B2B (diagnÃ³stico por foto como serviÃ§o assinÃ¡vel)
# Segredo para criar API keys de clientes corporativos (POST /api/b2b/keys).
# OBS: obrigatÃ³rio - sem ele, a criaÃ§Ã£o de chave retorna 500.
B2B_ADMIN_SECRET=gere_um_segredo_forte

```

### 3. InstalaÃ§Ã£o e ExecuÃ§Ã£o

```bash
# Entre na pasta do backend
cd backend

# Instale as dependÃªncias
pip install -r requirements.txt

# Execute o servidor
python app.py
```

### 4. Redis para desenvolvimento local

O cache de IA, o cache do dashboard (FIPE + prediÃ§Ãµes de manutenÃ§Ã£o), as filas RQ (e-mails/manutenÃ§Ã£o) e o rate limit usam Redis. Para subir um Redis local:

```bash
docker compose up -d   # sobe redis:7-alpine em localhost:6379
```

Defina no `.env`:

```env
REDIS_URL=redis://localhost:6379/0
RATELIMIT_STORAGE_URI=redis://localhost:6379/0
```

Sem Redis, o cache recai sobre memÃ³ria local (por processo) e as filas RQ nÃ£o processam jobs.

---

## ðŸ’³ Planos e MonetizaÃ§Ã£o

- **Plano Premium recorrente:** assinatura **R$ 19,90/mÃªs** (via Cakto, `PREMIUM_PLANS` em `routes/payment.py`).
- **Camada gratuita:** atÃ© **30 consultas/mÃªs** com a IA NOG (`FREE_MONTHLY_CHAT_LIMIT` em `routes/pages.py`); estourar o limite retorna `403 code=free_limit_reached`. Em manutenÃ§Ãµes, o free pode registrar atÃ© **3 por veÃ­culo** (`FREE_MAINTENANCE_LIMIT`), com alertas gratuitos.
- **IndicaÃ§Ã£o:** quem se cadastra com um cÃ³digo de convite concede **1 mÃªs de crÃ©dito** na assinatura de quem indicou (`referral_credit_months`).
- **B2B:** diagnÃ³stico por foto como serviÃ§o, com tiers e cota por API key (ver seÃ§Ã£o abaixo).

---

## ðŸ¤ API B2B (DiagnÃ³stico por Foto como ServiÃ§o)

API assinÃ¡vel para clientes corporativos enviarem fotos de defeitos e receberem um laudo tÃ©cnico (JSON ou PDF) gerado por IA. AutenticaÃ§Ã£o via header `X-API-Key` (chave criada em `POST /api/b2b/keys`, protegido por `B2B_ADMIN_SECRET`). A chave Ã© exibida **uma vez**; no banco fica sÃ³ o hash SHA-256, com comparaÃ§Ã£o em tempo constante. Rate limit por cliente (Redis, com fallback local). Planos/tiers (`B2B_PLANS`: trial/pro_1k/pro_5k/pro_20k) definem a cota de requisiÃ§Ãµes (`requests_limit`/`requests_used` na tabela `api_clients`); ultrapassar retorna `429`. Clientes podem gerar sua prÃ³pria chave via `POST /api/b2b/self-serve/keys` (JWT do usuÃ¡rio logado).

### Endpoints

| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
| :----- | :--- | :--- | :-------- |
| `POST` | `/api/b2b/keys` | `X-Admin-Secret` = `B2B_ADMIN_SECRET` | Cria um cliente e retorna a `api_key` (uso Ãºnico). Body: `{ "nome", "rate_limit_per_min"? }`. |
| `POST` | `/api/b2b/self-serve/keys` | JWT (usuÃ¡rio logado) | UsuÃ¡rio cria sua prÃ³pria API key B2B (plano/tier definido por `B2B_PLANS`). |
| `POST` | `/api/b2b/diagnosis` | `X-API-Key` | DiagnÃ³stico por foto. Body: `{ "image": <base64>, "pergunta"?, "formato"?: "json"\|"pdf" }`. |
| `POST` | `/api/b2b/leads` | pÃºblico | Captura lead do formulÃ¡rio B2B. Body: `{ "nome", "email", "empresa"?, "telefone"?, "mensagem"? }`. |
| `GET`  | `/api/admin/b2b/leads` | JWT admin | Lista os leads capturados. |

### Exemplo de fluxo

```bash
# 1) Criar chave (admin)
curl -X POST http://localhost:5000/api/b2b/keys \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: $B2B_ADMIN_SECRET" \
  -d '{"nome":"Cliente Teste","rate_limit_per_min":30}'

# 2) DiagnÃ³stico por foto (use a api_key retornada)
IMG=$(base64 -w0 foto.jpg)
curl -X POST http://localhost:5000/api/b2b/diagnosis \
  -H "Content-Type: application/json" \
  -H "X-API-Key: aa_xxxxxxxxxxxxxxxxxxxx" \
  -d "{\"image\":\"$IMG\",\"pergunta\":\"Qual o problema?\"}"
```

> O laudo Ã© gerado por IA e **nÃ£o substitui inspeÃ§Ã£o mecÃ¢nica presencial**.

---

## ðŸ“… Agenda de Eventos Automotivos

Pipeline de coleta de eventos tratado como **dado estruturado** (nÃ£o scraping genÃ©rico):

1. **Provedores de alta confianÃ§a** (HTML estÃ¡vel e curado): `nfeiras.com` (automobilismo), `sindirepabrasil.org.br/eventos` (reparaÃ§Ã£o), `diretriz.com.br` (Autopar, Minaspartsâ€¦) e `interlagos.com.br` (itens automotivos).
2. **Busca web (fallback, baixa confianÃ§a):** Bing via **Scrapling** (`Fetcher`, TLS stealth com `curl_cffi`, sem abrir browser); **Brave Search API** entra se `BRAVE_API_KEY` estiver configurado; Playwright como Ãºltimo recurso.
3. **NormalizaÃ§Ã£o:** tÃ­tulo normalizado (minÃºsculo, sem acento), `confidence` por fonte (fontes oficiais `0.90`, web `0.40`) e `status` (`upcoming` / `ongoing` / `finished` / `cancelled` / `unknown`).
4. **DeduplicaÃ§Ã£o por score:** similaridade ponderada (tÃ­tulo + data + cidade + venue + organizador); mantÃ©m o registro de **maior confianÃ§a** como canÃ´nico.
5. **GeocodificaÃ§Ã£o:** cidadeâ†’lat/lng via Nominatim/OSM (cache 30d), reutilizando o cache de geocoding.
6. **PersistÃªncia:** upsert na tabela MySQL `events` (id estÃ¡vel via `sha1`), preservando eventos passados e o `status` (nÃ£o sÃ£o apagados).
7. **API:** `GET /api/events/automotive` (filtros `uf`, `q`, `categoria`, `periodo`, `lat`/`lng`/`radius` para "perto de mim") e `GET /api/events/<id>`.
8. **Frontend:** `eventos.html` renderiza cards com badge de `status` e selo de fonte; a lista mostra apenas eventos futuros.

> Eventos de comunidade (Facebook/Instagram/WhatsApp) e plataformas fechadas (Sympla/Eventbrite sem token) nÃ£o sÃ£o cobertos - ficam como fontes futuras. Nenhuma Ã¡rea protegida/CAPTCHA Ã© contornada.

### Endpoints

| MÃ©todo | Rota | Auth | DescriÃ§Ã£o |
| :----- | :--- | :--- | :-------- |
| `GET`  | `/api/events/automotive` | PÃ¡gina exige Premium | Lista eventos (filtros `uf`, `q`, `categoria`, `periodo`, `lat`, `lng`, `radius`). `?force=1` refaz a varredura. |
| `GET`  | `/api/events/<id>` | PÃ¡gina exige Premium | Detalhe de um evento (cache da varredura + MySQL). |
| `POST` | `/api/cron/events-notifications` | `X-Cron-Secret` | Notifica usuÃ¡rios sobre novos eventos (via RQ/thread). |

---

## ðŸ”’ SeguranÃ§a e Boas PrÃ¡ticas

- **Bcrypt Hashing**: ProteÃ§Ã£o de senhas com algoritmos de derivaÃ§Ã£o de chave.
- **CSP (Content Security Policy)**: `unsafe-eval` removido por padrÃ£o; reative com `CSP_ALLOW_UNSAFE_EVAL=1` apenas se estritamente necessÃ¡rio. `unsafe-inline` Ã© mantido para o frontend estÃ¡tico (migraÃ§Ã£o para nonce Ã© recomendada).
- **JWT Protection**: Endpoints protegidos garantem que apenas usuÃ¡rios autenticados acessem dados sensÃ­veis.
- **Cron Auth**: rotas agendadas devem exigir `X-Cron-Secret` (veja `utils/cron_auth.require_cron_secret` e `MAINTENANCE_EMAIL_CRON_SECRET`).
- **Cloudflare Turnstile**: CAPTCHA anti-bot em `/api/cadastro` (action `signup`) e `/api/login` (action `login`). O siteverify Ã© feito server-side (`utils/turnstile.turnstile_required`) validando `success`, `action` e `hostname` no allowlist `TURNSTILE_HOSTNAMES` - fail-closed em erro de rede/HTTP. Sem `TURNSTILE_SECRET_KEY` configurada, o decorator Ã© no-op (dev/testes). Para criar o widget via API: token com escopo `Account.Turnstile:Edit` e `POST /accounts/<id>/challenges/widgets` (`{"name","domains":[...],"mode":"managed"}`). Tokens do Turnstile sÃ£o single-use.
- **Segredos**: o `.env` **nÃ£o deve ser commitado**. Em produÃ§Ã£o, configure os segredos no Render via dashboard/Environment Group.

---

## ðŸ§ª Testes

Os testes ficam em `backend/tests/` (estilo `unittest`). Mockam banco, Redis e visÃ£o por IA, entÃ£o rodam sem Groq/DB externo.

```bash
cd backend
python -m unittest tests.test_b2b -v     # ou: python tests/test_b2b.py
```

Cobertura de `test_b2b.py` (11 testes, todos passando):
- `POST /api/b2b/keys` - sucesso (201, hash gravado == SHA-256 da chave), secret errado (403), `B2B_ADMIN_SECRET` ausente (500)
- `POST /api/b2b/diagnosis` - sem key (401), sem imagem (400), JSON (200), **PDF** (200, `%PDF`)
- `POST /api/b2b/leads` - sucesso (201), campos faltando (400)
- `GET /api/admin/b2b/leads` - sem admin (403), com admin (200)

> O endpoint de PDF usa `fpdf2`; `_build_laudo_pdf` retorna `bytes`. A criaÃ§Ã£o de chaves exige `B2B_ADMIN_SECRET` definido no `.env`.

---

## ðŸ“‹ AlteraÃ§Ãµes Recentes

Registro das mudanÃ§as feitas nesta sessÃ£o de desenvolvimento:

### Cobertura de testes da API B2B
- **Criado `backend/tests/test_b2b.py`** (11 testes, estilo `unittest`) cobrindo todos os endpoints B2B com banco, Redis e visÃ£o por IA mockados - roda sem Groq/DB externo.
  - `POST /api/b2b/keys`: sucesso (201, hash gravado == SHA-256 da chave), `X-Admin-Secret` errado (403), `B2B_ADMIN_SECRET` ausente (500).
  - `POST /api/b2b/diagnosis`: sem key (401), sem imagem (400), JSON (200), **PDF** (200, `%PDF`).
  - `POST /api/b2b/leads`: sucesso (201), campos faltando (400).
  - `GET /api/admin/b2b/leads`: sem admin (403), com admin (200).

### Arquitetura de Eventos Automotivos (estruturada)
- **Nova tabela `events`** em `backend/routes/database.py` (`TABLES_SQL`): `id` (PK estÃ¡vel `sha1`), `title`, `normalized_title`, `category`, `start_date`/`end_date`, `venue_name`, `address`, `city`, `state`, `latitude`/`longitude`, `organizer`, `event_url`, `source`, `status`, `confidence`, `last_verified_at`, Ã­ndices por UF/cidade/data/status/fonte. Criada via `init_db()`.
- **`backend/services/automotive_events.py`:**
  - `_make_event` estendido com `normalized_title`, `confidence` (via `CONFIDENCE_BY_SOURCE`), `status` (via `derive_status`), `latitude`/`longitude`, `organizer`, `venue_name`, `address`, `country` e **id estÃ¡vel** (`sha1(fonte|titulo|data|cidade)`) - substitui o `hash()` frÃ¡gil entre processos.
  - `_dedupe_events` por score (tÃ­tulo + data + cidade + venue + organizador; mantÃ©m o canÃ´nico de maior confianÃ§a), no lugar do set ingÃªnuo `(titulo, data)`.
  - `_geocode_event` (Nominatim/OSM, reuso de cache) e `persist_events` (upsert MySQL em lote) integrados ao `scan_automotive_events`.
  - `_haversine` + filtro `lat`/`lng`/`radius` em `filter_events` ("perto de mim").
  - Web passa a usar **Scrapling/Bing** como fonte primÃ¡ria (sem browser), Brave API se `BRAVE_API_KEY`, Playwright como fallback.
- **`backend/routes/events.py`:** `GET /api/events/automotive` aceita `lat`/`lng`/`radius`; adicionado `GET /api/events/<id>`.
- **`frontend/public/eventos.html`:** card com badge de `status` (Agendado/Acontecendo/Cancelado/Encerrado/Data a confirmar) e selo de `fonte_nome`. Lista apenas eventos futuros.
- **Testes** (`backend/tests/test_events.py`): +7 testes (normalize, modelo/confianÃ§a, status, dedupe por score, mapeamento DB, nearby). SuÃ­te de eventos: **51 passam**, 1 falha prÃ©-existente nÃ£o relacionada (`test_footer_linka_eventos_html`).
- `requirements.txt`: adicionado `scrapling[fetchers]==0.4.14`.

### Marketing & Posicionamento (P0)
- **Posicionamento "copiloto de carro de IA":** tÃ­tulos, `og:title`/`twitter:title` e eyebrow de `index.html` passam a usar "Seu copiloto de carro de IA"; `og:image`/`twitter:image` agora apontam para URLs absolutas (`https://autoassist.com.br/...`).
- **Navbar:** visitante vÃª botÃ£o "Criar conta" (`.nav-btn-cta`); logado vÃª link "Planos". `shared.css` com nova classe de CTA.
- **Plataforma de pagamento:** cobranÃ§a exclusiva via **Cakto** (`R$ 19,90/mÃªs`, sem anual). Removido ruÃ­do de "Mercado Pago" do copy.
- **Alinhamento do Free:** `planos.html` e `chat.html` clarificam "5 mensagens grÃ¡tis de visitante â†’ crie conta para 30/mÃªs"; card free "grÃ¡tis ao criar conta".
- **NOG:** `index.html` explica que "NOG Ã© a inteligÃªncia artificial do AutoAssist" no hero e no chat.
- **Referral via WhatsApp:** `perfil.html` com botÃ£o "Ganhar 1 mÃªs no WhatsApp" (`wa.me`) e copy "1 mÃªs Premium grÃ¡tis".
- **Loop de retenÃ§Ã£o â†’ chat:** e-mail de alerta de manutenÃ§Ã£o (`pages.py`) ganhou 2Âº CTA "Pergunte Ã  NOG o que fazer" â†’ `chat.html`.
- **Analytics consentidos:** `analytics-consent.js` carrega **GA4** + **Meta Pixel** somente apÃ³s consentimento (`GA_MEASUREMENT_ID`/`FB_PIXEL_ID`), sem quebrar a navegaÃ§Ã£o.
- **SEO tÃ©cnico:** `robots.txt` + `sitemap.xml` (`https://autoassist.com.br`); `index.html`/`planos.html` com `canonical` e JSON-LD (Organization + Service).
- **B2B cobrando:** `b2b.py` com preÃ§os (R$ 99/399/999 por mÃªs), rota `/api/b2b/self-serve/checkout` (gera pedido Cakto + chave inativa) e ativaÃ§Ã£o via webhook (`payment.py` branch `b2b_`); `b2b.html` com planos/valores e checkout. `CAKTO_B2B_CHECKOUT_URL` Ã© opcional - se ausente, reusa `CAKTO_CHECKOUT_URL` (link do Premium, R$ 19,90); defina apenas para cobrar preÃ§os B2B distintos por tier.
- **ConteÃºdo descartado:** `blog/` removido (decisÃ£o do usuÃ¡rio); `plan.md` P1-3 marcado como NÃƒO IMPLEMENTADO.

---

## ðŸ“ LicenÃ§a e Autoria

Ideia original de **Clara Francisco**.
Desenvolvido por **JÃºlio CÃ©sar**, **Caio Lima**, **Eduardo Nishida** e **Caio Yugo**.

## Mobile (branch feat/react-native)

Esta branch concentra a conversao do AutoAssist para aplicativo mobile com Expo/React Native. O backend continua sendo a API Flask usada pelo app mobile.

```bash
cd mobile
npm install
npm run start
```

Por padrao o app usa a API publicada em `https://autoassist-l9lr.onrender.com`.

Para usar o backend local, defina antes de iniciar o Expo:

```bash
# Android emulator
set EXPO_PUBLIC_API_URL=http://10.0.2.2:5000

# iOS simulator ou web
set EXPO_PUBLIC_API_URL=http://localhost:5000
```

## Funcionalidades Mobile

- Login, cadastro e verificacao 2FA.
- Sessao persistida com `expo-secure-store`.
- Dashboard com status da conta, veiculos e alertas.
- Chat NOG com texto e imagem via `expo-image-picker`.
- Garagem mobile com cadastro e exclusao de veiculos.
- Historico de manutencao premium e checkout Cakto.

## Verificacoes

```bash
cd mobile
npx tsc --noEmit

cd ..
python -m compileall backend
```
