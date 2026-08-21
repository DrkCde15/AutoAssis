/**
 * AutoAssist - Navbar unificada (elimina o flash de login)
 *
 * Renderiza o header correto (logado / deslogado) de forma SÍNCRONA,
 * usando apenas o token local (localStorage / cookie) - sem esperar rede.
 * A validação com o servidor roda em seguida e só corrige o estado caso a
 * sessão esteja realmente inválida.
 *
 * Uso nas páginas:
 *   <div class="nav-links" id="authLinks"></div>
 *   <script src="static/js/auth.js"></script>
 *   <script src="static/js/navbar.js"></script>
 *   <script> if (typeof Navbar !== 'undefined') Navbar.init({ validate: true }); </script>
 */
(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Síncrono: só inspeciona token local, nunca faz rede.
  function isAuthed() {
    if (typeof Auth !== "undefined" && Auth.isAuthenticated) {
      return Auth.isAuthenticated();
    }
    try {
      if (localStorage.getItem("autoassist_access_token")) return true;
      if (document.cookie.indexOf("csrf_access_token=") !== -1) return true;
    } catch (e) {}
    return false;
  }

  function guestHtml() {
    return (
      '<a href="cadastro.html" class="nav-btn nav-btn-cta">Criar conta</a>' +
      '<a href="login.html" class="nav-btn nav-btn-outline">Entrar</a>'
    );
  }

  function authHtml(user) {
    const firstName =
      user && user.nome ? escapeHtml(String(user.nome).split(" ")[0]) : "Perfil";
    return (
      '<a href="dashboard.html" class="nav-link"><i class="fas fa-tachometer-alt"></i> Dashboard</a>' +
      '<a href="chat.html" class="nav-link"><i class="fas fa-comments"></i> Chat</a>' +
      '<a href="planos.html" class="nav-link"><i class="fas fa-star"></i> Planos</a>' +
      '<a href="maintenance_history.html" class="nav-link"><i class="fas fa-history"></i> Anotações</a>' +
      '<a href="perfil.html" class="nav-link"><i class="fas fa-user"></i> ' + firstName + "</a>" +
      '<div class="nav-dropdown" id="navMore">' +
      '<button type="button" class="nav-link nav-dropdown-toggle" id="btnNavMore">Mais <i class="fas fa-chevron-down"></i></button>' +
      '<div class="nav-dropdown-menu">' +
      '<a href="eventos.html" class="nav-dropdown-item"><i class="fas fa-calendar-alt"></i> Eventos</a>' +
      '<a href="library.html" class="nav-dropdown-item"><i class="fas fa-book"></i> Biblioteca</a>' +
      '<a href="maps.html" class="nav-dropdown-item"><i class="fas fa-map-marked-alt"></i> Mapa</a>' +
      "</div></div>" +
      '<div id="notif-bell-container"></div>' +
      '<button id="btnLogout" class="nav-link" type="button">' +
      '<i class="fas fa-sign-out-alt"></i> Sair</button>'
    );
  }

  function bindDropdown(container) {
    const toggle = container.querySelector("#btnNavMore");
    if (!toggle) return;
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      const menu = toggle.parentElement.querySelector(".nav-dropdown-menu");
      if (menu) menu.classList.toggle("open");
    });
  }

  function render(container, mode, user) {
    if (!container) return;
    container.innerHTML = mode === "auth" ? authHtml(user) : guestHtml();

    if (mode === "auth") {
      const btnLogout = container.querySelector("#btnLogout");
      if (btnLogout && typeof Auth !== "undefined" && Auth.logout) {
        btnLogout.addEventListener("click", function () {
          Auth.logout();
        });
      }
      bindDropdown(container);
    }
  }

  function init(options) {
    options = options || {};
    const container =
      document.getElementById("authLinks") || document.getElementById("navLinks");
    if (!container) return;

    const authed = isAuthed();
    // Render imediato, sem rede → sem flash de "deslogado → logado".
    render(
      container,
      authed ? "auth" : "guest",
      authed && typeof Auth !== "undefined" ? Auth.getUser() : null
    );

    // Valida com o servidor depois; re-renderiza SÓ se a sessão for inválida,
    // para não destruir o sino de notificações (populado por notifications.js).
    if (
      authed &&
      options.validate !== false &&
      typeof Auth !== "undefined" &&
      Auth.syncUser
    ) {
      Auth.syncUser({ redirectOnInvalid: false, force: true })
        .then(function (userData) {
          if (!userData) {
            render(container, "guest", null);
          } else if (typeof window.setNavUserName === "function") {
            window.setNavUserName(userData.nome);
          }
        })
        .catch(function () {});
    }
  }

  window.Navbar = { init: init, render: render, isAuthed: isAuthed };
})();
