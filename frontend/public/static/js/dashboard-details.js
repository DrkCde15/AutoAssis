(function () {
            const MOD_LABELS = {
                visual: 'Visual', performance: 'Performance', audio: 'Áudio',
                rodas: 'Rodas', suspensao: 'Suspensão', interior: 'Interior',
                eletronica: 'Eletrônica', outro: 'Outro'
            };

            window.openVehicleModal = async function (vehicleId) {
                const data = window.__dashboardData || [];
                const item = data.find(d => d.veiculo && d.veiculo.id === vehicleId);
                const modMap = window.__modMap || {};
                const alertsByVehicle = window.__alertsByVehicle || {};
                if (!item) return;

                const v = item.veiculo || {};
                const extras = item.estatisticas_extras || {};
                const pred = item.predicao || {};
                const fipeData = item.fipe || null;
                const mod = modMap[vehicleId] || null;
                const icons = {'moto':'fa-motorcycle','caminhao':'fa-truck','aviao':'fa-plane','navio':'fa-ship','geral':'fa-car'};
                const iconClass = icons[v.tipo] || 'fa-car';
                const fotoSrc = vehiclePhotoSrc(v.foto_base64);
                const health = extras.health_score || 0;
                const fipeCardValor = fipeCardValue(item.fipe);
                let base = safeNum(mod && mod.fipe_valor);
                if (base == null) base = parseNumeric(fipeCardValor);
                let ajustada = safeNum(mod && mod.fipe_ajustada);
                if (ajustada == null) ajustada = base;
                const mods = parseMods(mod ? mod.modificacoes : null);
                let badge = '';
                if (base != null && ajustada != null && Number(ajustada) !== Number(base)) {
                    const pct = ((ajustada - base) / base) * 100;
                    badge = ` <span class="vm-badge">+${pct.toFixed(1).toString().replace('.', ',')}%</span>`;
                }
                const realAlerts = (alertsByVehicle[vehicleId]) || item.saude || [];
                const alertItems = realAlerts.length
                    ? realAlerts.map(a => `<div class="alert-item"><div class="alert-content"><div class="alert-title">${escapeHTML(a.item)}</div><div class="alert-desc">${escapeHTML(a.msg)}</div></div><span class="alert-badge badge-${escapeHTML((a.status || '').toLowerCase())}">${escapeHTML(a.status)}</span></div>`).join('')
                    : '<p class="vm-empty">Nenhum alerta no momento.</p>';
                const modItems = mods.length
                    ? mods.map(m => `<div class="vm-mod"><div><span class="cat">${escapeHTML(MOD_LABELS[m.categoria] || m.categoria || '')}</span><div>${escapeHTML(m.nome || '')}</div></div><div>${m.valor != null ? brl(m.valor) : '<span class="vm-empty">sem valor</span>'}</div></div>`).join('')
                    : '<p class="vm-empty">Nenhuma modificação registrada.</p>';
                const predHtml = pred.predicted_next_km
                    ? `${pred.predicted_next_km.toLocaleString()} km · ${escapeHTML(pred.maintenance_label || 'Manutenção')} (${pred.predicted_next_date})`
                    : 'Sem previsão';

                const body = document.getElementById('vehicleModalBody');
                body.innerHTML = `
                    <div class="vm-header">
                        <div class="vm-icon">${fotoSrc ? `<img src="${fotoSrc}" alt="Foto do veículo" class="vm-photo">` : `<i class="fas ${iconClass}"></i>`}</div>
                        <div>
                            <h3>${escapeHTML(v.marca || '')} ${escapeHTML(v.modelo || '')}</h3>
                            <div class="vm-sub">${escapeHTML(v.ano_fabricacao || '---')} · ${v.quilometragem ? Number(v.quilometragem).toLocaleString() : '---'} km</div>
                        </div>
                    </div>
                    <div class="vm-stats">
                        <div class="vm-stat"><div class="v">${health}</div><div class="l">Health</div></div>
                        <div class="vm-stat"><div class="v">${brl(ajustada)}</div><div class="l">Valor estimado</div></div>
                        <div class="vm-stat"><div class="v">${extras.manutencoes_realizadas || 0}</div><div class="l">Manutenções</div></div>
                        <div class="vm-stat"><div class="v">${extras.chats_realizados || 0}</div><div class="l">Chats NOG</div></div>
                    </div>
                    <div class="vm-section">
                        <h4>Mod Passport</h4>
                        <div class="modp-line"><span class="label">FIPE fábrica</span><span class="value">${brl(base)}</span></div>
                        <div class="modp-line"><span class="label">Valor estimado</span><span class="value modp-value-ajustada">${brl(ajustada)}${badge}</span></div>
                        <div style="margin:0.6rem 0;">${modItems}</div>
                        <button class="btn-action" style="width:100%;justify-content:center;" onclick="openModPassport(${vehicleId})"><i class="fas fa-edit"></i> Gerenciar Mod Passport</button>
                    </div>
                    <div class="vm-section">
                        <h4>Próxima manutenção prevista</h4>
                        <p>${predHtml}</p>
                    </div>
                    <div class="vm-section">
                        <h4>Alertas de manutenção</h4>
                        ${alertItems}
                    </div>
                    <div class="vm-section">
                        <h4>Histórico de manutenções</h4>
                        <div id="vmHistory"><p class="vm-empty">Carregando...</p></div>
                    </div>
                `;
                document.getElementById('vehicleModal').classList.add('open');
                loadVehicleHistory(vehicleId);
            };

            async function loadVehicleHistory(vehicleId) {
                const el = document.getElementById('vmHistory');
                if (!el) return;
                try {
                    const res = await Auth.authenticatedFetch(`/api/maintenance/history?vehicle_id=${vehicleId}`, { redirectOnInvalid: false });
                    if (!res.ok) { el.innerHTML = '<p class="vm-empty">Histórico indisponível.</p>'; return; }
                    const data = await res.json();
                    const hist = data.historico || [];
                    if (!hist.length) { el.innerHTML = '<p class="vm-empty">Nenhuma manutenção registrada.</p>'; return; }
                    el.innerHTML = '<ul class="vm-timeline">' + hist.map(h => {
                        const d = h.service_date ? new Date(h.service_date).toLocaleDateString('pt-BR') : '';
                        const title = h.service_type || h.item || h.title || 'Manutenção';
                        const note = h.notes || h.description || '';
                        const cost = h.cost != null ? brl(h.cost) : '';
                        return `<li><span class="vm-dot"></span><div><div style="font-weight:600;">${escapeHTML(title)}</div><div class="vm-sub">${d}${cost ? ' · ' + cost : ''}</div>${note ? `<div class="vm-sub">${escapeHTML(note)}</div>` : ''}</div></li>`;
                    }).join('') + '</ul>';
                } catch (e) {
                    el.innerHTML = '<p class="vm-empty">Erro ao carregar histórico.</p>';
                }
            }

            const vmOverlay = document.getElementById('vehicleModal');
            vmOverlay.addEventListener('click', (e) => { if (e.target.id === 'vehicleModal') vmOverlay.classList.remove('open'); });
        })();
