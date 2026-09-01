const params = new URLSearchParams(window.location.search);
      const token = (params.get("token") || "").trim();

      const btn = document.getElementById("btnReset");
      const alertError = document.getElementById("alertError");
      const alertSuccess = document.getElementById("alertSuccess");

      function showError(msg) {
        alertError.textContent = msg;
        alertError.style.display = "block";
        alertSuccess.style.display = "none";
      }

      function showSuccess(msg) {
        alertSuccess.textContent = msg;
        alertSuccess.style.display = "block";
        alertError.style.display = "none";
      }

      if (!token) {
        showError("Token inválido ou ausente no link de redefinição.");
        btn.disabled = true;
      }

      btn.addEventListener("click", async () => {
        alertError.style.display = "none";
        alertSuccess.style.display = "none";

        const password = document.getElementById("password").value;
        const password2 = document.getElementById("password2").value;

        if (!token) {
          showError("Token inválido ou ausente.");
          return;
        }
        if (!password || password.length < 6) {
          showError("A senha deve ter no mínimo 6 caracteres.");
          return;
        }
        if (password !== password2) {
          showError("As senhas não coincidem.");
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Salvando...';

        try {
          if (typeof Auth === "undefined" || !Auth.resetPassword) {
            throw new Error("Módulo de autenticação não carregado.");
          }
          await Auth.resetPassword(token, password);
          showSuccess("Senha redefinida com sucesso. Redirecionando para o login...");
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1800);
        } catch (err) {
          showError(err.message || "Erro ao redefinir senha.");
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Redefinir senha <i class="fas fa-check"></i>';
        }
      });
