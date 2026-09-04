/**
 * nav.js — Hamburger menu + mobile drawer
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
  });
})();
