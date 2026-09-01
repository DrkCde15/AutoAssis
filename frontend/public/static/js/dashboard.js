document.addEventListener('DOMContentLoaded', async () => {
            if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) {
                window.location.href = 'login.html';
                return;
            }

            const user = await Auth.syncUser({ redirectOnInvalid: true });
            if (!user) return;

            if (!Auth.requirePremiumPage({
                title: 'Dashboard Premium',
                message: 'Para acessar o Dashboard, ative o plano Premium.',
                backHref: 'index.html'
            })) {
                return;
            }

            const premiumVideosLink = document.getElementById('premiumVideosLink');
            if (premiumVideosLink) premiumVideosLink.style.display = 'flex';

            const content = document.getElementById('dashboardContent');
            
            // Exibição instantânea via Cache
            const cachedDash = Auth.Cache.get('autoassist_dashboard_cache');
            if (cachedDash) renderDashboard(cachedDash, {});

            try {
                const [dashRes, alertsRes, veicRes] = await Promise.all([
                    Auth.authenticatedFetch('/api/dashboard'),
                    Auth.authenticatedFetch('/api/maintenance/alerts', { redirectOnInvalid: false }),
                    Auth.authenticatedFetch('/api/veiculos', { redirectOnInvalid: false }),
                ]);

                let modMap = {};
                if (veicRes.ok) {
                    try {
                        const vj = await veicRes.json();
                        (vj.veiculos || []).forEach(v => { modMap[v.id] = v; });
                    } catch (e) { /* ignora */ }
                }
                window.__modMap = modMap;

                if (dashRes.status === 404) {
                    content.innerHTML = `<div class="no-vehicle"><div class="no-vehicle-icon"><i class="fas fa-car-crash"></i></div><h2>Nenhum veículo cadastrado</h2><p>Vá ao perfil para cadastrar seu veículo.</p></div>`;
                    return;
                }

                if (!dashRes.ok) {
                    if (!cachedDash) {
                        content.innerHTML = '<div class="no-vehicle"><h2>Erro de conexão</h2><p>Tente novamente mais tarde.</p></div>';
                    }
                    return;
                }

                const data = await dashRes.json();

                if (!Array.isArray(data) || data.length === 0) {
                    content.innerHTML = `<div class="no-vehicle"><div class="no-vehicle-icon"><i class="fas fa-car-crash"></i></div><h2>Nenhum veículo cadastrado</h2><p>Vá ao perfil para cadastrar seu veículo.</p></div>`;
                    return;
                }

                // Consome /api/maintenance/alerts e agrupa por veículo
                const alertsByVehicle = {};
                if (alertsRes.ok) {
                    const alertsData = await alertsRes.json();
                    const alertas = alertsData.alertas || alertsData || [];
                    alertas.forEach(a => {
                        if (a.vehicle_id == null) return;
                        (alertsByVehicle[a.vehicle_id] = alertsByVehicle[a.vehicle_id] || []).push(a);
                    });
                }

                Auth.Cache.set('autoassist_dashboard_cache', data);
                renderDashboard(data, alertsByVehicle, modMap);
            } catch (error) {
                console.warn('Erro ao atualizar dashboard:', error);
                if (!cachedDash) {
                    content.innerHTML = '<div class="no-vehicle"><h2>Erro de conexão</h2><p>Tente novamente mais tarde.</p></div>';
                }
            }
        });

        function escapeHTML(str) {
            if (!str) return "";
            return str.toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function brl(v) {
            if (v == null) return '';
            const n = Number(v);
            if (isNaN(n)) return '';
            return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        function parseMods(m) {
            if (!m) return [];
            if (Array.isArray(m)) return m;
            try { const p = JSON.parse(m); return Array.isArray(p) ? p : []; }
            catch (e) { return []; }
        }
        function safeNum(v) {
            if (v === null || v === undefined) return null;
            const n = Number(v);
            return isNaN(n) ? null : n;
        }
        function parseNumeric(v) {
            if (v == null) return null;
            if (typeof v === 'number') return v;
            const m = String(v).replace(/\./g, '').replace(',', '.').match(/\d+(\.\d+)?/);
            return m ? Number(m[0]) : null;
        }
        function vehiclePhotoSrc(b64) {
            if (!b64) return null;
            let mime = 'image/jpeg';
            if (b64.startsWith('iVBOR')) mime = 'image/png';
            else if (b64.startsWith('R0lG')) mime = 'image/gif';
            return `data:${mime};base64,${b64}`;
        }
        function fipeCardValue(fipe) {
            if (!fipe) return null;
            if (fipe.Valor != null) return fipe.Valor;
            if (fipe.preco != null) return fipe.preco;
            if (fipe.valor != null) return fipe.valor;
            return null;
        }
        function buildModPassportCard(id, modMap, fipeCard) {
            const mod = (modMap && modMap[id]) || null;
            let base = safeNum(mod && mod.fipe_valor);
            if (base == null) base = parseNumeric(fipeCard);
            let ajustada = safeNum(mod && mod.fipe_ajustada);
            if (ajustada == null) ajustada = base;
            const mods = parseMods(mod ? mod.modificacoes : null);
            let badge = '<span class="modp-badge flat">sem ajuste</span>';
            if (base != null && ajustada != null && Number(ajustada) !== Number(base)) {
                const pct = ((ajustada - base) / base) * 100;
                badge = `<span class="modp-badge up">+${pct.toFixed(1).replace('.', ',')}%</span>`;
            }
            const countText = mods.length
                ? `<p class="modp-empty">${mods.length} modificação(ões) registrada(s)</p>`
                : `<p class="modp-empty">Nenhuma modificação ainda</p>`;
            const fonte = mod && mod.fipe_ajustada_fonte
                ? `<div class="modp-line modp-fonte"><span class="label">Base</span><span class="value">${mod.fipe_ajustada_fonte}</span></div>`
                : '';
            const aviso = mod && mod.fipe_ajustada_aviso
                ? `<p class="modp-aviso">${mod.fipe_ajustada_aviso}</p>`
                : '';
            return `
                <div class="modp-line"><span class="label">FIPE fábrica</span><span class="value" id="modBase-${id}">${brl(base)}</span></div>
                <div class="modp-line"><span class="label">Valor estimado</span><span class="value modp-value-ajustada" id="modAdj-${id}">${brl(ajustada)} ${badge}</span></div>
                ${fonte}
                <div id="modCount-${id}">${countText}</div>
                ${aviso}
            `;
        }

        function renderDashboard(data, alertsByVehicle, modMap) {
            window.__dashboardData = data;
            window.__alertsByVehicle = alertsByVehicle || {};
            const content = document.getElementById('dashboardContent');
            const icons = {'moto': 'fa-motorcycle', 'caminhao': 'fa-truck', 'aviao': 'fa-plane', 'navio': 'fa-ship', 'geral': 'fa-car'};

            let totalPatrimonio = 0;
            data.forEach(item => {
                const mod = (modMap && modMap[item.veiculo.id]) || null;
                let val = mod ? (mod.fipe_ajustada != null ? mod.fipe_ajustada : mod.fipe_valor) : null;
                if (val == null) {
                    const f = item.fipe && item.fipe.Valor;
                    if (f != null && f !== "Não listado na Tabela FIPE") val = f;
                }
                if (val != null) totalPatrimonio += Number(parseNumeric(val)) || 0;
            });

            let htmlBuilder = `
                <div class="dashboard-header"><h1>Dashboard</h1><p>Acompanhe a saúde e o valor do seu patrimônio em tempo real.</p></div>
                <div class="garagem-toolbar">
                    <div class="garagem-stat"><span class="garagem-label">Veículos na garagem</span><span class="garagem-value">${data.length}</span></div>
                    <div class="garagem-stat"><span class="garagem-label">Patrimônio (valor estimado)</span><span class="garagem-value">${brl(totalPatrimonio)}</span></div>
                    <a href="perfil.html" class="btn-action garagem-add"><i class="fas fa-plus"></i> Adicionar veículo</a>
                </div>
                <div class="trust-banner">
                    <i class="fas fa-shield-halved"></i>
                    <div>
                        <strong>Seu carro, lembrado pela IA</strong>
                        <span>Mod Passport, valor FIPE e histórico em um só lugar — seu patrimônio acompanhado em tempo real.</span>
                    </div>
                </div>
            `;

            data.forEach((item, index) => {
                const iconClass = icons[item.veiculo.tipo] || 'fa-car';
                const pred = item.predicao || {};
                const marca = escapeHTML(item.veiculo.marca);
                const modelo = escapeHTML(item.veiculo.modelo);

                const ano = escapeHTML(item.veiculo.ano_fabricacao || item.veiculo.ano || '---');
                const km = item.veiculo.quilometragem ? item.veiculo.quilometragem.toLocaleString() : '---';
                const fipeData = item.fipe || null;
                const fipeValor = escapeHTML(fipeData ? (fipeData.Valor || fipeData.preco || '---') : '---');
                const fipeRef = escapeHTML(fipeData ? (fipeData.MesReferencia || fipeData.mes || '---') : '---');
                const fipeAnoUsado = fipeData ? (fipeData.AnoFipeUsado || fipeData.AnoModelo || '') : '';
                const fipeAnoConsultado = fipeData ? (fipeData.AnoConsultado || '') : '';
                const fipeAproximado = fipeData && fipeData.fipe_match_type === 'nearest_year' && fipeAnoUsado;
                const fipeRefLabel = fipeAproximado ? 'Referência aproximada' : 'Referência';
                const fipeAnoInfo = fipeAproximado
                    ? ` - ano FIPE ${escapeHTML(fipeAnoUsado)}${fipeAnoConsultado ? ` (cadastro ${escapeHTML(fipeAnoConsultado)})` : ''}`
                    : '';
                const extras = item.estatisticas_extras || {};
                const healthScore = extras.health_score || 0;
                let healthColor = "var(--success)";
                if(healthScore < 50) healthColor = "var(--danger)";
                else if(healthScore < 80) healthColor = "var(--warning)";
                const fotoSrc = vehiclePhotoSrc(item.veiculo.foto_base64);

                // Alertas reais de manutenção (por veículo), com fallback genérico
                const realAlerts = (alertsByVehicle && alertsByVehicle[item.veiculo.id]) || item.saude || [];

                htmlBuilder += `
                <div class="vehicle-card" style="background: linear-gradient(145deg, var(--bg-card) 0%, rgba(0,122,255,0.05) 100%); border-color: rgba(0,122,255,0.2);">
                    <div class="vehicle-icon" style="box-shadow: 0 0 30px rgba(0,122,255,0.3);">${fotoSrc ? `<img src="${fotoSrc}" alt="Foto do veículo" class="vehicle-photo">` : `<i class="fas ${iconClass}"></i>`}</div>
                    <div class="vehicle-info">
                        <h2>${marca} ${modelo}</h2>
                        <div class="vehicle-meta">
                            <span><i class="fas fa-calendar"></i> Ano: ${ano}</span>
                            <span><i class="fas fa-tachometer-alt"></i> ${km} km</span>
                        </div>
                    </div>
                    <button class="vehicle-detail-btn" onclick="openVehicleModal(${item.veiculo.id})" title="Ver detalhes do veículo"><i class="fas fa-expand"></i></button>
                </div>

                <div class="stats-grid">
                    <div class="stat-card" data-vehicle-id="${item.veiculo.id}">
                        <div class="stat-card-header">
                            <div class="stat-card-icon" style="color: ${healthColor};"><i class="fas fa-heartbeat"></i></div>
                            <div class="stat-card-title">Health Score</div>
                        </div>
                        <div class="health-score-container">
                            <svg viewBox="0 0 100 100" class="circular-chart" style="filter: drop-shadow(0 0 12px ${healthColor}40);">
                                <circle class="circle-bg" cx="50" cy="50" r="40" />
                                <circle class="circle" cx="50" cy="50" r="40" 
                                    stroke="${healthColor}" 
                                    stroke-dasharray="251.2" 
                                    style="stroke-dashoffset: ${251.2 - (251.2 * healthScore / 100)};" />
                                <text x="50" y="50" class="percentage">${healthScore}</text>
                            </svg>
                            <div class="health-score-text">
                                <p>Pontuação geral baseada na idade e quilometragem do seu veículo.</p>
                            </div>
                        </div>
                        <div id="alertsList">
                            ${realAlerts.map(alert => {
                                const alertItem = escapeHTML(alert.item);
                                const alertMsg = escapeHTML(alert.msg);
                                const alertStatus = escapeHTML(alert.status);
                                const badgeClass = `badge-${alertStatus.toLowerCase()}`;
                                return `
                                    <div class="alert-item">
                                        <div class="alert-content">
                                            <div class="alert-title">${alertItem}</div>
                                            <div class="alert-desc">${alertMsg}</div>
                                        </div>
                                        <span class="alert-badge ${badgeClass}">${alertStatus}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <div class="stat-card fipe" style="background: linear-gradient(to right bottom, var(--bg-card), rgba(255,255,255,0.02));">
                        <div class="stat-card-header">
                            <div class="stat-card-icon"><i class="fas fa-chart-line"></i></div>
                            <div class="stat-card-title">Valor de Mercado (FIPE)</div>
                        </div>
                        <div class="stat-value" style="color: var(--success);">${fipeValor}</div>
                        <p class="stat-subtitle">${fipeRefLabel}: ${fipeRef}${fipeAnoInfo}</p>
                        
                        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1);">
                            <div class="stat-card-header" style="margin-bottom: 0.5rem;">
                                <div class="stat-card-icon" style="width:30px; height:30px; font-size:0.8rem;"><i class="fas fa-wrench"></i></div>
                                <div class="stat-card-title">Histórico de Manutenções</div>
                            </div>
                            <p style="font-size: 1.2rem; font-weight: 600;">${extras.manutencoes_realizadas} registros</p>
                            <p class="stat-subtitle">Última revisão: ${extras.data_ultima_manutencao}</p>
                        </div>
                        
                        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1);">
                            <div class="stat-card-header" style="margin-bottom: 0.5rem;">
                                <div class="stat-card-icon" style="width:30px; height:30px; font-size:0.8rem; background: rgba(10,132,255,0.1); color: #0a84ff;"><i class="fas fa-comments"></i></div>
                                <div class="stat-card-title">Consultas com o NOG</div>
                            </div>
                            <p style="font-size: 1.2rem; font-weight: 600;">${extras.chats_realizados} interações</p>
                            <p class="stat-subtitle">Tire mais dúvidas pelo chat!</p>
                        </div>
                    </div>
                    
${pred.predicted_next_km ? `
<div class="stat-card prediction">
    <div class="stat-card-header">
        <div class="stat-card-icon"><i class="fas fa-tools"></i></div>
        <div class="stat-card-title">Próxima Manutenção Prevista</div>
    </div>
    <div class="stat-value">${pred.predicted_next_km.toLocaleString()} km</div>
    <p class="stat-subtitle">${escapeHTML(pred.maintenance_label || 'Manutenção')} · Data: ${pred.predicted_next_date} (confiança ${Math.round(pred.confidence*100)}%)</p>
</div>` : ''}
                </div>
                <div class="stat-card modpassport" data-mod-vehicle="${item.veiculo.id}">
                    <div class="stat-card-header">
                        <div class="stat-card-icon"><i class="fas fa-id-card"></i></div>
                        <div class="stat-card-title">Mod Passport</div>
                    </div>
                    ${buildModPassportCard(item.veiculo.id, modMap, fipeCardValue(item.fipe))}
                    <button class="btn-action modp-btn" onclick="openModPassport(${item.veiculo.id})"><i class="fas fa-edit"></i> Gerenciar modificações</button>
                </div>

                <a href="chat.html" class="btn-action"><i class="fas fa-robot"></i> Analisar dados com o NOG</a>
                ${index < data.length - 1 ? '<hr class="section-divider">' : ''}
                `;
            });
            content.innerHTML = htmlBuilder;
            fetchHealthTrend();
        }

        async function fetchHealthTrend() {
            try {
                const res = await Auth.authenticatedFetch('/api/dashboard/health-trend', { redirectOnInvalid: false });
                if (!res.ok) return;
                const data = await res.json();
                if (!data || data.length === 0) return;
                
                const grouped = {};
                for (const row of data) {
                    if (!grouped[row.vehicle_id]) grouped[row.vehicle_id] = [];
                    grouped[row.vehicle_id].push(row);
                }

                for (const vid in grouped) {
                    if (grouped[vid].length >= 2) {
                        renderHealthTrend(vid, grouped[vid]);
                    }
                }
            } catch {}
        }

        function renderHealthTrend(vehicleId, data) {
            const statCard = document.querySelector(`.stat-card[data-vehicle-id="${vehicleId}"]`);
            if (!statCard) return;
            
            const scores = data.map(d => d.score);
            const labels = data.map(d => {
                const date = new Date(d.recorded_at);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            });
            const min = Math.min(...scores);
            const max = Math.max(...scores);
            const range = max - min || 1;
            const w = 280, h = 80;
            const padding = { top: 6, bottom: 16, left: 4, right: 4 };
            const chartW = w - padding.left - padding.right;
            const chartH = h - padding.top - padding.bottom;

            const points = scores.map((s, i) => {
                const x = padding.left + (i / (scores.length - 1)) * chartW;
                const y = padding.top + chartH - ((s - min) / range) * chartH;
                return `${x},${y}`;
            });
            const line = points.join(' ');

            const color = scores[scores.length - 1] >= 80 ? '#22c55e' : scores[scores.length - 1] >= 50 ? '#f59e0b' : '#ef4444';

            const svg = `
                <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1)">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                        <div class="stat-card-icon" style="width:30px;height:30px;font-size:0.8rem;color:var(--accent);background:rgba(59,130,246,0.1);">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-card-title" style="font-size:13px;font-weight:600;color:var(--text-secondary)">Tendência do Health Score</div>
                    </div>
                    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;max-width:${w}px;display:block">
                        <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
                        ${points.map((p, i) => {
                            const [cx, cy] = p.split(',');
                            return `<circle cx="${cx}" cy="${cy}" r="3" fill="${color}" opacity="0.8"/>`;
                        }).join('')}
                        <text x="${padding.left}" y="${h - 2}" font-size="8" fill="var(--text-muted)">${labels[0] || ''}</text>
                        <text x="${w - padding.right}" y="${h - 2}" font-size="8" fill="var(--text-muted)" text-anchor="end">${labels[labels.length - 1] || ''}</text>
                    </svg>
                </div>
            `;
            statCard.insertAdjacentHTML('beforeend', svg);
        }

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
        }
