(function () {
        "use strict";
        var TURNSTILE_KEY = "autoassist_turnstile_token";

        function go(dest) {
          window.location.replace(dest);
        }

        function nextUrl() {
          try {
            var p = new URLSearchParams(window.location.search);
            return p.get("next") || "chat.html";
          } catch (e) {
            return "chat.html";
          }
        }

        document.addEventListener("DOMContentLoaded", async function () {
          var btn = document.getElementById("btnEntrar");
          var errEl = document.getElementById("gateError");

          // Usuário logado não precisa do desafio
          if (typeof Auth !== "undefined" && Auth.isAuthenticated && Auth.isAuthenticated()) {
            go(nextUrl());
            return;
          }

          await TurnstileHelper.init();

          // Ambiente sem Turnstile (dev/teste): libera direto
          if (!TurnstileHelper.isEnabled()) {
            sessionStorage.removeItem(TURNSTILE_KEY);
            go(nextUrl());
            return;
          }

          btn.addEventListener("click", async function () {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verificando...';
            errEl.textContent = "";
            try {
              var token = await TurnstileHelper.waitForToken("cf-turnstile-widget", 10000);
              if (!token) {
                errEl.textContent = "Resolva a verificação de segurança antes de continuar.";
                btn.disabled = false;
                btn.innerHTML = 'Entrar no chat <i class="fas fa-arrow-right"></i>';
                return;
              }
              sessionStorage.setItem(TURNSTILE_KEY, token);
              go(nextUrl());
            } catch (e) {
              errEl.textContent = "Não foi possível validar a verificação. Tente novamente.";
              btn.disabled = false;
              btn.innerHTML = 'Entrar no chat <i class="fas fa-arrow-right"></i>';
            }
          });
        });
      })();
