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

  document.addEventListener("DOMContentLoaded", async () => {
    if (!document.querySelector("[data-legal-nav]") || typeof Auth === "undefined") return;

    const logoutBtn = document.getElementById("navLogout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => Auth.logout());
    }

    if (!Auth.isAuthenticated()) {
      renderPublic();
      return;
    }

    renderAuthenticated();

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
