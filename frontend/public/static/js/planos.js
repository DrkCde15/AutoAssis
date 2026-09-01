// Renderiza o header correto ANTES do primeiro paint (sem flash).
      if (typeof Navbar !== 'undefined') {
        Navbar.init({ validate: true });
      }

      document.addEventListener('DOMContentLoaded', () => {
        // A navegação mobile (hamburguer + drawer) é fornecida pelo
        // componente compartilhado em static/js/responsive.js, exatamente
        // como nas demais páginas do AutoAssist. Nenhuma lógica própria aqui.

        const btnPlanPremium = document.getElementById('btnPlanPremium');
        if (btnPlanPremium && typeof Auth !== 'undefined') {
          btnPlanPremium.addEventListener('click', async () => {
            if (!Auth.isAuthenticated()) {
              window.location.href = 'cadastro.html';
              return;
            }
            const originalHtml = btnPlanPremium.innerHTML;
            btnPlanPremium.disabled = true;
            btnPlanPremium.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Redirecionando...';
            try {
              await Auth.openPremiumCheckout();
            } catch (err) {
              btnPlanPremium.disabled = false;
              btnPlanPremium.innerHTML = originalHtml;
              if (typeof Auth.showPremiumPaywall === 'function') {
                Auth.showPremiumPaywall();
              } else {
                alert('Não foi possível iniciar o checkout no momento.');
              }
            }
          });
        }
      });
