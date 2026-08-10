// Helper Cloudflare Turnstile (CAPTCHA) — degradação graciosa quando as
// chaves não estão configuradas no backend (TURNSTILE_SITE_KEY ausente).
(function (global) {
  "use strict";

  var SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
  var siteKey = null;
  var enabled = false;
  var pending = [];

  function apiUrl() {
    if (typeof CONFIG !== "undefined" && CONFIG.API_URL) return CONFIG.API_URL;
    return global.location.origin;
  }

  async function loadConfig() {
    try {
      var res = await fetch(apiUrl() + "/api/config/public");
      if (!res.ok) return null;
      var data = await res.json();
      siteKey = data.turnstile_site_key || null;
      enabled = !!siteKey;
    } catch (e) {
      siteKey = null;
      enabled = false;
    }
    return siteKey;
  }

  function renderWidget(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return false;
    if (el.childElementCount > 0) return true;
    if (typeof global.turnstile === "undefined") {
      pending.push(containerId);
      return false;
    }
    if (!siteKey) return false;
    var opts = { sitekey: siteKey, theme: "auto", language: "pt-BR" };
    var action = el.getAttribute("data-turnstile-action");
    if (action) opts.action = action;
    global.turnstile.render(el, opts);
    return true;
  }

  function renderWidgetAll() {
    var widgets = document.querySelectorAll("[data-turnstile-widget]");
    for (var i = 0; i < widgets.length; i++) {
      renderWidget(widgets[i].id);
    }
  }

  function flushPending() {
    var ids = pending;
    pending = [];
    for (var i = 0; i < ids.length; i++) renderWidget(ids[i]);
  }

  function loadApi() {
    if (typeof global.turnstile !== "undefined") {
      renderWidgetAll();
      return;
    }
    if (document.querySelector("script[data-turnstile]")) return;
    var s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-turnstile", "1");
    document.head.appendChild(s);
  }

  async function init() {
    await loadConfig();
    if (!enabled) return false;
    loadApi();
    renderWidgetAll();
    return true;
  }

  function isEnabled() {
    return enabled;
  }

  function getToken(containerId) {
    if (!enabled || typeof global.turnstile === "undefined") return null;
    try {
      return global.turnstile.getResponse(containerId) || null;
    } catch (e) {
      return null;
    }
  }

  function reset(containerId) {
    if (typeof global.turnstile !== "undefined") {
      try {
        global.turnstile.reset(containerId);
      } catch (e) {
        /* ignora */
      }
    }
  }

  global.onTurnstileLoad = flushPending;
  global.TurnstileHelper = {
    init: init,
    isEnabled: isEnabled,
    getToken: getToken,
    reset: reset,
  };
})(window);