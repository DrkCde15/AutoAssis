const btn = document.getElementById("btnCadastrar");
      const alertError = document.getElementById("alertError");
      const possuiVeiculoCheck = document.getElementById("possuiVeiculo");
      const vehiclesContainer = document.getElementById("vehiclesContainer");
      const btnAddVehicle = document.getElementById("btnAddVehicle");
      const btnGoogleLogin = document.getElementById("btnGoogleLogin");
      
      let vehicleCount = 0;

      function createVehicleForm() {
        vehicleCount++;
        const vehicleId = vehicleCount;
        const div = document.createElement('div');
        div.className = 'vehicle-section';
        div.style.display = 'block';
        div.innerHTML = `
          <div class="vehicle-header">
            <div class="vehicle-title">
              <i class="fas fa-car-side"></i>
              Veículo ${vehicleCount}
            </div>
            ${vehicleCount > 1 ? `<button type="button" class="btn-remove" onclick="this.closest('.vehicle-section').remove()"><i class="fas fa-trash"></i> Remover</button>` : ''}
          </div>

          <div class="form-group">
            <label for="v-tipo-${vehicleId}">Tipo de Veículo</label>
            <div id="v-tipo-${vehicleId}" class="app-select app-select--no-search v-tipo" data-placeholder="Carro" aria-label="Tipo de Veículo"></div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label for="v-marca-${vehicleId}">Marca</label>
              <div class="input-wrapper">
                <i class="fas fa-tag icon"></i>
                <input id="v-marca-${vehicleId}" name="v-marca-${vehicleId}" class="v-marca" autocomplete="organization" placeholder="Ex: Honda" />
              </div>
            </div>
            <div class="form-group">
              <label for="v-modelo-${vehicleId}">Modelo</label>
              <div class="input-wrapper">
                <i class="fas fa-car icon"></i>
                <input id="v-modelo-${vehicleId}" name="v-modelo-${vehicleId}" class="v-modelo" autocomplete="off" placeholder="Ex: Civic" />
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label for="v-ano-fab-${vehicleId}">Ano Fabricação</label>
              <div class="input-wrapper">
                <i class="fas fa-calendar icon"></i>
                <input id="v-ano-fab-${vehicleId}" name="v-ano-fab-${vehicleId}" type="number" class="v-ano-fab" autocomplete="bday-year" placeholder="2022" />
              </div>
            </div>
            <div class="form-group">
              <label for="v-ano-compra-${vehicleId}">Ano Compra</label>
              <div class="input-wrapper">
                <i class="fas fa-shopping-cart icon"></i>
                <input id="v-ano-compra-${vehicleId}" name="v-ano-compra-${vehicleId}" type="number" class="v-ano-compra" autocomplete="off" placeholder="2023" />
              </div>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label for="v-quilometragem-${vehicleId}">Quilometragem (KM)</label>
            <div class="input-wrapper">
              <i class="fas fa-tachometer-alt icon"></i>
              <input id="v-quilometragem-${vehicleId}" name="v-quilometragem-${vehicleId}" type="number" class="v-quilometragem" autocomplete="off" placeholder="Ex: 50000" />
            </div>
          </div>
        `;
        vehiclesContainer.appendChild(div);

        div.querySelectorAll('.v-tipo').forEach(function (el) {
          if (el && window.AppSelect && !el._appSelect) {
            AppSelect.mount(el, {
              searchable: false,
              placeholder: "Carro",
              ariaLabel: "Tipo de Veículo"
            });
            el._appSelect.setOptions([
              { value: "carro", label: "Carro" },
              { value: "moto", label: "Moto" },
              { value: "caminhao", label: "Caminhão" },
              { value: "outro", label: "Outro" }
            ]);
          }
        });
      }
      
      btnAddVehicle.addEventListener('click', createVehicleForm);

      // Configure Google link
      if (btnGoogleLogin && typeof CONFIG !== 'undefined') {
        btnGoogleLogin.href = `${CONFIG.API_URL}/api/auth/google/login`;
      }

      function showError(msg) {
        alertError.textContent = msg;
        alertError.style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }

      function validateRequiredField(value, message) {
        if (!value) {
          showError(message);
          return false;
        }
        return true;
      }

      function bindPasswordVisibilityToggle(toggleElement, passwordInput) {
        if (!toggleElement || !passwordInput) {
          return;
        }

        toggleElement.addEventListener("click", () => {
          const shouldShowPassword = passwordInput.type === "password";
          passwordInput.type = shouldShowPassword ? "text" : "password";
          toggleElement.classList.toggle("fa-eye", !shouldShowPassword);
          toggleElement.classList.toggle("fa-eye-slash", shouldShowPassword);
        });
      }

      const toggleSenha = document.getElementById("toggleSenha");
      const senhaInput = document.getElementById("senha");
      bindPasswordVisibilityToggle(toggleSenha, senhaInput);

      possuiVeiculoCheck.addEventListener("change", () => {
        if (possuiVeiculoCheck.checked) {
          if (vehiclesContainer.children.length === 0) createVehicleForm();
          vehiclesContainer.style.display = "block";
          btnAddVehicle.style.display = "flex";
        } else {
          vehiclesContainer.style.display = "none";
          btnAddVehicle.style.display = "none";
        }
      });

      btn.addEventListener("click", async () => {
        alertError.style.display = "none";

        const referralCode = new URLSearchParams(window.location.search).get('ref');

        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const senha = document.getElementById("senha").value;
        const confirmEmail = email;
        const confirmSenha = senha;

        if (!validateRequiredField(nome, "Informe seu nome completo.")) {
          return;
        }

        if (!validateRequiredField(email, "Informe seu e-mail.")) {
          return;
        }

        if (!isValidEmail(email)) {
          showError("Informe um e-mail válido, como nome@dominio.com.");
          return;
        }

        if (!validateRequiredField(senha, "Informe uma senha.")) {
          return;
        }

        if (senha.length < 6) {
          showError("A senha deve ter pelo menos 6 caracteres.");
          return;
        }

        let veiculos = [];
        if (possuiVeiculoCheck.checked) {
          const blocks = document.querySelectorAll('.vehicle-section');
          blocks.forEach(block => {
            const marca = block.querySelector('.v-marca').value.trim();
            const modelo = block.querySelector('.v-modelo').value.trim();
            if (marca || modelo) {
              veiculos.push({
                tipo: block.querySelector('.v-tipo').value,
                marca,
                modelo,
                ano_fabricacao: block.querySelector('.v-ano-fab').value,
                ano_compra: block.querySelector('.v-ano-compra').value,
                quilometragem: block.querySelector('.v-quilometragem').value
              });
            }
          });

          // P0-5: cadastro leve - veículo é opcional. Se não preencheu, segue sem veículo.
        }

        const btn = document.getElementById('btnCadastrar') || document.querySelector('button[type="submit"]');
        btn.disabled = true;

        if (TurnstileHelper.isEnabled() && !TurnstileHelper.isSolved('cf-turnstile-widget')) {
          btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verificando segurança...';
          const token = await TurnstileHelper.waitForToken('cf-turnstile-widget', 10000);
          if (!token) {
            showError("Resolva a verificação de segurança antes de continuar.");
            btn.disabled = false;
            btn.innerHTML = 'Criar Minha Conta <i class="fas fa-arrow-right"></i>';
            return;
          }
        }

        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Criando conta...';

        try {
          await Auth.register(nome, email, confirmEmail, senha, confirmSenha, veiculos, TurnstileHelper.getToken('cf-turnstile-widget'), referralCode);
          try {
            await Auth.login(email, senha);
            window.location.href = "chat.html";
          } catch (loginErr) {
            window.location.href = "login.html";
          }
        } catch (err) {
          showError(err.message || "Erro de conexão com o servidor.");
          TurnstileHelper.reset('cf-turnstile-widget');
          btn.disabled = false;
          btn.innerHTML = 'Criar Minha Conta <i class="fas fa-arrow-right"></i>';
        }
      });
    TurnstileHelper.init();
