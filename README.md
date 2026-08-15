<p align="center">
  <img src="frontend/public/static/logo2.png" alt="AutoAssist Logo" width="200">
</p>

# AutoAssist IA 🚗💨

O **AutoAssist IA** é um ecossistema de inteligência artificial de última geração, desenvolvido especificamente para o mercado automotivo brasileiro. A plataforma integra Processamento de Linguagem Natural (NLP) e Visão Computacional para fornecer diagnósticos precisos, avaliações de mercado e consultoria técnica especializada.

---

## ✨ Funcionalidades

### **Recursos Inteligentes (NOG IA)**

- **Consultoria Contextual:** O assistente "NOG" agora utiliza o **histórico da conversa** para oferecer respostas mais profundas e evitar resultados repetitivos.
- **E-commerce Automotivo Integrado:** Recomendação automática de links para compra de **veículos (WebMotors)** e **peças (Mercado Livre)** baseada na necessidade do usuário.
- **IA de Previsão de Manutenção:** Sistema que analisa descrições (ex: "Troquei o óleo hoje") e utiliza IA para prever a data e quilometragem da próxima revisão.
- **Raio-X Mecânico:** Análise visual avançada para identificação de ferrugem, desalinhamentos e vazamentos em fotos.
- **Busca Inteligente de Mecânicos:** Encontre oficinas reais próximas via OpenStreetMap + Google Search, com cache Redis (1h OSM, 24h web). Integrado ao chatbot — pergunte "preciso de um mecânico" e a IA responde com opções na região.

### **Dashboard e Gestão**

- **Histórico Proativo:** Painel que monitora a saúde das peças e indica o status de cada manutenção (Ok, Aviso ou Atrasado).
- **Agenda de Eventos Automotivos:** Varredura automática de feiras, encontros, competições e exposições do setor, exibidas em cards na página de eventos (`eventos.html`) com filtros por UF, categoria e período, mais **selo de status** (Agendado / Acontecendo / Cancelado / Encerrado / Data a confirmar) e a **fonte** de cada evento. As fontes de **alta confiança** são sites especializados estruturados (NFeiras, Sindirepa, Diretriz, Shopping Interlagos); a **busca web** (Bing via Scrapling, sem browser) entra como fallback de baixa confiança.
- **Galeria de Vídeos Otimizada:** Nova biblioteca de vídeos com redirecionamento direto para o YouTube, miniaturas em alta resolução e carregamento ultrarrápido.
- **Notificações Instantâneas:** Sistema de e-mail que alerta o usuário **no mesmo dia** em que uma manutenção atinge o status crítico ou vence.
- **Tabela FIPE Real-Time:** Integração com a API FIPE para fornecer valores de mercado precisos e atualizados.
- **Feedback Inteligente:** Sistema que coleta e organiza o feedback dos usuários para melhoria contínua do sistema.

### **Programa de Indicação (Link de Convite)**

- Cada usuário recebe um **link de convite** próprio, obtido via `GET /api/referral` (JWT), que retorna `referral_code` e `referral_link` no formato `https://<dominio>/cadastro.html?ref=CODIGO`.
- Quem se cadastra informando um `referred_by` (o código do convite) **concede 1 mês de Premium automaticamente a quem indicou**.
- Proteções anti-fraude no backend: teto de **20 bônus por indicador**, máximo de **5 indicações/dia**, máximo de **5 contas por IP/dia** e bloqueio quando o IP do indicado é igual ao do indicador.

### **Mod Passport (recurso Premium)**

- Recurso **exclusivo para contas Premium** (validado por `_require_mod_passport` em `routes/pages.py`).
- Permite registrar **modificações/melhorias** do veículo (ex.: som, rodas, motor, preparação) e recalcula o **valor de tabela FIPE ajustado** (`fipe_ajustada`) com base nos upgrades aplicados.
- O painel do veículo passa a exibir o valor FIPE base versus o valor com mods (`pct_ajuste` e `valor_extra`).

### **Dashboard — Modais de Detalhes do Veículo**

- O painel (`dashboard.html`) agora abre **modais interativos** com os detalhes completos de cada veículo — marca, modelo, ano de fabricação, quilometragem, valor FIPE base/ajustado e status de manutenção — além de ações rápidas como editar dados do veículo e acessar o **Mod Passport**.

### **Segurança e Cloud (Hardening de Produção)**

- **Proteção Avançada:** Implementação de **SRI (Subresource Integrity)**, **CSP (Content Security Policy)** e sanitização global contra XSS.
- **Google OAuth 2.0:** Login simplificado e seguro utilizando contas Google com propagação dinâmica de tokens.
- **Autenticação em Duas Etapas (2FA):** Camada de segurança adicional para proteção de dados sensíveis.
- **CAPTCHA Cloudflare Turnstile:** Proteção anti-bot no cadastro e login — validação server-side de `success`, `action` e `hostname`.
- **Cloud Resiliency:** Conectividade reforçada com suporte a SSL e timeouts otimizados para bancos de dados em nuvem.

---

## 🛠️ Tecnologias Utilizadas

### **Backend & Inteligência Artificial**

| Tecnologia            | Função                                                 |
| :-------------------- | :----------------------------------------------------- |
| **Flask**             | Servidor robusto e orquestração de APIs REST.          |
| **Groq API**         | Modelos de linguagem (LLaMA, Groq Compound) para texto e visão. |
| **PyMySQL + SSL**     | Conexão segura e resiliente com o banco de dados.      |
| **SMTP / Gmail API**  | Motor de disparo de notificações proativas por e-mail. |
| **JWT + Refresh**     | Autenticação moderna com Tokens de Acesso e Refresh.   |
| **Overpass API (OSM)**| Consulta de oficinas mecânicas via OpenStreetMap.      |
| **Google Search**     | Scraping de resultados locais para mecanicas.           |
| **Scrapling (Bing)**  | Varredura web de eventos via TLS stealth (curl_cffi), sem browser; Brave Search API como fallback se `BRAVE_API_KEY`. |
| **OpenStreetMap Nominatim** | Geocodificação cidade→lat/lng dos eventos (cache 30d). |
| **MySQL `events`**    | Persistência estruturada dos eventos (upsert, status, confiança, coords). |
| **Redis**             | Cache distribuído de IA, dashboard e mechanics (OSM/Web).|

### **Frontend**

| Tecnologia           | Função                                                     |
| :------------------- | :--------------------------------------------------------- |
| **Vanilla JS**       | Lógica de estado e consumo de APIs sem frameworks pesados. |
| **Glassmorphism UI** | Design moderno com transparências e animações dinâmicas.   |
| **DOMPurify + Marked**| Renderização segura de Markdown e sanitização de HTML.     |
| **Web Speech API**   | Captura e processamento de voz nativo no navegador.        |

---

## 🏗️ Estrutura do Projeto

```
AutoAssist/
├── backend/
│   ├── models/                    # Modelos de ML para treinamento
│   ├── routes/                    # Módulos de API (Auth, Pages, Database, Mechanics, Events)
│   ├── scripts/                   # Treinamento do ML
│   ├── services/                  # IA e Lógica (NOG IA, Vision, Maintenance, Web Scraping, Automotive Events)
│   ├── utils/                     # Cache Redis, e-mail, tasks assíncronas e cron auth
│   ├── app.py                     # Entry-point (Servidor Flask)
│   ├── render.yaml                # Blueprint de deploy (Render)
│   ├── docker-compose.yml         # Redis local para desenvolvimento
│   └── .env                       # Variáveis de ambiente (não commitar)
├── frontend/
│   ├── index.html                 # Landing Page
│   ├── chat.html                  # Consultor NOG IA
│   ├── maps.html                   # Mapa de mecânicos (OpenStreetMap)
    ├── dashboard.html             # Dashboard
│   ├── library.html               # Galeria de Vídeos YouTube
│   ├── maintenance_history.html   # Gestão de Manutenções
│   ├── profile.html               # Perfil do Usuário
│   └── static/
│       ├── css/
│       │   ├── car-scrollytelling.css   # Estilos do carrossel 3D e hero
│       │   ├── shared.css               # Estilos compartilhados (navbar, footer)
│       │   ├── responsive.css           # Media queries globais
│       │   ├── chat.css                 # Estilos do consultor NOG IA
│       │   ├── dashboard.css            # Estilos do dashboard
│       │   └── profile.css              # Estilos do perfil
│       ├── js/
│       │   ├── car-scrollytelling.js    # Canvas 2D carrossel com física de perspectiva
│       │   ├── auth.js                  # Autenticação Google OAuth 2.0
│       │   └── config.js                # Configurações do frontend
│       └── logo2.png                    # Logotipo do projeto
└── README.md
```

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos

- Python 3.10 ou superior
- Servidor MySQL (Local ou Nuvem)
- Chave de API do Groq (https://console.groq.com)

### 2. Configuração do Ambiente

Crie um arquivo `.env` na pasta `backend/` com:

```env
# Groq (IA)
API_GROQ=sua_chave_aqui
GROQ_PRIMARY_MODEL=groq/compound-mini
GROQ_UTILITY_MODEL=openai/gpt-oss-20b
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
GROQ_FALLBACK_MODELS=groq/compound

# Busca web de eventos (fallback de baixa confiança)
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
# (ou via API, veja a seção "Segurança e Boas Práticas")
TURNSTILE_SITE_KEY=0x4AAAAAAA...
TURNSTILE_SECRET_KEY=segredo_do_widget
# Frontends autorizados a emitir token, separados por vírgula, SEM protocolo
# (produção: só o domínio real; dev: localhost,127.0.0.1)
TURNSTILE_HOSTNAMES=seu-dominio.com,localhost,127.0.0.1

# API B2B (diagnóstico por foto como serviço assinável)
# Segredo para criar API keys de clientes corporativos (POST /api/b2b/keys).
# OBS: obrigatório — sem ele, a criação de chave retorna 500.
B2B_ADMIN_SECRET=gere_um_segredo_forte
```

### 3. Instalação e Execução

```bash
# Entre na pasta do backend
cd backend

# Instale as dependências
pip install -r requirements.txt

# Execute o servidor
python app.py
```

### 4. Redis para desenvolvimento local

O cache de IA, o cache do dashboard (FIPE + predições de manutenção), as filas RQ (e-mails/manutenção) e o rate limit usam Redis. Para subir um Redis local:

```bash
docker compose up -d   # sobe redis:7-alpine em localhost:6379
```

Defina no `.env`:

```env
REDIS_URL=redis://localhost:6379/0
RATELIMIT_STORAGE_URI=redis://localhost:6379/0
```

Sem Redis, o cache recai sobre memória local (por processo) e as filas RQ não processam jobs.

---

## 🤝 API B2B (Diagnóstico por Foto como Serviço)

API assinável para clientes corporativos enviarem fotos de defeitos e receberem um laudo técnico (JSON ou PDF) gerado por IA. Autenticação via header `X-API-Key` (chave criada em `POST /api/b2b/keys`, protegido por `B2B_ADMIN_SECRET`). A chave é exibida **uma vez**; no banco fica só o hash SHA-256, com comparação em tempo constante. Rate limit por cliente (Redis, com fallback local).

### Endpoints

| Método | Rota | Auth | Descrição |
| :----- | :--- | :--- | :-------- |
| `POST` | `/api/b2b/keys` | `X-Admin-Secret` = `B2B_ADMIN_SECRET` | Cria um cliente e retorna a `api_key` (uso único). Body: `{ "nome", "rate_limit_per_min"? }`. |
| `POST` | `/api/b2b/diagnosis` | `X-API-Key` | Diagnóstico por foto. Body: `{ "image": <base64>, "pergunta"?, "formato"?: "json"\|"pdf" }`. |
| `POST` | `/api/b2b/leads` | público | Captura lead do formulário B2B. Body: `{ "nome", "email", "empresa"?, "telefone"?, "mensagem"? }`. |
| `GET`  | `/api/admin/b2b/leads` | JWT admin | Lista os leads capturados. |

### Exemplo de fluxo

```bash
# 1) Criar chave (admin)
curl -X POST http://localhost:5000/api/b2b/keys \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: $B2B_ADMIN_SECRET" \
  -d '{"nome":"Cliente Teste","rate_limit_per_min":30}'

# 2) Diagnóstico por foto (use a api_key retornada)
IMG=$(base64 -w0 foto.jpg)
curl -X POST http://localhost:5000/api/b2b/diagnosis \
  -H "Content-Type: application/json" \
  -H "X-API-Key: aa_xxxxxxxxxxxxxxxxxxxx" \
  -d "{\"image\":\"$IMG\",\"pergunta\":\"Qual o problema?\"}"
```

> O laudo é gerado por IA e **não substitui inspeção mecânica presencial**.

---

## 📅 Agenda de Eventos Automotivos

Pipeline de coleta de eventos tratado como **dado estruturado** (não scraping genérico):

1. **Provedores de alta confiança** (HTML estável e curado): `nfeiras.com` (automobilismo), `sindirepabrasil.org.br/eventos` (reparação), `diretriz.com.br` (Autopar, Minasparts…) e `interlagos.com.br` (itens automotivos).
2. **Busca web (fallback, baixa confiança):** Bing via **Scrapling** (`Fetcher`, TLS stealth com `curl_cffi`, sem abrir browser); **Brave Search API** entra se `BRAVE_API_KEY` estiver configurado; Playwright como último recurso.
3. **Normalização:** título normalizado (minúsculo, sem acento), `confidence` por fonte (fontes oficiais `0.90`, web `0.40`) e `status` (`upcoming` / `ongoing` / `finished` / `cancelled` / `unknown`).
4. **Deduplicação por score:** similaridade ponderada (título + data + cidade + venue + organizador); mantém o registro de **maior confiança** como canônico.
5. **Geocodificação:** cidade→lat/lng via Nominatim/OSM (cache 30d), reutilizando o cache de geocoding.
6. **Persistência:** upsert na tabela MySQL `events` (id estável via `sha1`), preservando eventos passados e o `status` (não são apagados).
7. **API:** `GET /api/events/automotive` (filtros `uf`, `q`, `categoria`, `periodo`, `lat`/`lng`/`radius` para "perto de mim") e `GET /api/events/<id>`.
8. **Frontend:** `eventos.html` renderiza cards com badge de `status` e selo de fonte; a lista mostra apenas eventos futuros.

> Eventos de comunidade (Facebook/Instagram/WhatsApp) e plataformas fechadas (Sympla/Eventbrite sem token) não são cobertos — ficam como fontes futuras. Nenhuma área protegida/CAPTCHA é contornada.

### Endpoints

| Método | Rota | Auth | Descrição |
| :----- | :--- | :--- | :-------- |
| `GET`  | `/api/events/automotive` | Página exige Premium | Lista eventos (filtros `uf`, `q`, `categoria`, `periodo`, `lat`, `lng`, `radius`). `?force=1` refaz a varredura. |
| `GET`  | `/api/events/<id>` | Página exige Premium | Detalhe de um evento (cache da varredura + MySQL). |
| `POST` | `/api/cron/events-notifications` | `X-Cron-Secret` | Notifica usuários sobre novos eventos (via RQ/thread). |

---

## 🔒 Segurança e Boas Práticas

- **Bcrypt Hashing**: Proteção de senhas com algoritmos de derivação de chave.
- **CSP (Content Security Policy)**: `unsafe-eval` removido por padrão; reative com `CSP_ALLOW_UNSAFE_EVAL=1` apenas se estritamente necessário. `unsafe-inline` é mantido para o frontend estático (migração para nonce é recomendada).
- **JWT Protection**: Endpoints protegidos garantem que apenas usuários autenticados acessem dados sensíveis.
- **Cron Auth**: rotas agendadas devem exigir `X-Cron-Secret` (veja `utils/cron_auth.require_cron_secret` e `MAINTENANCE_EMAIL_CRON_SECRET`).
- **Cloudflare Turnstile**: CAPTCHA anti-bot em `/api/cadastro` (action `signup`) e `/api/login` (action `login`). O siteverify é feito server-side (`utils/turnstile.turnstile_required`) validando `success`, `action` e `hostname` no allowlist `TURNSTILE_HOSTNAMES` — fail-closed em erro de rede/HTTP. Sem `TURNSTILE_SECRET_KEY` configurada, o decorator é no-op (dev/testes). Para criar o widget via API: token com escopo `Account.Turnstile:Edit` e `POST /accounts/<id>/challenges/widgets` (`{"name","domains":[...],"mode":"managed"}`). Tokens do Turnstile são single-use.
- **Segredos**: o `.env` **não deve ser commitado**. Em produção, configure os segredos no Render via dashboard/Environment Group.

---

## 🧪 Testes

Os testes ficam em `backend/tests/` (estilo `unittest`). Mockam banco, Redis e visão por IA, então rodam sem Groq/DB externo.

```bash
cd backend
python -m unittest tests.test_b2b -v     # ou: python tests/test_b2b.py
```

Cobertura de `test_b2b.py` (11 testes, todos passando):
- `POST /api/b2b/keys` — sucesso (201, hash gravado == SHA-256 da chave), secret errado (403), `B2B_ADMIN_SECRET` ausente (500)
- `POST /api/b2b/diagnosis` — sem key (401), sem imagem (400), JSON (200), **PDF** (200, `%PDF`)
- `POST /api/b2b/leads` — sucesso (201), campos faltando (400)
- `GET /api/admin/b2b/leads` — sem admin (403), com admin (200)

> O endpoint de PDF usa `fpdf2`; `_build_laudo_pdf` retorna `bytes`. A criação de chaves exige `B2B_ADMIN_SECRET` definido no `.env`.

---

## 📋 Alterações Recentes

Registro das mudanças feitas nesta sessão de desenvolvimento:

### Cobertura de testes da API B2B
- **Criado `backend/tests/test_b2b.py`** (11 testes, estilo `unittest`) cobrindo todos os endpoints B2B com banco, Redis e visão por IA mockados — roda sem Groq/DB externo.
  - `POST /api/b2b/keys`: sucesso (201, hash gravado == SHA-256 da chave), `X-Admin-Secret` errado (403), `B2B_ADMIN_SECRET` ausente (500).
  - `POST /api/b2b/diagnosis`: sem key (401), sem imagem (400), JSON (200), **PDF** (200, `%PDF`).
  - `POST /api/b2b/leads`: sucesso (201), campos faltando (400).
  - `GET /api/admin/b2b/leads`: sem admin (403), com admin (200).

### Correção de bug de produção (encontrado pelos testes)
- **`backend/routes/b2b.py` (`_build_laudo_pdf`):** o método retornava `pdf.output(dest="S")`, que no `fpdf2` é **`str`**. O endpoint `/api/b2b/diagnosis` com `formato:"pdf"` faz `io.BytesIO(pdf_bytes)` → `TypeError` → **500 em produção**, nunca testado antes. Corrigido para retornar `bytes` via `.encode("latin-1")`, igual ao fallback de erro. Após o fix, o teste `test_diagnosis_pdf` passa (resposta `200` com magic bytes `%PDF`).

### Documentação
- README: adicionada a variável `B2B_ADMIN_SECRET` ao bloco `.env`, a seção **"🤝 API B2B"** (endpoints + fluxo curl) e a seção **"🧪 Testes"**.

### Arquitetura de Eventos Automotivos (estruturada)
- **Nova tabela `events`** em `backend/routes/database.py` (`TABLES_SQL`): `id` (PK estável `sha1`), `title`, `normalized_title`, `category`, `start_date`/`end_date`, `venue_name`, `address`, `city`, `state`, `latitude`/`longitude`, `organizer`, `event_url`, `source`, `status`, `confidence`, `last_verified_at`, índices por UF/cidade/data/status/fonte. Criada via `init_db()`.
- **`backend/services/automotive_events.py`:**
  - `_make_event` estendido com `normalized_title`, `confidence` (via `CONFIDENCE_BY_SOURCE`), `status` (via `derive_status`), `latitude`/`longitude`, `organizer`, `venue_name`, `address`, `country` e **id estável** (`sha1(fonte|titulo|data|cidade)`) — substitui o `hash()` frágil entre processos.
  - `_dedupe_events` por score (título + data + cidade + venue + organizador; mantém o canônico de maior confiança), no lugar do set ingênuo `(titulo, data)`.
  - `_geocode_event` (Nominatim/OSM, reuso de cache) e `persist_events` (upsert MySQL em lote) integrados ao `scan_automotive_events`.
  - `_haversine` + filtro `lat`/`lng`/`radius` em `filter_events` ("perto de mim").
  - Web passa a usar **Scrapling/Bing** como fonte primária (sem browser), Brave API se `BRAVE_API_KEY`, Playwright como fallback.
- **`backend/routes/events.py`:** `GET /api/events/automotive` aceita `lat`/`lng`/`radius`; adicionado `GET /api/events/<id>`.
- **`frontend/public/eventos.html`:** card com badge de `status` (Agendado/Acontecendo/Cancelado/Encerrado/Data a confirmar) e selo de `fonte_nome`. Lista apenas eventos futuros.
- **Testes** (`backend/tests/test_events.py`): +7 testes (normalize, modelo/confiança, status, dedupe por score, mapeamento DB, nearby). Suíte de eventos: **51 passam**, 1 falha pré-existente não relacionada (`test_footer_linka_eventos_html`).
- `requirements.txt`: adicionado `scrapling[fetchers]==0.4.14`.

---

## 📝 Licença e Autoria

Ideia original de **Clara Francisco**.
Desenvolvido por **Júlio César**, **Caio Lima**, **Eduardo Nishida** e **Caio Yugo**.
