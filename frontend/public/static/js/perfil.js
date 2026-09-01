let currentUser = null;

    function mountSelects() {
        const tipoEl = document.getElementById("infoVeiculoTipo");
        if (tipoEl && window.AppSelect && !tipoEl._appSelect) {
            AppSelect.mount(tipoEl, {
                searchable: false,
                placeholder: "Carro",
                ariaLabel: "Tipo do Veículo"
            });
            tipoEl._appSelect.setOptions([
                { value: "carro", label: "Carro" },
                { value: "moto", label: "Moto" },
                { value: "caminhao", label: "Caminhão" },
                { value: "outro", label: "Outro" }
            ]);
        }
    }
    mountSelects();

    async function loadProfile() {
        if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Tenta carregar do cache para resposta instantânea
        const cachedUser = Auth.getUser();
        const cachedVehicles = Auth.Cache.get('autoassist_veiculos_cache');
        
        if (cachedUser) {
            // Se tiver cache de veículos, injeta no objeto user para o renderProfile
            if (cachedVehicles) cachedUser.veiculos = cachedVehicles;
            renderProfile(cachedUser);

            if (cachedUser.is_premium) {
                var _el = document.getElementById('navDashboard'); if (_el) _el.style.display = 'inline-flex';
                var _el = document.getElementById('btnMyVideos'); if (_el) _el.style.display = 'inline-flex';
            }
        }

        try {
            const freshUser = await Auth.syncUser({ redirectOnInvalid: false });
            if (freshUser) {
                currentUser = freshUser;
                try {
                    const vehRes = await Auth.authenticatedFetch('/api/veiculos', { redirectOnInvalid: false });
                    if (vehRes.ok) {
                        const vehData = await vehRes.json();
                        const veiculos = vehData.veiculos || currentUser.veiculos || [];
                        currentUser.veiculos = veiculos;
                        Auth.Cache.set('autoassist_veiculos_cache', veiculos);
                    } else if (currentUser.veiculos) {
                        Auth.Cache.set('autoassist_veiculos_cache', currentUser.veiculos);
                    }
                } catch (vehErr) {
                    console.error('Erro ao carregar veículos:', vehErr);
                }
                renderProfile(currentUser);
                if (currentUser.is_premium) {
                    var _el = document.getElementById('navDashboard'); if (_el) _el.style.display = 'inline-flex';
                    var _el = document.getElementById('btnMyVideos'); if (_el) _el.style.display = 'inline-flex';
                }
            }
        } catch (e) {
            console.error('Error loading profile:', e);
        }

        loadReferral();
    }

    function escapeHTML(str) {
        if (!str) return "";
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function vehiclePhotoSrc(b64) {
        if (!b64) return null;
        let mime = 'image/jpeg';
        if (b64.startsWith('iVBOR')) mime = 'image/png';
        else if (b64.startsWith('R0lG')) mime = 'image/gif';
        return `data:${mime};base64,${b64}`;
    }

    async function readApiError(res, fallback) {
        try {
            const data = await res.json();
            return data.error || data.message || fallback;
        } catch {
            return fallback;
        }
    }

    function renderProfile(user) {
        const initials = user.nome ? user.nome.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U';
        document.getElementById('profileAvatar').textContent = initials;
        document.getElementById('profileName').textContent = user.nome || 'Usuário';
        document.getElementById('profileEmail').textContent = user.email || '';
        document.getElementById('infoName').value = user.nome || '';
        document.getElementById('infoEmail').value = user.email || '';
        document.getElementById('infoStatus').textContent = user.is_premium ? 'Premium' : 'Gratuito';
        document.getElementById('infoStatus').className = user.is_premium ? 'field-value premium' : 'field-value';
        const upgradeCard = document.getElementById('upgradeCard');
        if (upgradeCard) upgradeCard.style.display = user.is_premium ? 'none' : 'block';
        document.getElementById('infoConsultas').textContent = user.total_consultas ?? user.total_chats ?? '0';

        renderTwoFactorStatus(Boolean(user.is_two_factor_enabled));
        renderVehiclesList(user.veiculos || []);
    }

    function renderTwoFactorStatus(isEnabled) {
        const badge = document.getElementById('twoFactorStatusBadge');
        const text = document.getElementById('twoFactorStatusText');
        const startButton = document.getElementById('btnStartTwoFactor');
        const disableButton = document.getElementById('btnDisableTwoFactor');

        badge.className = isEnabled ? 'security-pill enabled' : 'security-pill disabled';
        badge.innerHTML = isEnabled
            ? '<i class="fas fa-circle-check"></i> Ativada'
            : '<i class="fas fa-circle-xmark"></i> Desativada';
        text.textContent = isEnabled
            ? 'Sua senha secundaria sera solicitada apos a senha principal no login.'
            : 'Crie uma senha secundaria para confirmar o acesso depois da senha principal.';

        startButton.hidden = isEnabled;
        disableButton.hidden = !isEnabled;
        if (isEnabled) {
            setTwoFactorPanel('none');
        }
    }

    function clearTwoFactorForms() {
        document.getElementById('twoFactorPassword').value = '';
        document.getElementById('twoFactorPasswordConfirm').value = '';
        document.getElementById('twoFactorDisablePassword').value = '';
    }

    function setTwoFactorPanel(panel) {
        const setupPanel = document.getElementById('twoFactorSetupPanel');
        const disablePanel = document.getElementById('twoFactorDisablePanel');

        setupPanel.hidden = panel !== 'setup';
        disablePanel.hidden = panel !== 'disable';

        if (panel === 'setup') {
            document.getElementById('twoFactorPassword').focus();
        } else if (panel === 'disable') {
            document.getElementById('twoFactorDisablePassword').focus();
        } else {
            clearTwoFactorForms();
        }
    }

    function renderVehiclesList(veiculos) {
        const container = document.getElementById('veiculosListContainer');
        
        if (!veiculos || veiculos.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 14px; padding: 16px 0;">Nenhum veículo cadastrado</p>';
            return;
        }

        const icons = {
            'carro': 'fa-car',
            'moto': 'fa-motorcycle',
            'caminhao': 'fa-truck'
        };

        container.innerHTML = veiculos.map(v => {
            const safeMarca = escapeHTML(v.marca);
            const safeModelo = escapeHTML(v.modelo);
            const safeAno = escapeHTML(v.ano_fabricacao || '-');
            const safeKm = v.quilometragem ? v.quilometragem.toLocaleString() : '-';
            const iconClass = icons[v.tipo] || 'fa-car';

            return `
                <div class="vehicle-item">
                    <div class="vehicle-item-info">
                        <div class="vehicle-item-icon">
                            ${v.foto_base64 ? `<img src="${vehiclePhotoSrc(v.foto_base64)}" alt="Foto do veículo" class="vehicle-item-photo">` : `<i class="fas ${iconClass}"></i>`}
                        </div>
                        <div>
                            <div class="vehicle-item-name">${safeMarca} ${safeModelo}</div>
                            <div class="vehicle-item-year">${safeAno} • ${safeKm} km</div>
                        </div>
                    </div>
                    <div class="vehicle-item-actions">
                        <button class="btn-vehicle-photo" onclick="document.getElementById('vehPhotoInput-${v.id}').click()" title="Enviar foto">
                            <i class="fas fa-camera"></i>
                        </button>
                        <input type="file" id="vehPhotoInput-${v.id}" accept="image/png,image/jpeg,image/gif" hidden
                            onchange="uploadVehiclePhoto(${v.id}, this)">
                        ${v.foto_base64 ? `<button class="btn-vehicle-photo btn-vehicle-photo-remove" onclick="removeVehiclePhoto(${v.id})" title="Remover foto"><i class="fas fa-times"></i></button>` : ''}
                        <button class="btn-delete-vehicle" onclick="deleteVehicle(${v.id})" title="Remover veículo">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function loadReferral() {
        const card = document.getElementById('referralCard');
        if (!card) return;
        const input = document.getElementById('referralLink');
        const shareBtn = document.getElementById('btnShareReferral');
        const copyBtn = document.getElementById('btnCopyReferral');
        try {
            const res = await Auth.authenticatedFetch('/api/referral');
            if (!res.ok) return;
            const data = await res.json();
            const link = data.referral_link || '';
            if (input) input.value = link;
            const disabled = !link;
            if (shareBtn) shareBtn.disabled = disabled;
            if (copyBtn) copyBtn.disabled = disabled;
        } catch (e) {
            console.error('Erro ao carregar indicacao:', e);
        }
    }

    const btnCopyReferral = document.getElementById('btnCopyReferral');
    if (btnCopyReferral) {
        btnCopyReferral.addEventListener('click', async () => {
            const link = document.getElementById('referralLink').value;
            const hint = document.getElementById('referralHint');
            try {
                await navigator.clipboard.writeText(link);
                btnCopyReferral.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                if (hint) hint.style.display = 'block';
                setTimeout(() => { btnCopyReferral.innerHTML = '<i class="fas fa-copy"></i> Copiar'; }, 1800);
            } catch {
                const input = document.getElementById('referralLink');
                input.select();
                document.execCommand('copy');
                if (hint) hint.style.display = 'block';
            }
        });
    }

    const btnShareReferral = document.getElementById('btnShareReferral');
    if (btnShareReferral) {
        btnShareReferral.addEventListener('click', async () => {
            const link = document.getElementById('referralLink').value;
            const shareData = {
                title: 'AutoAssist',
                text: 'Conheça o AutoAssist  seu assistente automotivo com IA.',
                url: link
            };
            const hint = document.getElementById('referralHint');
            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    await navigator.clipboard.writeText(link);
                    alert('Link copiado para a área de transferência!');
                }
                if (hint) hint.style.display = 'block';
            } catch {
                /* usuário cancelou o compartilhamento */
            }
        });
    }

    const btnShareWhatsApp = document.getElementById('btnShareWhatsApp');
    if (btnShareWhatsApp) {
        btnShareWhatsApp.addEventListener('click', (e) => {
            e.preventDefault();
            const link = document.getElementById('referralLink').value;
            const text = 'Conheça o AutoAssist, seu copiloto de carro com IA. Use meu link e ganhe 1 mês Premium grátis: ';
            const url = 'https://wa.me/?text=' + encodeURIComponent(text + link);
            window.open(url, '_blank', 'noopener');
        });
    }

    document.getElementById('btnStartTwoFactor').addEventListener('click', () => {
        setTwoFactorPanel('setup');
    });

    document.getElementById('btnCancelTwoFactor').addEventListener('click', () => {
        setTwoFactorPanel('none');
    });

    document.getElementById('btnDisableTwoFactor').addEventListener('click', () => {
        setTwoFactorPanel('disable');
    });

    document.getElementById('btnCancelDisableTwoFactor').addEventListener('click', () => {
        setTwoFactorPanel('none');
    });

    document.getElementById('btnConfirmTwoFactor').addEventListener('click', async () => {
        const password = document.getElementById('twoFactorPassword').value;
        const confirmPassword = document.getElementById('twoFactorPasswordConfirm').value;

        if (password.length < 6) {
            alert('A senha secundaria deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            alert('As senhas secundarias nao conferem.');
            return;
        }

        const button = document.getElementById('btnConfirmTwoFactor');
        const originalContent = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Ativando...';

        try {
            const res = await Auth.authenticatedFetch('/api/auth/2fa/confirm', {
                method: 'POST',
                body: JSON.stringify({ password, confirm_password: confirmPassword })
            });

            if (res.ok) {
                showSuccess('2FA ativado com sucesso.');
                setTwoFactorPanel('none');
                loadProfile();
            } else {
                alert(await readApiError(res, 'Erro ao ativar 2FA.'));
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao ativar 2FA.');
        } finally {
            button.disabled = false;
            button.innerHTML = originalContent;
        }
    });

    document.getElementById('btnConfirmDisableTwoFactor').addEventListener('click', async () => {
        const password = document.getElementById('twoFactorDisablePassword').value;

        if (!password) {
            alert('Digite sua senha secundaria atual.');
            return;
        }

        const button = document.getElementById('btnConfirmDisableTwoFactor');
        const originalContent = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Desativando...';

        try {
            const res = await Auth.authenticatedFetch('/api/auth/2fa/disable', {
                method: 'POST',
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                showSuccess('2FA desativado com sucesso.');
                setTwoFactorPanel('none');
                loadProfile();
            } else {
                alert(await readApiError(res, 'Erro ao desativar 2FA.'));
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao desativar 2FA.');
        } finally {
            button.disabled = false;
            button.innerHTML = originalContent;
        }
    });

    document.getElementById('btnAddNewVehicle').addEventListener('click', () => {
        document.getElementById('sectionVeiculo').style.display = 'flex';
    });

    document.getElementById('btnCancelVehicle').addEventListener('click', () => {
        document.getElementById('sectionVeiculo').style.display = 'none';
        clearVehicleForm();
    });

    function clearVehicleForm() {
        document.getElementById('infoVeiculoTipo').value = 'carro';
        document.getElementById('infoVeiculoMarca').value = '';
        document.getElementById('infoVeiculoModelo').value = '';
        document.getElementById('infoVeiculoAnoFab').value = '';
        document.getElementById('infoVeiculoAnoCompra').value = '';
        document.getElementById('infoVeiculoKm').value = '';
    }

    document.getElementById('btnSaveVehicle').addEventListener('click', async () => {
        const veiculo = {
            tipo: document.getElementById('infoVeiculoTipo').value,
            marca: document.getElementById('infoVeiculoMarca').value.trim(),
            modelo: document.getElementById('infoVeiculoModelo').value.trim(),
            ano_fabricacao: document.getElementById('infoVeiculoAnoFab').value,
            ano_compra: document.getElementById('infoVeiculoAnoCompra').value,
            quilometragem: document.getElementById('infoVeiculoKm').value
        };

        if (!veiculo.marca || !veiculo.modelo) {
            alert('Preencha a marca e o modelo do veículo.');
            return;
        }

        try {
            const res = await Auth.authenticatedFetch('/api/veiculos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(veiculo)
            });

            if (res.ok) {
                showSuccess('Veículo adicionado com sucesso.');
                document.getElementById('sectionVeiculo').style.display = 'none';
                clearVehicleForm();
                loadProfile();
            } else {
                alert('Erro ao adicionar veículo.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao adicionar veículo.');
        }
    });

    async function deleteVehicle(id) {
        if (!confirm('Deseja realmente remover este veículo?')) return;

        try {
            const res = await Auth.authenticatedFetch(`/api/veiculos/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                loadProfile();
            } else {
                alert('Erro ao remover veículo.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao remover veículo.');
        }
    }

    async function uploadVehiclePhoto(id, input) {
        const file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        try {
            const b64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const res = await Auth.authenticatedFetch(`/api/veiculos/${id}/foto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ foto: b64 })
            });
            if (res.ok) {
                loadProfile();
            } else {
                alert('Erro ao enviar foto do veículo.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao enviar foto do veículo.');
        }
    }

    async function removeVehiclePhoto(id) {
        try {
            const res = await Auth.authenticatedFetch(`/api/veiculos/${id}/foto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ foto: '' })
            });
            if (res.ok) {
                loadProfile();
            } else {
                alert('Erro ao remover foto do veículo.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao remover foto do veículo.');
        }
    }

    document.getElementById('btnSaveProfile').addEventListener('click', async () => {
        const nome = document.getElementById('infoName').value.trim();
        const email = document.getElementById('infoEmail').value.trim();

        if (!nome || !email) {
            alert('Preencha nome e email.');
            return;
        }

        try {
            const res = await Auth.authenticatedFetch('/api/user', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email })
            });

            if (res.ok) {
                showSuccess('Perfil atualizado com sucesso.');
                loadProfile();
            } else {
                alert('Erro ao atualizar perfil.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao atualizar perfil.');
        }
    });

    document.getElementById('btnDelete').addEventListener('click', async () => {
        if (!confirm('Tem certeza que deseja excluir sua conta? Esta ação é irreversível.')) return;

        try {
            const res = await Auth.authenticatedFetch('/api/user', {
                method: 'DELETE'
            });

            if (res.ok) {
                showSuccess('Conta excluída com sucesso.');
                logout();
            } else {
                alert('Erro ao excluir conta.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir conta.');
        }
    });

    function logout() {
        if (typeof Auth !== 'undefined') {
            Auth.logout();
        } else {
            window.location.href = 'login.html';
        }
    }

    var btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (event) => {
            event.preventDefault();
            logout();
        });
    }

    loadProfile();
