# Plano de Execução - AutoAssist IA (Marketing & Monetização)

> Autor: análise CMO/Mkt Sênior · Foco: viabilidade comercial.
> Status: proposta de implementação. Prioridades: **P0 = crítico (quebra de negócio)** · P1 = alta · P2 = média · P3 = baixa.

---

## 0. Princípios (premissas do plano)

1. **Fechar o vazamento antes de escalar** - não gastar 1 real em tráfego pago enquanto o free der IA ilimitada.
2. **LTV recorrente > pagamento único** - usar a assinatura que o Cakto já suporta.
3. **1 ICP na comunicação** (dono de carro comum); Mod Passport vira feature, não headline.
4. **Tudo mensurável** - instrumentar burn por usuário antes de qualquer campanha.

---

## 1. Diagnóstico-resumo (evidências)

| Achado | Evidência | Impacto |
|---|---|---|
| Chat free sem gate → IA ilimitada grátis | `backend/routes/pages.py:2360` (`/api/chat`), só guest tem limite 5 (`pages.py:79`) | Burn descontrolado, LTV<0 |
| Premium era perpétuo por R$ 29,90 (pagamento único) | `backend/routes/payment.py:17-19`, `frontend/public/planos.html:404`, `index.html:859` | LTV não cobria custo de inferência. **JÁ ALTERADO:** agora é assinatura mensal R$ 19,90/mês (`payment.py`), sem plano anual na Cakto. |
| Referral dá "1 mês de Premium" | `backend/routes/auth.py:47-53` | Entrega IA grátis; incoerente c/ "perpétuo" |
| Posicionamento dividido (3 ICPs) | `index.html:760` (gearheads/build) vs `og:title` (`index.html:12`, "mecânico particular") | Conversão e clareza baixas |
| Cadastro exige veículo obrigatoriamente | `backend/routes/auth.py:511-515` | Fricção no topo do funil |
| Manutenção é premium-only | `backend/routes/pages.py:1678, 1811` | Free não cria hábito nem recebe alerta |
| "FIPE ajustada" inventada (+2–25%) | `backend/routes/pages.py:1280-1289` | Risco de credibilidade/legal |
| Cakto já suporta assinatura | `backend/services/cakto.py:15-27` | Facilita mudança p/ recorrente |
| B2B de laudo por foto existe, mas sem self-serve | `backend/routes/b2b.py` | Maior oportunidade inexplorada |

---

## 2. Backlog Priorizado

### P0-1 - Gate de uso no chat free (salva o negócio) - FEITO
- **Problema:** `/api/chat` (`pages.py:2360`) e `/api/voice` (`pages.py:2473`) não têm gate; free tem IA ilimitada. Só guest tem limite 5 (`pages.py:79`).
- **Solução:** Quota mensal p/ free: **30 mensagens/mês + 5 fotos**. Premium = ilimitado. Criar tabela `chat_usage(user_id, mes, count)` (ou coluna em `users`). Checar no início de `chat()` e `voice()`; retornar `403 + {"upgrade":true}` ao estourar.
- **Onde mexer:** `backend/routes/pages.py` (chat, voice), `backend/routes/database.py` (schema), `frontend/public/chat.html` (paywall).
- **Esforço:** M (2–3 dias). **Dependência:** P0-2.
- **Critério de aceite:** Free após 30 msg recebe bloqueio com CTA premium; premium sem limite; contador zera todo mês.
- **KPI:** Burn por usuário ativo ↓; free→paid conversion ↑.

### P0-2 - Pricing recorrente (viabiliza LTV) - FEITO (só mensal R$ 19,90; anual não está na Cakto)
- **Problema:** `PREMIUM_PLANS={"completo":29.90}` (`payment.py:17-19`) é pagamento único perpétuo. LTV < custo de inferência.
- **Solução:** Plans: **Free** (créditos), **Premium Mensal R$ 19,90/mês**, **Premium Anual R$ 149/ano** (2 meses grátis). Reaproveitar `subscription_created/renewed` e `subscription_canceled` (`cakto.py:15-27`). Premium passa a ter `premium_expires_at` = data de renovação (modelo já suportado por `_effective_premium`, `auth.py:107-119`).
- **Onde mexer:** `payment.py` (catálogo), `pages.py` (FIPE/ML/oficinas atrás do premium), `planos.html` (copy "pagamento único"→"/mês", FAQ), `index.html:859` (preço).
- **Esforço:** M (3–4 dias). **Dependência:** nenhuma (Cakto já suporta).
- **Critério de aceite:** Webhook de assinatura ativa/renova/remove premium; tela de planos mostra mensal/anual; free sem FIPE/ML/oficinas ilimitadas.
- **KPI:** MRR, ARPU, churn mensal.

### P0-3 - 1 ICP: reescrever posicionamento (home + meta) - FEITO (hero, features, OG/meta, Mod Passport como card secundário)
- **Problema:** Hero fala "gearheads/build" (`index.html:760`) mas OG diz "mecânico particular" (`index.html:12`). Três ICPs na mesma tela.
- **Solução:** Headline única: *"Seu copiloto de carro com IA: diagnóstico, valor FIPE real e zero surpresas na oficina."* Mod Passport vira card secundário. Atualizar `og:title/description` (`index.html:12-13`), `meta description` (`index.html:8`) e `planos.html` headers.
- **Onde mexer:** `index.html` (brand-hero, :759-764), `planos.html:374-375`, `chat.html` (tom).
- **Esforço:** P (1 dia, copy). **Dependência:** nenhuma.
- **Critério de aceite:** Visitante descreve em 1 frase o que é e pra quem é; mensagens consistentes entre OG e hero.
- **KPI:** Bounce rate da home ↓; signup rate ↑.

### P0-4 - Disclaimer de IA (mitiga risco legal) - FEITO (banner no chat + SYSTEM_PROMPT da NOG)
- **Problema:** Diagnóstico de IA sem aviso claro de "não substitui inspeção" no chat consumer (só existe no B2B).
- **Solução:** Banner fixo no `chat.html` + rodapé da resposta do NOG: *"O NOG auxilia, mas não substitui inspeção de mecânico presencial."*
- **Onde mexer:** `frontend/public/chat.html`, `services/nogai.py` (SYSTEM_PROMPT).
- **Esforço:** P (0,5 dia). **Dependência:** nenhuma.
- **Critério de aceite:** Disclaimer visível antes da 1ª mensagem e em todo laudo.
- **KPI:** Redução de exposição legal (checklist de compliance).

### P0-5 - Cadastro leve - FEITO (backend auth.py + frontend cadastro.html relaxados)
- **Problema:** `auth.py:511-515` exige marca+modelo do veículo no cadastro → fricção no topo do funil.
- **Solução:** Veículo opcional no signup; solicitar depois no onboarding (dashboard/chat).
- **Onde mexer:** `auth.py` (cadastro), `frontend/public/cadastro.html`, `onboarding/revisao` (`pages.py:1510`).
- **Esforço:** P (1 dia). **Dependência:** nenhuma.
- **Critério de aceite:** Cadastro com só e-mail+senha conclui 201; veículo sugerido pós-login.
- **KPI:** Signup completion rate ↑.

### P1-1 - Retenção free (manutenção desbloqueada)
- **Problema:** Manutenção é premium-only (`pages.py:1678, 1811`) → free não cria hábito nem recebe alerta.
- **Solução:** Free pode registrar até **3 manutenções / 1 veículo**; alertas de manutenção funcionam p/ free. PDF e FIPE "ajustada" seguem premium.
- **Onde mexer:** `pages.py` (relaxar `ensure_premium_user` com contador), `auth.py` (plano free).
- **Esforço:** M (2 dias). **Dependência:** P0-2.
- **Critério de aceite:** Free cadastra 3 manutenções e recebe e-mail de alerta.
- **KPI:** D30 retention ↑.

### P1-2 - B2B self-serve (maior oportunidade de receita)
- **Problema:** API de laudo por foto (`b2b.py`) é só admin-secret; sem pricing, sem landing, sem self-serve.
- **Solução:** Landing `b2b.html` + planos por requisição (ex.: R$ 0,10/laudo ou pacotes 1k/5k/20k). Fluxo de signup de cliente corporativo + emissão de API key com cartão.
- **Onde mexer:** Novo `frontend/public/b2b.html`, `backend/routes/b2b.py` (self-serve key creation + billing), `payment.py` (checkout B2B).
- **Esforço:** G (2–3 semanas). **Dependência:** P0-2 (billing).
- **Critério de aceite:** Cliente corporativo contrata plano, recebe API key, é cobrado por volume.
- **KPI:** MRR B2B, requisições faturadas.

### P1-3 - Conteúdo SEO (aquisição orgânica)
- **Problema:** Zero conteúdo de aquisição; só meta tags.
- **Solução:** 10 artigos/mês usando as intenções já classificadas (`nogai.py:893`): "Quanto custa trocar X", "Barulho Y causa", "FIPE [carro] vale quanto". Cada um termina com CTA "pergunte ao NOG".
- **Onde mexer:** Novo blog estático em `frontend/public/blog/` ou CMS leve.
- **Esforço:** M contínuo (redator). **Dependência:** P0-3 (tom/ICP).
- **Critério de aceite:** 10 URLs indexadas/mês; tráfego orgânico crescente.
- **KPI:** Sessões orgânicas, signups por conteúdo.

### P2-1 - Referral com créditos (não premium)
- **Problema:** `auth.py:47-53` dá "1 mês de Premium" - entrega IA ilimitada grátis e é incoerente com produto perpétuo.
- **Solução:** Recompensa = **créditos ou desconto de 1 mês na assinatura** (não premium grátis).
- **Onde mexer:** `auth.py` (`_grant_referral_premium`), `planos.html`.
- **Esforço:** P (1 dia). **Dependência:** P0-2.
- **Critério de aceite:** Indicado ganha desconto aplicável na assinatura; não premium ilimitado.
- **KPI:** K-factor, CAC ↓.

### P2-2 - Afiliados (monetização de recomendação)
- **Problema:** Recomenda peças (Mercado Livre) e carros (WebMotors) só redireciona, sem comissão.
- **Solução:** Injetar IDs de afiliado nos links de `build_recommendations` (`pages.py:407`) e no e-commerce do NOG.
- **Onde mexer:** `services/web_scraping.py`, `pages.py`, `nogai.py` (termos de busca).
- **Esforço:** M (3 dias). **Dependência:** contas de afiliado.
- **Critério de aceite:** Cada link de recomendação carrega tag de afiliado; clique rastreado.
- **KPI:** Receita de afiliação, conversão de link.

### P3 - Comunidade Mod Passport (retenção por status)
- **Problema:** Mod Passport é solitário; sem efeito de rede.
- **Solução:** Perfis públicos de builds, comparação, feed de mods.
- **Esforço:** G. **Dependência:** P0-3 (definir como feature secundária).

---

## 3. Novo Modelo de Preço (concreto)

| Plano | Preço | Limites | Diferencial |
|---|---|---|---|
| **Free** | R$ 0 | 30 msgs/mês, 5 fotos, 1 veículo, 3 manutenções, FIPE básica | Diagnóstico essencial |
| **Premium Mensal** | R$ 19,90/mês | Ilimitado, FIPE tempo real, previsão ML, oficinas, Mod Passport, PDF, alertas | "Copiloto completo" |
| **Premium Anual** | R$ 149/ano | = Mensal | **NÃO IMPLEMENTADO** (ausente na Cakto); só mensal existe hoje |
| **B2B** | por requisição | Laudo por foto em API, rate-limited | Recorrência por volume |

Ancoragem: *"O preço de uma troca de óleo por mês, e você para de levar susto na oficina."*

---

## 4. Roadmap Temporal

- **Semanas 0–1 (P0):** P0-1 chat gate · P0-2 pricing recorrente · P0-3 posicionamento · P0-4 disclaimer · P0-5 cadastro leve. *Gelar tráfego pago até aqui.*
- **Semanas 2–4 (P1):** P1-1 retenção free · P1-3 blog SEO (primeiros 10) · instrumentar burn por usuário.
- **Mês 2 (P1/P2):** P1-2 B2B self-serve (MVP) · P2-1 referral créditos · parceria 1 canal YouTube.
- **Mês 3–6 (P2/P3):** P2-2 afiliados · escala SEO (40+ URLs) · P3 comunidade Mod Passport · Ads só após LTV validado.

---

## 5. Governança & Instrumentação (junto com P0)

- Dashboard interno: **burn de IA por usuário/mês**, free→paid %, activation rate, D30 retention, MRR, CAC.
- Revisão semanal P0 nos primeiros 30 dias.

---

## 6. Ordem de Implementação (sequência técnica)

1. `database.py` → schema de uso (chat_usage / colunas de plano).
2. `pages.py` → gate em `chat()`/`voice()` + relaxar manutenção free.
3. `payment.py` + `cakto.py` → planos recorrentes + webhook de assinatura.
4. `auth.py` → cadastro leve + referral por crédito.
5. `frontend` → planos.html, index.html, chat.html, cadastro.html (copy + paywall).
6. `b2b.py` + `b2b.html` → self-serve (fase posterior).

---

## 7. Copy Recomendada (P0-3)

- **Hero (index.html:760):** *"Seu copiloto de carro com IA: diagnostico, valor FIPE real e zero surpresas na oficina."* (JÁ APLICADO)
- **OG/meta (index.html:8,12-13):** *"AutoAssist IA: seu copiloto de carro com IA. Diagnostique, consulte a FIPE e evite sustos na oficina."* (JÁ APLICADO; sem travessão)
- **Plano grátis (planos.html:387):** *"Até 30 consultas/mês com a IA NOG"* (cria escassez + motivo p/ premium).
- **CTA premium (index.html:863):** *"Garantir meu copiloto premium"*.
- **Mod Passport:** reposicionar como card secundário: *"Para quem tuneia o carro: documente mods e veja o valor estimado de mercado."*

---

## 8. Status de Execução (atualizado)

| Item | Estado | Onde | Resíduo / dependência externa |
|---|---|---|---|
| P0-1 Gate chat | FEITO | `pages.py` (`_is_effective_premium`, `get_free_chat_usage_month`, gate em `/api/chat` e `/api/voice`) | - |
| P0-2 Pricing recorrente | FEITO | `payment.py` (R$ 19,90/mês) + frontend | Só mensal existe na Cakto; anual ausente |
| P0-3 Posicionamento | FEITO | `index.html` (hero, features, OG/meta), `planos.html` | - |
| P0-4 Disclaimer | FEITO | `nogai.py` (SYSTEM_PROMPT) + `chat.html` (banner) | - |
| P0-5 Cadastro leve | FEITO | `auth.py` + `cadastro.html` | - |
| P1-1 Manutenção free | FEITO | `pages.py` (`ensure_maintenance_access`, FREE_MAINTENANCE_LIMIT=3) + `auth.js` (maintenance_history em FREE_PAGES) | - |
| P1-2 B2B self-serve | FEITO (MVP) | `b2b.py` (plano/tier, quota, `/api/b2b/self-serve/keys`), `b2b.html`, `database.py` (colunas api_clients) | Falta produto B2B na Cakto para faturamento real por volume (hoje é quota/plano, não cobrança) |
| P1-3 Blog SEO | FEITO (scaffold) | `frontend/public/blog/` (index + 2 posts) + link no footer do `index.html` | Precisa de redator para escalar a 10+ URLs/mês |
| P2-1 Referral crédito | FEITO | `auth.py` (`_grant_referral_credit` + `referral_credit_months`), `payment.py` (aplica crédito na ativação), `perfil.html` | - |
| P2-2 Afiliados | FEITO (config-driven) | `web_scraping.py` (`_with_affiliate`/`_affiliate_id`, envs `AFFILIATE_MERCADOLIVRE_ID`, `AFFILIATE_WEBMOTORS_ID`) | Precisa das contas/IDs de afiliado reais para gerar receita |
| §5 Instrumentação | FEITO (básica) | `pages.py` (`/api/admin/analytics/burn`, admin only) | Evoluir para dashboard com MRR/retention/CAC |
| **Risco FIPE ajustada** | RESOLVIDO | `pages.py` (`_calcular_detalhe`, `FIPE_AJUSTADA_DISCLAIMER`), `web_scraping.py` (`get_market_price_estimate`), `dashboard.html` | Base fundamentada na Tabela FIPE ou mediana de anúncios reais (ML); ajuste por mods agora é conservador (teto 12%) e transparente (mostra fonte + aviso de que não é avaliação oficial). Relabel "FIPE ajustada" → "Valor estimado" |
| P3 Comunidade Mod Passport | PENDENTE | - | Escopo grande (perfis públicos, feed, efeito de rede); exige definição de produto à parte |
