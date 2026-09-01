document.addEventListener('DOMContentLoaded', async () => {
            if (typeof Auth !== 'undefined' && Auth.ensurePremiumModal) {
                Auth.ensurePremiumModal();
            }

            // CTA Premium da home: visitante vai para cadastro; logado vai ao checkout.
            const btnPremiumCta = document.getElementById('btnPremiumCta');
            if (btnPremiumCta && typeof Auth !== 'undefined') {
                btnPremiumCta.addEventListener('click', async () => {
                    if (!Auth.isAuthenticated()) {
                        window.location.href = 'cadastro.html';
                        return;
                    }
                    const originalHtml = btnPremiumCta.innerHTML;
                    btnPremiumCta.disabled = true;
                    btnPremiumCta.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Redirecionando...';
                    try {
                        await Auth.openPremiumCheckout();
                    } catch (err) {
                        btnPremiumCta.disabled = false;
                        btnPremiumCta.innerHTML = originalHtml;
                        if (typeof Auth.showPremiumPaywall === 'function') {
                            Auth.showPremiumPaywall();
                        } else {
                            alert('Não foi possível iniciar o checkout no momento.');
                        }
                    }
                });
            }

            if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) {
                return;
            }

            // Não confia em cache para definir o estado de login: valida com o servidor.
            // Enquanto o backend está em cold start (Render free), mostra aviso e tenta de novo.
            async function atualizarDashboard() {
                try {
                    const userData = await Auth.syncUser({ redirectOnInvalid: false, force: true });
                    if (!userData) {
                        // Sessão realmente inválida: mantém a UI de visitante.
                        return;
                    }

                    let maintenanceAlerts = [];
                    if (userData.is_premium) {
                        const alertsRes = await Auth.authenticatedFetch('/api/maintenance/alerts', {
                            redirectOnInvalid: false
                        });
                        if (alertsRes.ok) {
                            const alertsData = await alertsRes.json();
                            maintenanceAlerts = Array.isArray(alertsData.alertas) ? alertsData.alertas : [];
                            Auth.Cache.set('autoassist_alerts_cache', maintenanceAlerts);
                        }
                    } else {
                        Auth.Cache.set('autoassist_alerts_cache', []);
                    }

                    renderDashboard(userData, maintenanceAlerts);
                } catch (error) {
                    if (error && Auth.isNetworkError && Auth.isNetworkError(error)) {
                        Auth.showBackendBanner();
                        // Backend ainda inicializando: tenta novamente em alguns segundos.
                        setTimeout(atualizarDashboard, 5000);
                        return;
                    }
                    console.warn('Erro ao atualizar dashboard:', error);
                }
            }

            atualizarDashboard();
        });

        function renderDashboard(userData, maintenanceAlerts) {
            // O header (navbar) é renderizado de forma síncrona pelo Navbar.init(),
            // eliminando o flash de "deslogado -> logado". Os alertas de manutenção
            // já são cacheados em Auth.Cache dentro de atualizarDashboard().
        }

        document.addEventListener('click', (event) => {
            const anchor = event.target.closest('a[href^="#"]');
            if (!anchor) return;

            const target = document.querySelector(anchor.getAttribute('href'));
            if (!target) return;

            event.preventDefault();
            if (window.AAAnim && window.AAAnim.scrollToAnchor) {
                window.AAAnim.scrollToAnchor(target, -80);
            } else {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
