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
          action: 'signup',
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

  document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    errorDiv.classList.add('hidden');

    var password = document.getElementById('password').value;
    var password2 = document.getElementById('password2').value;
    if (password !== password2) {
      errorDiv.textContent = 'As senhas não coincidem.';
      errorDiv.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando conta...';

    var token = turnstileToken;

    try {
      await auth.register({
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: password,
        turnstile_token: token
      });
      window.location.href = '/';
    } catch(err) {
      errorDiv.textContent = err.message || 'Erro ao criar conta. Tente novamente.';
      errorDiv.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Criar conta';
      if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
        turnstileToken = null;
        turnstile.reset(turnstileWidgetId);
      }
    }
  });
})();
