/**
 * nav.js — Hamburger menu + mobile drawer + auth-aware navbar
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var hamburger = document.querySelector("[data-hamburger]");
    var drawer = document.querySelector("[data-mobile-drawer]");
    var backdrop = document.querySelector("[data-mobile-backdrop]");

    if (!hamburger || !drawer) return;

    function openDrawer() {
      drawer.classList.add("translate-x-0");
      drawer.classList.remove("translate-x-full");
      if (backdrop) {
        backdrop.classList.remove("pointer-events-none", "opacity-0");
        backdrop.classList.add("pointer-events-auto", "opacity-100");
      }
      document.body.style.overflow = "hidden";
      hamburger.setAttribute("aria-expanded", "true");
      hamburger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    }

    function closeDrawer() {
      drawer.classList.remove("translate-x-0");
      drawer.classList.add("translate-x-full");
      if (backdrop) {
        backdrop.classList.add("pointer-events-none", "opacity-0");
        backdrop.classList.remove("pointer-events-auto", "opacity-100");
      }
      document.body.style.overflow = "";
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>';
    }

    function toggleDrawer() {
      if (drawer.classList.contains("translate-x-0")) {
        closeDrawer();
      } else {
        openDrawer();
      }
    }

    hamburger.addEventListener("click", toggleDrawer);

    if (backdrop) {
      backdrop.addEventListener("click", closeDrawer);
    }

    // Close on ESC
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("translate-x-0")) {
        closeDrawer();
      }
    });

    // Close drawer on nav link click
    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeDrawer);
    });

    // Close drawer on outside click
    document.addEventListener("click", function (e) {
      if (
        drawer.classList.contains("translate-x-0") &&
        !drawer.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        closeDrawer();
      }
    });

    // Desktop: ensure drawer is hidden on md+
    var mql = window.matchMedia("(min-width: 768px)");
    function handleViewport(e) {
      if (e.matches) {
        closeDrawer();
        if (backdrop) backdrop.style.display = "none";
        drawer.style.display = "none";
      } else {
        if (backdrop) backdrop.style.display = "";
        drawer.style.display = "";
      }
    }
    mql.addEventListener("change", handleViewport);
    handleViewport(mql);

    // --- Auth-aware navbar ---
    updateNavbar();

    function updateNavbar() {
      var isAuth = window.auth && window.auth.isAuthenticated();

      // Desktop nav
      var desktopNav = document.querySelector("header nav > div.hidden.md\\:flex");
      if (desktopNav) {
        toggleAuthLinks(desktopNav, isAuth);
      }

      // Mobile drawer nav links
      var drawerLinks = drawer.querySelector("div.flex.flex-col.gap-1") || drawer;
      toggleAuthLinks(drawerLinks, isAuth);
    }

    function toggleAuthLinks(container, isAuth) {
      // Find Entrar and Criar Conta links
      var links = container.querySelectorAll("a");
      var entrarLink = null;
      var criarLink = null;

      links.forEach(function (a) {
        var href = a.getAttribute("href");
        if (href === "/login") entrarLink = a;
        if (href === "/cadastro") criarLink = a;
      });

      if (isAuth) {
        // Hide Entrar/Criar Conta
        if (entrarLink) entrarLink.style.display = "none";
        if (criarLink) criarLink.style.display = "none";

        // Check if auth links already exist
        if (!container.querySelector("[data-auth-link]")) {
          var user = window.auth.getUser();
          var name = user ? (user.nome || user.name || "Perfil") : "Perfil";

          // Dashboard link
          var dashLink = document.createElement("a");
          dashLink.href = "/dashboard";
          dashLink.setAttribute("data-auth-link", "1");
          dashLink.className = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 text-secondary hover:bg-white/5 hover:text-primary";
          dashLink.innerHTML = '<span class="shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard h-4 w-4"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg></span>Dashboard';

          // Perfil link
          var perfilLink = document.createElement("a");
          perfilLink.href = "/perfil";
          perfilLink.setAttribute("data-auth-link", "1");
          perfilLink.className = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 text-secondary hover:bg-white/5 hover:text-primary";
          perfilLink.innerHTML = '<span class="shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user h-4 w-4"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>Perfil';

          // Sair link
          var sairLink = document.createElement("a");
          sairLink.href = "#";
          sairLink.setAttribute("data-auth-link", "1");
          sairLink.className = "rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-300";
          sairLink.textContent = "Sair";
          sairLink.addEventListener("click", function (e) {
            e.preventDefault();
            window.auth.logout();
          });

          // Insert before the hamburger (desktop) or at end (drawer)
          container.insertBefore(dashLink, entrarLink);
          container.insertBefore(perfilLink, entrarLink);
          container.appendChild(sairLink);
        }
      } else {
        // Show Entrar/Criar Conta
        if (entrarLink) entrarLink.style.display = "";
        if (criarLink) criarLink.style.display = "";

        // Remove auth links
        container.querySelectorAll("[data-auth-link]").forEach(function (el) {
          el.remove();
        });
      }
    }
  });
})();
