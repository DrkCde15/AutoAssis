// Helper Cloudflare Turnstile (CAPTCHA) - degradação graciosa quando as
// chaves não estão configuradas no backend (TURNSTILE_SITE_KEY ausente).
(function (global) {
  "use strict";

  var SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
  var siteKey = null;
  var enabled = false;
  var pending = [];
  var solved = {}; // containerId -> token emitido pelo callback
  var lastError = {}; // containerId -> código de erro da Cloudflare

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

  function onSolved(containerId, token) {
    solved[containerId] = token;
    lastError[containerId] = null;
    var el = document.getElementById(containerId);
    if (el) el.setAttribute("data-turnstile-solved", "1");
    if (global.console) {
      global.console.info("[Turnstile] resolvido:", containerId);
    }
  }

  function onError(containerId, code) {
    lastError[containerId] = code;
    solved[containerId] = null;
    var el = document.getElementById(containerId);
    if (el) el.removeAttribute("data-turnstile-solved");
    if (global.console) {
      global.console.warn("[Turnstile] erro:", containerId, code);
    }
  }

  function onExpired(containerId) {
    solved[containerId] = null;
    var el = document.getElementById(containerId);
    if (el) el.removeAttribute("data-turnstile-solved");
    if (global.console) {
      global.console.warn("[Turnstile] token expirado:", containerId);
    }
  }

  function widgetOpts(el) {
    var opts = { sitekey: siteKey, theme: "auto", language: "pt-br" };
    var action = el.getAttribute("data-turnstile-action");
    if (action) opts.action = action;
    var id = el.id;
    opts.callback = function (token) { onSolved(id, token); };
    opts["error-callback"] = function (code) { onError(id, code); };
    opts["expired-callback"] = function () { onExpired(id); };
    return opts;
  }

  function renderWidget(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return false;
    if (el.childElementCount > 0) return true;
    if (typeof global.turnstile === "undefined") {
      if (pending.indexOf(containerId) === -1) pending.push(containerId);
      return false;
    }
    if (!siteKey) return false;
    try {
      global.turnstile.render(el, widgetOpts(el));
    } catch (e) {
      if (global.console) {
        global.console.warn("[Turnstile] falha ao renderizar:", containerId, e);
      }
      return false;
    }
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

  function isSolved(containerId) {
    return enabled && !!solved[containerId];
  }

  function getToken(containerId) {
    if (!enabled || typeof global.turnstile === "undefined") return null;
    if (solved[containerId]) return solved[containerId];
    try {
      var token = global.turnstile.getResponse(containerId);
      if (token) {
        solved[containerId] = token;
        return token;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function getLastError(containerId) {
    return lastError[containerId] || null;
  }

  // Aguarda o widget resolver (com timeout). Resolve com o token ou null.
  function waitForToken(containerId, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    return new Promise(function (resolve) {
      var started = Date.now();
      function check() {
        var token = getToken(containerId);
        if (token) return resolve(token);
        if (Date.now() - started >= timeoutMs) return resolve(null);
        setTimeout(check, 200);
      }
      check();
    });
  }

  function reset(containerId) {
    solved[containerId] = null;
    lastError[containerId] = null;
    var el = document.getElementById(containerId);
    if (el) el.removeAttribute("data-turnstile-solved");
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
    isSolved: isSolved,
    getToken: getToken,
    getLastError: getLastError,
    waitForToken: waitForToken,
    reset: reset,
  };
})(window);