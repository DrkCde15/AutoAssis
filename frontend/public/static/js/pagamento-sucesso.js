// Apenas usuários autenticados (que realizaram o pagamento) podem ver esta
    // página. Visitantes sem login são redirecionados para a 404.
    if (typeof Auth === "undefined" || !Auth.isAuthenticated()) {
      window.location.replace("404.html");
      throw new Error("pagamento-sucesso: acesso negado");
    }

    // Usuário autenticado: libera a exibição do conteúdo da página.
    var mainContent = document.getElementById("main-content");
    if (mainContent) mainContent.style.display = "";

    const statusBox = document.getElementById("payment-status");
    const retryButton = document.getElementById("retry-button");
    const primaryAction = document.getElementById("primary-action");

    function setStatus(message, type = "") {
      statusBox.className = `status ${type}`.trim();
      statusBox.textContent = message;
    }

    function setSuccess() {
      setStatus("Premium liberado. Bem-vindo ao AutoAssist Premium.", "ok");
      primaryAction.textContent = "Acessar painel";
      primaryAction.href = "dashboard.html";
      retryButton.textContent = "Ir para o chat";
      retryButton.disabled = false;
      retryButton.onclick = () => {
        window.location.href = "chat.html";
      };
    }

    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function checkPremiumStatus({ attempts = 8 } = {}) {
      retryButton.disabled = true;
      statusBox.innerHTML = '<span class="spinner" aria-hidden="true"></span> Verificando sua assinatura...';

      if (!Auth.isAuthenticated()) {
        setStatus("Entre com a mesma conta usada na compra para finalizar a liberação.", "warn");
        primaryAction.textContent = "Entrar na conta";
        primaryAction.href = "login.html";
        retryButton.disabled = false;
        retryButton.textContent = "Tentar novamente";
        return;
      }

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const user = await Auth.syncUser({ force: true, redirectOnInvalid: false });
        if (user && user.is_premium) {
          setSuccess();
          return;
        }

        try {
          const res = await Auth.authenticatedFetch("/api/pay/confirm", { method: "POST" });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.is_premium) {
            await Auth.syncUser({ force: true, redirectOnInvalid: false });
            setSuccess();
            return;
          }
        } catch {
          // A sincronizacao acima ja cobre o estado final; seguimos tentando.
        }

        if (attempt < attempts) {
          setStatus("Pagamento recebido. Aguardando confirmacao...", "warn");
          await wait(3000);
        }
      }

      setStatus("Pagamento recebido, mas a liberacao ainda nao apareceu na sua conta. Atualize em alguns segundos.", "warn");
      retryButton.disabled = false;
      retryButton.textContent = "Atualizar status";
      retryButton.onclick = () => checkPremiumStatus({ attempts: 5 });
    }

    retryButton.addEventListener("click", () => checkPremiumStatus({ attempts: 5 }));
    checkPremiumStatus();
