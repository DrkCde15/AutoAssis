(function() {
  var submitBtn = document.getElementById('submitBtn');
  var errorDiv = document.getElementById('error');
  var turnstileToken = null;
  var turnstileWidgetId = null;

  function waitForTurnstile(cb) {
    if (typeof turnstile !== 'undefined') return cb();
    var t = setInterval(function() {
      if (typeof turnstile !== 'undefined') { clearInterval(t); cb(); }
    }, 50);
  }

  fetch('/api/config/public').then(function(r){return r.json()}).then(function(d){
    var key = d.turnstile_site_key;
    if (key) {
      waitForTurnstile(function() {
        turnstileWidgetId = turnstile.render('#turnstileBox', {
          sitekey: key,
          theme: 'dark',
          callback: function(token) { turnstileToken = token; submitBtn.disabled = false; },
          'expired-callback': function() { turnstileToken = null; submitBtn.disabled = true; },
          'error-callback': function() { turnstileToken = null; submitBtn.disabled = true; }
        });
      });
    } else {
      submitBtn.disabled = false;
    }
  }).catch(function(){
    submitBtn.disabled = false;
  });

  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;
    var token = turnstileToken;

    try {
      var result = await auth.login(email, password, token);
      if (result.two_factor_required) {
        window.location.href = '/verificacao?token=' + encodeURIComponent(result.pending_token);
        return;
      }
      var params = new URLSearchParams(window.location.search);
      window.location.href = params.get('redirect') || '/dashboard';
    } catch(err) {
      errorDiv.textContent = err.message || 'Erro ao entrar. Tente novamente.';
      errorDiv.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
      if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
        turnstileToken = null;
        turnstile.reset(turnstileWidgetId);
      }
    }
  });
})();
