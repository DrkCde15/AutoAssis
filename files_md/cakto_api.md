# Documentacao Consolidada da API Cakto

## 1) Visao geral da API

- Plataforma: Cakto API (REST)
- URL base: `https://api.cakto.com.br/`
- Autenticacao: OAuth2 com `client_id` e `client_secret`
- Formato comum:
  - Header: `Authorization: Bearer <access_token>`
  - Header: `Content-Type: application/json` (para endpoints JSON)
- Listagens seguem paginação padrao (`count`, `next`, `previous`, `results`)

## 2) Credenciais e token

### Credenciais
- `client_id`: identifica sua aplicacao
- `client_secret`: autentica sua aplicacao

### Endpoint de token
- `POST /public_api/token/`
- URL completa: `https://api.cakto.com.br/public_api/token/`
- Content-Type: `application/x-www-form-urlencoded`
- Campos esperados (conforme exemplos oficiais):
  - `client_id`
  - `client_secret`

### Exemplo de resposta de sucesso
- `access_token`
- `expires_in` (ex.: 36000 = 10h)
- `token_type` (Bearer)
- `scope` (ex.: `read write products offers orders`)

## 3) Escopos (scopes)

A documentacao indica uso de escopos por recurso e acao, por exemplo:
- `read webhooks`
- `write webhooks`
- `read` / `write` (base)
- outros escopos por recurso (products, offers, orders etc.)

Boas praticas destacadas na docs:
- guardar `client_secret` em variavel de ambiente
- nao expor credenciais no frontend
- usar principio do menor privilegio

## 4) Endpoints de Webhooks

### 4.1) Listar webhooks
- `GET /public_api/webhook/`
- Escopo: leitura de webhooks
- Suporta filtro/paginacao/busca/ordenacao

### 4.2) Criar webhook
- `POST /public_api/webhook/`
- Escopo: `write webhooks`
- Campos principais no body:
  - `name`
  - `url`
  - `products` (lista)
  - `events` (lista de `custom_id`)
  - `status` (ex.: `active`)

### 4.3) Obter webhook
- `GET /public_api/webhook/{id}/`
- Escopo: `read webhooks`

### 4.4) Atualizar webhook
- `PUT /public_api/webhook/{id}/`
- Escopo: `write webhooks`

### 4.5) Deletar webhook
- `DELETE /public_api/webhook/{id}/`
- Escopo: `write webhooks`

### 4.6) Historico de eventos do webhook
- `GET /public_api/webhook/event_history/`
- Escopo: `read webhooks`
- Query de paginacao:
  - `limit`
  - `page`
- Filtros documentados:
  - `id`
  - `app_id`
  - `event_id`
  - `event_status` (+ operadores `__gt`, `__gte`, `__lt`, `__lte`)
  - `sentAt` (+ operadores `__gt`, `__gte`, `__lt`, `__lte`)

### 4.7) Reenviar evento do historico
- `POST /public_api/webhook/event_resend/{id}/`
- Escopo: `write webhooks`
- Resposta esperada: `{"detail": "Evento reenviado com sucesso"}`

### 4.8) Enviar evento de teste para webhook
- `POST /public_api/webhook/event_test/{id}/`
- Escopo: `write webhooks`
- Query param:
  - `event_id` (tipo de evento que deseja testar)

## 5) Eventos de webhook mapeados

Eventos documentados na Cakto (ciclo de assinatura + compra avulsa):
- `initiate_checkout`
- `checkout_abandonment`
- `purchase_approved` (compra avulsa aprovada)
- `purchase_refused` (compra avulsa recusada)
- `pix_gerado`, `boleto_gerado`, `picpay_gerado`, `openfinance_nubank_gerado` (links de pagamento gerados)
- `chargeback`
- `refund`
- `subscription_created` (assinatura criada/ativa)
- `subscription_renewed` (renovacao confirmada)
- `subscription_renewal_refused` (renovacao recusada / pagamento falhou)
- `subscription_canceled` (cancelamento)
- `subscription_paused` (pausa)
- `subscription_resumed` (retomada)

### 5.1) Mapeamento para o estado de Premium no AutoAssist

O webhook (`backend/routes/payment.py`) usa `CaktoService` para classificar o evento
(`PAID_EVENTS` / `REVOKE_EVENTS` em `backend/services/cakto.py`):

| Evento | Acao no AutoAssist | Evento de analytics |
| --- | --- | --- |
| `purchase_approved` | ativa premium (compra avulsa) | `premium_upgrade` |
| `subscription_created` | ativa premium | `premium_upgrade` |
| `subscription_renewed` | mantem/atualiza premium | `premium_upgrade` (se free->premium) |
| `purchase_refused` | revoga premium | `premium_churn` |
| `refund` | revoga premium | `premium_churn` |
| `chargeback` | revoga premium | `premium_churn` |
| `subscription_canceled` | revoga premium (cancelamento) | `premium_churn` |
| `subscription_renewal_refused` | revoga premium (falha de renovacao) | `premium_churn` |
| `subscription_paused` | **nao tratado** (premium segue ativo) | — |
| `subscription_resumed` | **nao tratado** | — |

Implicacao operacional: como `subscription_canceled` e `subscription_renewal_refused`
ja estao em `REVOKE_EVENTS` e disparam `premium_churn`, **nao ha necessidade de um job
agendado de expiracao** — a Cakto e a fonte da verdade de cancelamento / nao-pagamento.
Porem, exige que o app de webhook configurado na Cakto esteja inscrito nesses eventos de
assinatura; caso contrario o cancelamento nunca chega e o usuario permanece premium.

## 6) Estrutura de payload de evento (amostra real da docs)

No historico de eventos de webhook, aparece payload com estrutura:
- `event` (ex.: `purchase_approved`)
- `secret`
- `data` com campos como:
  - `id`
  - `refId`
  - `status` (ex.: `paid`)
  - `amount`
  - `paidAt`
  - `paymentMethod`, `paymentMethodName`
  - `customer` (`name`, `email`, `phone`, `docType`, `docNumber`)
  - `product` e `offer`
  - `checkoutUrl`
  - `subscription` (quando aplicavel)

## 7) Outros grupos de endpoints existentes na docs (menu)

A navegacao oficial mostra tambem:
- Pedidos:
  - `GET /public_api/orders/` (Listar Pedidos)
  - `GET /public_api/orders/{id}/` (Obter Pedido - usado na validacao ativa do webhook)
  - `POST` Reembolsar Pedido
  - `POST` Reenviar Email de Aprovacao
  - `POST` Reenviar Acesso
- Produtos:
  - `GET` Listar Produtos
  - `GET` Obter Produto
  - `PUT` Atualizar Produto
- Ofertas:
  - `GET` Listar Ofertas
  - `POST` Criar Oferta
  - `GET` Obter Oferta
  - `PUT` Atualizar Oferta
  - `DELETE` Deletar Oferta

Observacao: os detalhes completos desses grupos (body, filtros e respostas) nao foram todos extraidos nesta consolidacao, mas os endpoints constam no menu oficial.

## 8) Como isso conversa com o AutoAssist (estado atual)

No projeto AutoAssist, o fluxo de pagamento funciona assim:
- Checkout do usuario: redirecionado via `CAKTO_CHECKOUT_URL` (link de pagamento parametrizado)
- Recebimento: via webhook recebido na rota `/api/pay/webhook/cakto`
- Retorno pos-compra recomendado: configurar no produto/checkout da Cakto a URL
  `https://autoassist-l9lr.onrender.com/pagamento-sucesso.html`
- Seguranca 1: validacao de assinatura basica via `CAKTO_WEBHOOK_SECRET`
- Seguranca 2 (Hardening): **Validacao ativa na API da Cakto** consultando o status real da transacao.

Campos de ambiente usados no projeto:
- `CAKTO_CLIENT_ID` e `CAKTO_CLIENT_SECRET` (recomendado para autenticacao OAuth2 na Cakto)
- `CLIENT_ID` e `CLIENT_SECRET` (fallback legado)
- `CAKTO_CHECKOUT_URL`
- `CAKTO_WEBHOOK_SECRET`
- `CAKTO_APPEND_REF`
- `CAKTO_ACCEPT_QUERY_SECRET`
- `BASE_URL` (para uso geral da aplicacao)

## 9) Hardening Implementado (Validacao Ativa)

Para garantir seguranca total e evitar fraudes de webhooks falsos, o AutoAssist implementou a verificacao ativa do pagamento (Double Check) na classe `CaktoService`:
1. Recebe o webhook informando aprovacao (ex: `purchase_approved`).
2. Extrai o ID da transacao (ID do pedido).
3. Obtem um `access_token` em tempo real enviando `CLIENT_ID` e `CLIENT_SECRET` para `POST /public_api/token/`.
4. Consulta diretamente a API oficial da Cakto em `GET /public_api/orders/{id}/`.
5. Valida se o status retornado pela resposta segura e realmente `paid` ou `approved`.
6. Somente se o status for confirmado com a fonte da verdade, o usuario e ativado como premium no banco de dados.

## 10) Links oficiais usados nesta consolidacao

- Introducao: https://docs.cakto.com.br/
- Introducao (slug): https://docs.cakto.com.br/introduction
- Autenticacao: https://docs.cakto.com.br/authentication
- Listar Webhooks: https://docs.cakto.com.br/api-reference/webhooks/list
- Criar Webhook: https://docs.cakto.com.br/api-reference/webhooks/create
- Obter Webhook: https://docs.cakto.com.br/api-reference/webhooks/retrieve
- Atualizar Webhook: https://docs.cakto.com.br/api-reference/webhooks/update
- Deletar Webhook: https://docs.cakto.com.br/api-reference/webhooks/delete
- Historico de Eventos: https://docs.cakto.com.br/api-reference/webhooks/event-history
- Reenviar Evento: https://docs.cakto.com.br/api-reference/webhooks/resend-event
- Evento de Teste: https://docs.cakto.com.br/api-reference/webhooks/test-webhook

## 11) Instrumentacao de Analytics (premium_upgrade / premium_churn)

Historico: o evento `premium_upgrade` (e `premium_churn`) nao era registrado em
`analytics_events`, deixando o funil de conversao com o estagio `signup -> premium_upgrade`
vazio. Causa: a emissao estava acoplada apenas ao webhook da Cakto e a uma chamada
explicita fragil (`if updated and prior != target` no proprio webhook), que nao cobria
outros pontos de concessao de premium e era suscetivel a dupla emissao.

Correcao: toda mudanca real de estado de premium foi centralizada em um unico ponto.
As funcoes `_set_premium_by_user_id` e `_set_premium_by_email` (em `backend/routes/payment.py`,
as unicas rotinas que efetivamente executam `UPDATE users SET is_premium = ...`) agora:
- leem o estado anterior (`prior`);
- aplicam o UPDATE;
- chamam `_emit_premium_transition(user_id, plan, target_state, prior)` **somente quando
  `prior != target_state`** (transicao real).

Como essas duas funcoes sao as unicas que alteram `is_premium` no codigo, qualquer caminho
que conceda/revogue premium (webhook Cakto, credito de indicacao aplicado na ativacao,
futuros trial/admin) passa a instrumentar `premium_upgrade` (free->premium) e
`premium_churn` (premium->free) automaticamente. O metadata do evento inclui
`plan` (do pedido) e `via: cakto_webhook`.

### 11.1) Idempotencia contra retries do webhook
A condicao `prior != target_state` garante que re-entregas do mesmo webhook (retry da Cakto)
nao dupliquem o evento: se o usuario ja estiver premium e chegar outro `subscription_renewed`,
`prior == target == True` => nenhum evento emitido. O mesmo para re-entrega de um
cancelamento ja processado. Isso evita inflacao de `premium_upgrade` / `premium_churn` no funil.

### 11.2) Webhook Cakto (payment.py)
O webhook `cakto_webhook` agora apenas chama `_set_premium_by_user_id(user_id, target_state,
plan=plan_name)` / `_set_premium_by_email(email, target_state, plan=plan_name)` e delega a
emissao a essas funcoes (a chamada explicita de emissao foi removida do webhook para evitar
dupla contagem). A validacao ativa (`verify_transaction_status` -> `GET /public_api/orders/{id}/`)
continua sendo a fonte da verdade antes de aplicar o estado.

### 11.3) Pendentes / riscos conhecidos
- `subscription_paused` / `subscription_resumed` nao sao tratados (premium fica ativo durante
  pausa). Se a Cakto nao enviar `subscription_canceled` ao expirar uma pausa, o usuario pode
  permanecer premium.
- `verify_transaction_status` usa `GET /public_api/orders/{id}/` (estrutura documentada);
  conviria validar contra a resposta real da Cakto em producao para garantir o parse de `status`.
- Nenhuma outra forma de conceder premium (ex.: seed/admin manual) emite o evento hoje; se
  adicionada, deve passar por `_set_premium_by_user_id`/`_set_premium_by_email` para herdar a instrumentacao.
