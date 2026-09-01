(function () {
            var form = document.getElementById('waitlistForm');
            if (!form) return;
            var msg = document.getElementById('waitlistMsg');
            var btn = document.getElementById('waitlistBtn');
            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                var email = document.getElementById('waitlistEmail').value.trim();
                var nome = document.getElementById('waitlistNome').value.trim();
                if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    msg.style.color = '#dc2626';
                    msg.textContent = 'Informe um e-mail válido.';
                    return;
                }
                btn.disabled = true;
                btn.textContent = 'Enviando...';
                msg.style.color = '#2563eb';
                msg.textContent = '';
                var payload = { nome: nome, email: email };
                try {
                    if (window.AutoAssistAnalytics && window.AutoAssistAnalytics.getAnonymousId) {
                        payload.anonymous_id = window.AutoAssistAnalytics.getAnonymousId() || null;
                    }
                    if (window.AutoAssistAnalytics && window.AutoAssistAnalytics.getAttribution) {
                        var attr = window.AutoAssistAnalytics.getAttribution() || {};
                        payload.utm_source = attr.utm_source || null;
                        payload.utm_medium = attr.utm_medium || null;
                        payload.utm_campaign = attr.utm_campaign || null;
                        payload.initial_referrer = document.referrer || null;
                    }
                } catch (err) { /* atribuição opcional */ }
                try {
                    var res = await fetch('/api/waitlist', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    var data = await res.json().catch(function () { return {}; });
                    if (res.ok) {
                        msg.style.color = '#16a34a';
                        msg.textContent = (data.message || 'E-mail registrado! Verifique sua caixa de entrada.') +
                            (data.already_user ? ' Você já tem conta — aproveite!' : '');
                        form.reset();
                    } else {
                        msg.style.color = '#dc2626';
                        msg.textContent = data.error || 'Não foi possível registrar agora. Tente novamente.';
                    }
                } catch (err) {
                    msg.style.color = '#dc2626';
                    msg.textContent = 'Erro de conexão. Tente novamente.';
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Quero receber';
                }
            });
        })();
