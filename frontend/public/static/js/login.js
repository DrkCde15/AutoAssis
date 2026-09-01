function getRedirectUrl() {
        const params = new URLSearchParams(window.location.search);
        const r = params.get('redirect');
        return r ? decodeURIComponent(r) : null;
      }

      document.addEventListener("DOMContentLoaded", () => {
        TurnstileHelper.init();
        if (typeof Auth !== 'undefined') {
          Auth.syncUser({ redirectOnInvalid: false }).then((user) => {
            if (user) window.location.href = getRedirectUrl() || "index.html";
          });
        }

        const form = document.getElementById("loginForm");
        const twoFactorForm = document.getElementById("twoFactorForm");
        const errorBox = document.getElementById("error");
        const registerLinks = document.getElementById("registerLinks");
        const btnGoogleLogin = document.getElementById("btnGoogleLogin");
        const logoText = document.querySelector(".logo p");

        // Configure Google login link
        if (btnGoogleLogin && typeof CONFIG !== 'undefined') {
          btnGoogleLogin.href = `${CONFIG.API_URL}/api/auth/google/login`;
        }
        
        let pendingToken = null;

        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          errorBox.style.display = "none";

          const email = document.getElementById("email").value.trim().toLowerCase();
          const password = document.getElementById("password").value;
          
          const btnEntrar = document.getElementById("btnEntrar");
          const originalBtnContent = btnEntrar.innerHTML;
          btnEntrar.disabled = true;
          btnEntrar.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Entrando...';

          try {
            if (TurnstileHelper.isEnabled() && !TurnstileHelper.isSolved('cf-turnstile-widget')) {
              btnEntrar.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verificando segurança...';
              const token = await TurnstileHelper.waitForToken('cf-turnstile-widget', 10000);
              if (!token) {
                errorBox.textContent = "Verificação de segurança pendente. Aguarde e tente novamente.";
                errorBox.style.display = "block";
                btnEntrar.disabled = false;
                btnEntrar.innerHTML = originalBtnContent;
                return;
              }
            }
            const turnstileToken = TurnstileHelper.getToken('cf-turnstile-widget');
            const data = await Auth.login(email, password, turnstileToken);
            
            if (data.two_factor_required) {
              pendingToken = data.pending_token;
              form.style.display = "none";
              twoFactorForm.style.display = "block";
              registerLinks.style.display = "none";
              if (logoText) {
                logoText.textContent = "Senha de Segurança";
              }
              btnEntrar.disabled = false;
              btnEntrar.innerHTML = originalBtnContent;
            } else {
              window.location.href = getRedirectUrl() || "index.html";
            }
          } catch (err) {
            errorBox.textContent = err.message;
            errorBox.style.display = "block";
            TurnstileHelper.reset('cf-turnstile-widget');
            btnEntrar.disabled = false;
            btnEntrar.innerHTML = originalBtnContent;
          }
        });

        twoFactorForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          errorBox.style.display = "none";
          
          const code = document.getElementById("twoFactorCode").value;
          if (!code) return;

          const btnConfirm2FA = document.getElementById("btnConfirm2FA");
          const originalBtnContent = btnConfirm2FA.innerHTML;
          btnConfirm2FA.disabled = true;
          btnConfirm2FA.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Confirmando...';

          try {
            await Auth.verify2FA(pendingToken, code);
            window.location.href = getRedirectUrl() || "index.html";
          } catch (err) {
            errorBox.textContent = err.message;
            errorBox.style.display = "block";
            btnConfirm2FA.disabled = false;
            btnConfirm2FA.innerHTML = originalBtnContent;
          }
        });

        document.getElementById("backBtn").addEventListener("click", () => {
          twoFactorForm.style.display = "none";
          form.style.display = "block";
          registerLinks.style.display = "block";
          if (logoText) {
            logoText.textContent = "";
          }
          errorBox.style.display = "none";
        });

        // Password visibility toggle
        const toggleVisibility = (toggleId, inputId) => {
          const toggleBtn = document.getElementById(toggleId);
          const inputField = document.getElementById(inputId);
          if (toggleBtn && inputField) {
            toggleBtn.addEventListener("click", function() {
              if (inputField.type === "password") {
                inputField.type = "text";
                this.classList.remove("fa-eye");
                this.classList.add("fa-eye-slash");
              } else {
                inputField.type = "password";
                this.classList.remove("fa-eye-slash");
                this.classList.add("fa-eye");
              }
            });
          }
        };

        toggleVisibility("togglePassword", "password");
        toggleVisibility("toggle2FA", "twoFactorCode");
      });
