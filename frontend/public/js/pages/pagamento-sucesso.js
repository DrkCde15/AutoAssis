(function () {
  "use strict";

  var POLL_INTERVAL = 4000;
  var MAX_POLLS = 15;

  var state = { polling: false, polls: 0, timer: null };

  var $ = function (sel) { return document.querySelector(sel); };

  function getPaymentId() {
    var params = new URLSearchParams(window.location.search);
    return params.get("payment_id") || params.get("session_id") || "";
  }

  function setLoading(msg) {
    var icon = $(".lucide-loader-circle");
    var h1 = $("h1");
    var p = $(".section__wrap p");
    var refreshBtn = $(".lucide-refresh-cw");
    if (icon) icon.classList.add("animate-spin");
    if (refreshBtn) {
      refreshBtn.parentElement.disabled = true;
      refreshBtn.classList.add("animate-spin");
    }
    if (h1) h1.textContent = msg || "Verificando pagamento...";
    if (p) p.textContent = "Aguarde enquanto confirmamos seu pagamento.";
  }

  function setSuccess() {
    var iconWrap = $(".rounded-full.bg-accent\\/10");
    var h1 = $("h1");
    var p = $(".section__wrap p");
    var homeBtn = $(".lucide-house");
    var refreshBtn = $(".lucide-refresh-cw");

    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    state.polling = false;

    if (homeBtn && homeBtn.parentElement) {
      homeBtn.parentElement.parentElement.href = "/chat";
      homeBtn.parentElement.textContent = "\nIr para o chat\n";
    }

    if (refreshBtn) {
      var btn = refreshBtn.parentElement;
      if (btn) {
        btn.disabled = true;
        btn.classList.add("hidden");
      }
    }

    if (iconWrap) {
      iconWrap.className = "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10";
      iconWrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle text-green-500" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path></svg>';
    }

    if (h1) {
      h1.textContent = "Pagamento confirmado!";
      h1.className = "text-2xl font-bold text-primary mb-3";
    }
    if (p) p.textContent = "Seu plano premium foi ativado com sucesso.";
  }

  function setError(msg) {
    var iconWrap = $(".rounded-full.bg-accent\\/10");
    var h1 = $("h1");
    var p = $(".section__wrap p");
    var refreshBtn = $(".lucide-refresh-cw");

    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    state.polling = false;

    if (refreshBtn) {
      var btn = refreshBtn.parentElement;
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("hidden");
      }
      refreshBtn.classList.remove("animate-spin");
    }

    if (iconWrap) {
      iconWrap.className = "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10";
      iconWrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle text-red-500" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>';
    }

    if (h1) {
      h1.textContent = "Pagamento não confirmado";
      h1.className = "text-2xl font-bold text-primary mb-3";
    }
    if (p) p.textContent = msg || "Seu pagamento ainda está sendo processado. Tente novamente em alguns instantes.";
  }

  function setPending() {
    var iconWrap = $(".rounded-full.bg-accent\\/10");
    var h1 = $("h1");
    var p = $(".section__wrap p");
    var refreshBtn = $(".lucide-refresh-cw");

    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    state.polling = false;

    if (refreshBtn) {
      var btn = refreshBtn.parentElement;
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("hidden");
      }
      refreshBtn.classList.remove("animate-spin");
    }

    if (iconWrap) {
      iconWrap.className = "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10";
      iconWrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock text-yellow-500" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
    }

    if (h1) {
      h1.textContent = "Pagamento pendente";
      h1.className = "text-2xl font-bold text-primary mb-3";
    }
    if (p) p.textContent = "Aguardando confirmação do gateway de pagamento. Isso pode levar alguns minutos.";
  }

  async function checkPremium() {
    if (!window.auth.isAuthenticated()) {
      setPending();
      return false;
    }
    try {
      var user = await window.api.get("/api/user");
      if (user && user.is_premium) {
        var stored = window.auth.getUser();
        if (stored) {
          stored.is_premium = true;
          localStorage.setItem("autoassist_user", JSON.stringify(stored));
        }
        setSuccess();
        return true;
      }
    } catch (_) {}
    return false;
  }

  async function confirmPayment() {
    if (!window.auth.isAuthenticated()) {
      setPending();
      return;
    }
    try {
      await window.api.post("/api/pay/confirm", {});
    } catch (_) {}
  }

  async function runCheck() {
    if (state.polling) return;
    state.polling = true;

    setLoading("Verificando pagamento...");

    await confirmPayment();

    var confirmed = await checkPremium();
    if (confirmed) return;

    state.polls++;
    if (state.polls >= MAX_POLLS) {
      setPending();
      return;
    }

    state.timer = setTimeout(function () {
      state.polling = false;
      runCheck();
    }, POLL_INTERVAL);
  }

  function handleRefresh() {
    if (state.polling) return;
    state.polls = 0;
    state.polling = false;
    setLoading("Verificando pagamento...");
    runCheck();
  }

  function init() {
    var paymentId = getPaymentId();
    if (!paymentId) {
      setError("ID de pagamento não encontrado na URL.");
      return;
    }

    if (!window.auth.isAuthenticated()) {
      setPending();
      return;
    }

    var refreshBtn = $(".lucide-refresh-cw");
    if (refreshBtn && refreshBtn.parentElement) {
      refreshBtn.parentElement.addEventListener("click", handleRefresh);
    }

    runCheck();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
