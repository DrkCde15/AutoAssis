const PLANS = {
      trial:   { label: "Trial gratuito", limit: 100,   rate: 10,  price: 0 },
      pro_1k:  { label: "Pro 1k",        limit: 1000,  rate: 30,  price: 99 },
      pro_5k:  { label: "Pro 5k",        limit: 5000,  rate: 60,  price: 399 },
      pro_20k: { label: "Pro 20k",       limit: 20000, rate: 120, price: 999 },
    };
    const brl = (v) => v === 0 ? "Grátis" : "R$ " + v.toFixed(2).replace(".", ",") + "/mês";

    function renderPlans() {
      const el = document.getElementById("planCards");
      el.innerHTML = Object.entries(PLANS).map(([k, p]) => {
        const featured = k === "pro_5k";
        return `
        <div class="plan${featured ? " featured" : ""}">
          ${featured ? '<span class="badge">Mais popular</span>' : ""}
          <h3>${p.label}</h3>
          <div class="limit">${p.limit.toLocaleString("pt-BR")}</div>
          <div class="sub">chamadas · ${p.rate}/min</div>
          <div class="price">${brl(p.price)}</div>
          <button class="btn-primary plan-buy" data-plan="${k}" style="margin-top:14px;width:100%;">
            ${p.price === 0 ? "Criar grátis" : "Comprar"}
          </button>
        </div>`;
      }).join("");
      const sel = document.getElementById("keyPlan");
      sel.innerHTML = Object.entries(PLANS).map(([k, p]) =>
        `<option value="${k}">${p.label} (${p.limit.toLocaleString("pt-BR")} chamadas)</option>`).join("");
      el.querySelectorAll(".plan-buy").forEach(btn => {
        btn.addEventListener("click", () => handlePlanAction(btn.dataset.plan));
      });
    }

    function renderKeyArea() {
      const logged = (typeof Auth !== "undefined") && Auth.isAuthenticated && Auth.isAuthenticated();
      document.getElementById("keyArea").classList.toggle("hidden", !logged);
      document.getElementById("loginNeeded").classList.toggle("hidden", logged);
      if (logged) loadUsage();
    }

    async function handlePlanAction(plan) {
      const p = PLANS[plan];
      const msg = document.getElementById("keyMsg");
      const name = document.getElementById("keyName").value.trim();
      if (!name) { msg.className = "msg err"; msg.textContent = "Informe o nome do cliente/integração."; return; }
      if (p.price === 0) {
        await createKey(plan, name, msg);
      } else {
        await checkoutPlan(plan, name, msg);
      }
    }

    async function createKey(plan, name, msg) {
      msg.className = "msg"; msg.textContent = "Criando...";
      try {
        const res = await Auth.authenticatedFetch("/api/b2b/self-serve/keys", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: name, plan }),
        });
        const data = await res.json();
        if (!res.ok) { msg.className = "msg err"; msg.textContent = data.error || "Erro ao criar chave."; return; }
        msg.className = "msg ok"; msg.textContent = "Chave criada com sucesso.";
        document.getElementById("keyValue").textContent = data.api_key;
        document.getElementById("keyResult").classList.remove("hidden");
      } catch (e) { msg.className = "msg err"; msg.textContent = "Falha na requisição."; }
    }

    async function checkoutPlan(plan, name, msg) {
      msg.className = "msg"; msg.textContent = "Gerando checkout...";
      try {
        const res = await Auth.authenticatedFetch("/api/b2b/self-serve/checkout", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: name, plan }),
        });
        const data = await res.json();
        if (!res.ok) { msg.className = "msg err"; msg.textContent = data.error || "Erro ao gerar checkout."; return; }
        msg.className = "msg ok"; msg.textContent = "Chave criada. Conclua o pagamento para ativá-la.";
        document.getElementById("keyValue").textContent = data.api_key;
        document.getElementById("keyResult").classList.remove("hidden");
        if (data.checkout_url) window.open(data.checkout_url, "_blank", "noopener");
      } catch (e) { msg.className = "msg err"; msg.textContent = "Falha na requisição."; }
    }

    document.getElementById("btnCreateKey").addEventListener("click", () => {
      handlePlanAction(document.getElementById("keyPlan").value);
    });

    async function loadUsage() {
      const box = document.getElementById("usageList");
      if (!box) return;
      if (!(typeof Auth !== "undefined" && Auth.isAuthenticated && Auth.isAuthenticated())) {
        box.innerHTML = '<p style="color:var(--muted);font-size:.85rem;">Faça login para ver o consumo.</p>';
        return;
      }
      try {
        const res = await Auth.authenticatedFetch("/api/b2b/usage", { redirectOnInvalid: false });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { box.innerHTML = '<p style="color:#ff6b6b;font-size:.85rem;">' + (data.error || "Erro") + '</p>'; return; }
        if (!data.clients || !data.clients.length) { box.innerHTML = '<p style="color:var(--muted);font-size:.85rem;">Nenhuma chave ainda.</p>'; return; }
        box.innerHTML = data.clients.map(c => {
          const restante = c.requests_restantes == null ? "ilimitado" : c.requests_restantes.toLocaleString("pt-BR");
          const ativo = c.is_active ? "ativa" : "inativa";
          return `<div style="border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-size:.9rem;">
              <strong>${c.nome || c.client_id}</strong><span style="color:var(--muted);">${ativo} · ${c.plan}</span>
            </div>
            <div style="font-size:.82rem;color:var(--muted);margin-top:4px;">Usado ${c.requests_used.toLocaleString("pt-BR")} / ${(c.requests_limit||0).toLocaleString("pt-BR")} · restante ${restante} · ${c.rate_limit_per_min}/min</div>
          </div>`;
        }).join("");
      } catch (e) { box.innerHTML = '<p style="color:#ff6b6b;font-size:.85rem;">Falha ao carregar.</p>'; }
    }
    document.getElementById("btnUsage").addEventListener("click", loadUsage);
    window.addEventListener("auth:changed", () => { if (typeof Auth !== "undefined" && Auth.isAuthenticated && Auth.isAuthenticated()) loadUsage(); });

    document.getElementById("btnLead").addEventListener("click", async () => {
      const msg = document.getElementById("leadMsg");
      const payload = {
        nome: document.getElementById("leadNome").value.trim(),
        email: document.getElementById("leadEmail").value.trim(),
        empresa: document.getElementById("leadEmpresa").value.trim(),
        telefone: document.getElementById("leadTelefone").value.trim(),
        mensagem: document.getElementById("leadMsgInput").value.trim(),
        origem: "site_b2b",
      };
      if (!payload.nome || !payload.email) { msg.className = "msg err"; msg.textContent = "Nome e e-mail são obrigatórios."; return; }

      // Desafio Turnstile (somente quando habilitado no backend)
      if (TurnstileHelper.isEnabled() && !TurnstileHelper.isSolved("cf-turnstile-b2b")) {
        const token = await TurnstileHelper.waitForToken("cf-turnstile-b2b", 10000);
        if (!token) { msg.className = "msg err"; msg.textContent = "Resolva a verificação de segurança antes de enviar."; return; }
      }
      if (TurnstileHelper.isEnabled()) {
        payload.turnstile_token = TurnstileHelper.getToken("cf-turnstile-b2b");
      }

      msg.className = "msg"; msg.textContent = "Enviando...";
      try {
        const res = await fetch("/api/b2b/leads", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { msg.className = "msg err"; msg.textContent = data.error || "Erro ao enviar."; return; }
        msg.className = "msg ok"; msg.textContent = "Recebemos seu contato! Nossa equipe B2B entrará em contato.";
      } catch (e) {
        msg.className = "msg err"; msg.textContent = "Falha na requisição.";
      }
    });

    renderPlans();
    renderKeyArea();
    window.addEventListener("auth:changed", renderKeyArea);
