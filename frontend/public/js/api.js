/**
 * api.js — Fetch wrapper (substitui frontend/src/lib/api.ts)
 */
(function () {
  "use strict";

  var API_URL = window.API_URL || "";

  async function request(endpoint, options) {
    options = options || {};
    var json = options.json;
    var init = Object.assign({}, options);
    delete init.json;

    var headers = new Headers(init.headers || {});

    if (json !== undefined) {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(json);
    }

    var token = localStorage.getItem("autoassist_access_token");
    if (token) {
      headers.set("Authorization", "Bearer " + token);
    }

    init.headers = headers;
    init.credentials = "include";

    var res = await fetch(API_URL + endpoint, init);

    if (!res.ok) {
      var err = new Error("API error: " + res.status + " " + res.statusText);
      err.status = res.status;
      try {
        var body = await res.json();
        err.message = body.error || err.message;
      } catch (_) {}
      throw err;
    }

    return res.json();
  }

  window.api = {
    get: function (endpoint, opts) {
      return request(endpoint, Object.assign({ method: "GET" }, opts));
    },
    post: function (endpoint, json, opts) {
      return request(endpoint, Object.assign({ method: "POST", json: json }, opts));
    },
    put: function (endpoint, json, opts) {
      return request(endpoint, Object.assign({ method: "PUT", json: json }, opts));
    },
    delete: function (endpoint, opts) {
      return request(endpoint, Object.assign({ method: "DELETE" }, opts));
    },
  };
})();
