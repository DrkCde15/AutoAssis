const btn = document.getElementById("btnEnviar");
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

      btn.addEventListener("click", async () => {
        alertError.style.display = "none";
        alertSuccess.style.display = "none";

        const email = document.getElementById("email").value.trim();

        if (!email) {
          showError("Digite o e-mail da sua conta.");
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Enviando...';

        try {
          if (typeof Auth !== 'undefined' && Auth.forgotPassword) {
            await Auth.forgotPassword(email);
          }

          showSuccess("Se este e-mail existir no sistema, um link de recuperação será enviado.");

        } catch (err) {
          showError(err.message || "Erro ao solicitar recuperação.");
        }

        btn.disabled = false;
        btn.innerHTML = 'Enviar Link de Recuperação <i class="fas fa-paper-plane"></i>';
      });
