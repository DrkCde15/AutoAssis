// Revela o header logado de forma síncrona (antes do paint) para evitar
      // o flash de "deslogado -> logado" ao navegar entre páginas.
      if (typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated()) {
        var aaShow = function (id) { var el = document.getElementById(id); if (el) el.style.display = ''; };
        var aaHide = function (id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; };
        aaShow('navDashboard'); aaShow('navMaintenance'); aaShow('navLibrary'); aaShow('navProfile');
        aaHide('navLogin'); aaHide('navSignup');
      }
