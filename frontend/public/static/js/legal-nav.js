(function () {
  "use strict";

  function show(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "";
  }

  function hide(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }

  function renderPublic() {
    show("navLogin");
    show("navSignup");
    hide("navDashboard");
    hide("navMaintenance");
    hide("navLibrary");
    hide("navMaps");
    hide("navProfile");
    hide("navLogout");
  }

  function renderAuthenticated() {
    show("navDashboard");
    show("navMaintenance");
    show("navLibrary");
    show("navMaps");
    show("navProfile");
    show("navLogout");
    hide("navLogin");
    hide("navSignup");
    if (typeof Notifications !== "undefined") Notifications.init();
  }

  function attachLogout() {
    const logoutBtn = document.getElementById("navLogout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => Auth.logout());
    }
  }

  // Renderiza o header correto DE FORMA SÍNCRONA (antes do primeiro paint),
  // usando apenas o token local. Elimina o flash de "deslogado -> logado".
  function renderSync() {
    if (!document.querySelector("[data-legal-nav]") || typeof Auth === "undefined") return;
    attachLogout();
    if (Auth.isAuthenticated()) {
      renderAuthenticated();
    } else {
      renderPublic();
    }
  }
  renderSync();

  document.addEventListener("DOMContentLoaded", async () => {
    if (!document.querySelector("[data-legal-nav]") || typeof Auth === "undefined") return;

    if (!Auth.isAuthenticated()) {
      renderPublic();
      return;
    }

    try {
      const user = await Auth.syncUser({ redirectOnInvalid: false });
      if (user || Auth.isAuthenticated()) {
        renderAuthenticated();
      } else {
        renderPublic();
      }
    } catch {
      if (!Auth.isAuthenticated()) renderPublic();
    }
  });
})();
