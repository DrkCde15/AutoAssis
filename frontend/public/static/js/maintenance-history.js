const state = {
        vehicles: [],
        history: [],
        resumo: null,
        alerts: [],
        emailSettings: null,
        editingId: null
    };

    function escapeHtml(text) {
        if (text === null || text === undefined) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatCurrency(value) {
        const number = Number(value || 0);
        return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function formatDate(value) {
        if (!value) return "-";
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return value;
        return dt.toLocaleDateString("pt-BR");
    }

    function getVehicleMap() {
        const map = new Map();
        state.vehicles.forEach((v) => {
            const label = [v.marca, v.modelo].filter(Boolean).join(" ").trim() || ("Veiculo #" + v.id);
            map.set(Number(v.id), label);
        });
        return map;
    }

    function getVehicleInfoMap() {
        const map = new Map();
        state.vehicles.forEach((v) => {
            const label = [v.marca, v.modelo].filter(Boolean).join(" ").trim() || ("Veiculo #" + v.id);
            map.set(Number(v.id), { label, km: Number(v.quilometragem || 0) });
        });
        return map;
    }

    function getBadgeClass(statusCode, statusLabel) {
        const normalized = (statusCode || statusLabel || "").toString().toLowerCase();
        if (normalized.includes("overdue") || normalized.includes("atencao") || normalized.includes("aten")) return "badge badge-overdue";
        if (normalized.includes("due_soon") || normalized.includes("aviso")) return "badge badge-due_soon";
        return "badge badge-on_track";
    }

    function selectedVehicleQuery() {
        const raw = document.getElementById("vehicleFilter").value;
        if (!raw) return "";
        return "?veiculo_id=" + encodeURIComponent(raw);
    }

    async function fetchVehicles() {
        const res = await Auth.authenticatedFetch("/api/veiculos");
        if (!res.ok) throw new Error("Falha ao carregar veiculos");
        const data = await res.json();
        state.vehicles = Array.isArray(data.veiculos) ? data.veiculos : [];
        Auth.Cache.set('autoassist_veiculos_cache', state.vehicles);
    }

    async function fetchHistory() {
        const res = await Auth.authenticatedFetch("/api/maintenance/history" + selectedVehicleQuery());
        if (!res.ok) throw new Error("Falha ao carregar historico");
        const data = await res.json();
        state.history = Array.isArray(data.historico) ? data.historico : [];
        state.resumo = data.resumo || { total_gastos: 0, quantidade_registros: 0 };
        // Salva no cache se não houver filtro de veículo selecionado
        if (!document.getElementById("vehicleFilter").value) {
            Auth.Cache.set('autoassist_history_cache', state.history);
        }
    }

    async function fetchAlerts() {
        const res = await Auth.authenticatedFetch("/api/maintenance/alerts" + selectedVehicleQuery());
        if (!res.ok) throw new Error("Falha ao carregar alertas");
        const data = await res.json();
        state.alerts = Array.isArray(data.alertas) ? data.alertas : [];
        // Salva no cache global de alertas
        Auth.Cache.set('autoassist_alerts_cache', state.alerts);
    }

    async function fetchEmailSettings() {
        const res = await Auth.authenticatedFetch("/api/maintenance/email-settings");
        if (!res.ok) {
            state.emailSettings = { maintenance_email_enabled: true, maintenance_email_last_sent: null };
            return;
        }
        state.emailSettings = await res.json();
    }

    function renderVehicleSelects() {
        const labelFor = (v) => ([v.marca, v.modelo].filter(Boolean).join(" ") || ("Veiculo #" + v.id));

        const formItems = [{ value: "", label: "Sem vinculo de veiculo" }]
            .concat(state.vehicles.map((v) => ({ value: String(v.id), label: labelFor(v) })));

        const filterItems = [{ value: "", label: "Todos os veiculos" }]
            .concat(state.vehicles.map((v) => ({ value: String(v.id), label: labelFor(v) })));

        const formEl = document.getElementById("veiculoSelect");
        const filterEl = document.getElementById("vehicleFilter");
        if (formEl && formEl._appSelect) formEl._appSelect.setOptions(formItems);
        if (filterEl && filterEl._appSelect) filterEl._appSelect.setOptions(filterItems);
    }

    function mountSelects() {
        const formEl = document.getElementById("veiculoSelect");
        if (formEl && window.AppSelect && !formEl._appSelect) {
            AppSelect.mount(formEl, {
                placeholder: formEl.dataset.placeholder || "Carregando veiculos...",
                searchPlaceholder: "Pesquisar veiculo...",
                emptyText: "Nenhum veiculo encontrado",
                ariaLabel: "Veiculo (opcional)"
            });
        }

        const filterEl = document.getElementById("vehicleFilter");
        if (filterEl && window.AppSelect && !filterEl._appSelect) {
            AppSelect.mount(filterEl, {
                placeholder: filterEl.dataset.placeholder || "Carregando veiculos...",
                searchPlaceholder: "Pesquisar veiculo...",
                emptyText: "Nenhum veiculo encontrado",
                ariaLabel: "Filtrar por veiculo"
            });
        }

        const sortEl = document.getElementById("sortFilter");
        if (sortEl && window.AppSelect && !sortEl._appSelect) {
            AppSelect.mount(sortEl, {
                placeholder: "Mais recentes",
                searchPlaceholder: "Ordenar por...",
                ariaLabel: "Ordenar registros"
            });
            sortEl._appSelect.setOptions([
                { value: "recent", label: "Mais recentes" },
                { value: "cost_desc", label: "Maior gasto" },
                { value: "urgency", label: "Mais urgente" }
            ]);
            sortEl._appSelect.setValue("recent");
        }
    }

    function renderStats() {
        const total = Number(state.resumo?.total_gastos || 0);
        const count = Number(state.resumo?.quantidade_registros || state.history.length || 0);
        const overdue = state.alerts.filter((a) => String(a.status_code || "").toLowerCase() === "overdue").length;

        document.getElementById("statTotal").textContent = formatCurrency(total);

        const countEl = document.getElementById("statCount");
        const overdueEl = document.getElementById("statOverdue");
        countEl.setAttribute("data-count", String(count));
        overdueEl.setAttribute("data-count", String(overdue));

        if (window.AAAnim && window.AAAnim.counters) {
            window.AAAnim.counters.animate(document.getElementById("statsGrid"));
        } else {
            countEl.textContent = String(count);
            overdueEl.textContent = String(overdue);
        }
    }

    function renderAlerts() {
        const container = document.getElementById("alertsList");
        if (!state.alerts.length) {
            container.innerHTML = '<div class="empty">Nenhum alerta ativo no momento.</div>';
            return;
        }

        container.innerHTML = state.alerts.slice(0, 8).map((alert) => {
            const badgeClass = getBadgeClass(alert.status_code, alert.status);
            return `
                <div class="alert-item">
                    <div class="item-top">
                        <div class="item-title">${escapeHtml(alert.item || "Manutencao")}</div>
                        <span class="${badgeClass}">${escapeHtml(alert.status || "Aviso")}</span>
                    </div>
                    <div class="item-text">${escapeHtml(alert.msg || "")}</div>
                </div>
            `;
        }).join("");
    }

    function renderHistory() {
        const container = document.getElementById("historyList");
        if (!state.history.length) {
            container.innerHTML = '<div class="empty">Nenhum registro ainda. Adicione sua primeira manutencao acima.</div>';
            return;
        }

        const sortMode = document.getElementById("sortFilter").value;
        const vehicleMap = getVehicleMap();
        const vehicleInfoMap = getVehicleInfoMap();
        const sortedHistory = [...state.history].sort((a, b) => sortHistoryComparator(a, b, sortMode, vehicleInfoMap));

        container.innerHTML = sortedHistory.map((item) => {
            const vehicleId = item.vehicle_id !== null && item.vehicle_id !== undefined ? Number(item.vehicle_id) : null;
            const vehicleLabel = vehicleId !== null ? (vehicleMap.get(vehicleId) || ("Veiculo #" + vehicleId)) : "Sem vinculo";
            const nextDate = item.next_due_date ? formatDate(item.next_due_date) : "-";
            const nextKm = item.next_due_km ? (Number(item.next_due_km).toLocaleString("pt-BR") + " km") : "-";
            const costLabel = item.cost !== null && item.cost !== undefined ? formatCurrency(item.cost) : "-";
            const hasNoPlan = !item.next_due_date && (item.next_due_km === null || item.next_due_km === undefined);
            const isAiEnhanced = item.parser_metadata?.ai_enhanced === true;
            const rightBadge = hasNoPlan
                ? '<span class="badge badge-no-plan">Sem previsao</span>'
                : `<span class="badge badge-on_track">${isAiEnhanced ? '<i class="fas fa-robot"></i> Previsao IA' : formatDate(item.service_date)}</span>`;

            return `
                <div class="history-item">
                    <div class="item-top">
                        <div class="item-title">${escapeHtml(item.maintenance_label || "Manutencao geral")}</div>
                        <div class="actions-inline">
                            ${rightBadge}
                            <button class="icon-btn" title="Editar" onclick="startEditMaintenance(${Number(item.id)})">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="icon-btn delete" title="Excluir" onclick="deleteMaintenance(${Number(item.id)})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="item-text">${escapeHtml(item.description || "")}</div>
                    <div class="item-meta">
                        <span><i class="fas fa-car"></i> ${escapeHtml(vehicleLabel)}</span>
                        <span><i class="fas fa-money-bill-wave"></i> ${escapeHtml(costLabel)}</span>
                        ${item.next_due_date ? `<span><i class="fas fa-calendar-check"></i> Proxima data: ${escapeHtml(nextDate)}</span>` : ""}
                        ${item.next_due_km ? `<span><i class="fas fa-gauge-high"></i> Proximo km: ${escapeHtml(nextKm)}</span>` : ""}
                        ${isAiEnhanced && item.parser_metadata?.ai_justificativa ? `<div style="width:100%; margin-top:6px; font-style:italic; color:var(--text-muted);"><i class="fas fa-info-circle"></i> IA: ${escapeHtml(item.parser_metadata.ai_justificativa)}</div>` : ""}
                    </div>
                </div>
            `;
        }).join("");

        if (window.AAAnim && window.AAAnim.reveal) {
            window.AAAnim.reveal.staggerIn(container, ".history-item", { stagger: 45 });
        }
    }

    function safeDateForInput(value) {
        if (!value) return "";
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return "";
        return dt.toISOString().slice(0, 10);
    }

    function normalizeMetric(value, fallback = Number.MAX_SAFE_INTEGER) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback;
        return Number(value);
    }

    function computeUrgencyRank(item, vehicleInfoMap) {
        const now = new Date();
        const nextDate = item.next_due_date ? new Date(item.next_due_date) : null;
        const vehicleId = item.vehicle_id !== null && item.vehicle_id !== undefined ? Number(item.vehicle_id) : null;
        const currentKm = vehicleId !== null && vehicleInfoMap.get(vehicleId) ? Number(vehicleInfoMap.get(vehicleId).km || 0) : null;
        const nextKm = item.next_due_km !== null && item.next_due_km !== undefined ? Number(item.next_due_km) : null;

        let category = 3;
        let metric = Number.MAX_SAFE_INTEGER;

        if (nextDate && !Number.isNaN(nextDate.getTime())) {
            const dayMs = 24 * 60 * 60 * 1000;
            const daysRemaining = Math.floor((nextDate.getTime() - now.getTime()) / dayMs);
            if (daysRemaining < 0) {
                category = 0;
                metric = Math.min(metric, daysRemaining);
            } else if (daysRemaining <= 15) {
                category = Math.min(category, 1);
                metric = Math.min(metric, daysRemaining);
            } else {
                category = Math.min(category, 2);
                metric = Math.min(metric, daysRemaining);
            }
        }

        if (nextKm !== null) {
            if (currentKm !== null) {
                const kmRemaining = nextKm - currentKm;
                if (kmRemaining < 0) {
                    category = Math.min(category, 0);
                    metric = Math.min(metric, kmRemaining);
                } else if (kmRemaining <= 1000) {
                    category = Math.min(category, 1);
                    metric = Math.min(metric, kmRemaining);
                } else {
                    category = Math.min(category, 2);
                    metric = Math.min(metric, kmRemaining);
                }
            } else {
                category = Math.min(category, 2);
                metric = Math.min(metric, nextKm);
            }
        }

        return { category, metric };
    }

    function sortHistoryComparator(a, b, sortMode, vehicleInfoMap) {
        if (sortMode === "cost_desc") {
            const costA = normalizeMetric(a.cost, -1);
            const costB = normalizeMetric(b.cost, -1);
            if (costB !== costA) return costB - costA;
        } else if (sortMode === "urgency") {
            const rankA = computeUrgencyRank(a, vehicleInfoMap);
            const rankB = computeUrgencyRank(b, vehicleInfoMap);
            if (rankA.category !== rankB.category) return rankA.category - rankB.category;
            if (rankA.metric !== rankB.metric) return rankA.metric - rankB.metric;
        }

        const dateA = new Date(a.service_date || a.created_at || 0).getTime();
        const dateB = new Date(b.service_date || b.created_at || 0).getTime();
        return dateB - dateA;
    }

    function renderEmailSettings() {
        const settings = state.emailSettings || {};
        const enabled = !!settings.maintenance_email_enabled;
        const lastSent = settings.maintenance_email_last_sent ? formatDate(settings.maintenance_email_last_sent) : "-";
        document.getElementById("emailToggle").checked = enabled;
        document.getElementById("emailLastSent").textContent = "Ultimo envio: " + lastSent;
    }

    async function saveEmailToggle(enabled) {
        const res = await Auth.authenticatedFetch("/api/maintenance/email-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled })
        });
        if (!res.ok) throw new Error("Nao foi possivel atualizar email automatico");
    }

    async function submitMaintenance() {
        const description = document.getElementById("descricao").value.trim();
        if (!description) {
            alert("Descreva a manutencao antes de salvar.");
            return;
        }

        const payload = { descricao: description };
        const vehicleId = document.getElementById("veiculoSelect").value;
        const custo = document.getElementById("custo").value.trim();
        const kmServico = document.getElementById("kmServico").value.trim();
        const dataServico = document.getElementById("dataServico").value;
        const intervaloDias = document.getElementById("intervaloDias").value.trim();
        const intervaloKm = document.getElementById("intervaloKm").value.trim();

        if (vehicleId) payload.veiculo_id = Number(vehicleId);
        if (custo) payload.custo = custo;
        if (kmServico) payload.quilometragem_servico = Number(kmServico);
        if (dataServico) payload.data_servico = dataServico;
        if (intervaloDias) payload.intervalo_dias = Number(intervaloDias);
        if (intervaloKm) payload.intervalo_km = Number(intervaloKm);

        const btn = document.getElementById("btnSalvarRegistro");
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Salvando...';

        try {
            const isEditing = state.editingId !== null;
            if (!vehicleId && isEditing) payload.veiculo_id = "";
            const endpoint = isEditing
                ? "/api/maintenance/history/" + encodeURIComponent(state.editingId)
                : "/api/maintenance/history";
            const res = await Auth.authenticatedFetch(endpoint, {
                method: isEditing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro ao salvar manutencao");
            resetFormState();

            await Promise.all([fetchHistory(), fetchAlerts(), fetchEmailSettings()]);
            renderStats();
            renderAlerts();
            renderHistory();
            renderEmailSettings();
        } catch (err) {
            alert(err.message || "Erro ao salvar manutencao.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    function resetFormState() {
        state.editingId = null;
        document.getElementById("descricao").value = "";
        document.getElementById("custo").value = "";
        document.getElementById("kmServico").value = "";
        document.getElementById("dataServico").value = "";
        document.getElementById("intervaloDias").value = "";
        document.getElementById("intervaloKm").value = "";
        document.getElementById("veiculoSelect").value = "";
        document.getElementById("btnSalvarRegistro").innerHTML = '<i class="fas fa-plus"></i> Salvar Anotação';
        document.getElementById("btnCancelarEdicao").style.display = "none";
    }

    function startEditMaintenance(id) {
        const item = state.history.find((entry) => Number(entry.id) === Number(id));
        if (!item) return;

        state.editingId = Number(id);
        document.getElementById("descricao").value = item.description || "";
        document.getElementById("custo").value = (item.cost !== null && item.cost !== undefined) ? String(item.cost).replace(".", ",") : "";
        document.getElementById("kmServico").value = item.service_km || "";
        document.getElementById("dataServico").value = safeDateForInput(item.service_date);
        document.getElementById("intervaloDias").value = item.interval_days || "";
        document.getElementById("intervaloKm").value = item.interval_km || "";
        document.getElementById("veiculoSelect").value = (item.vehicle_id !== null && item.vehicle_id !== undefined) ? String(item.vehicle_id) : "";
        document.getElementById("btnSalvarRegistro").innerHTML = '<i class="fas fa-floppy-disk"></i> Salvar alteracoes';
        document.getElementById("btnCancelarEdicao").style.display = "inline-flex";
        document.getElementById("descricao").focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function deleteMaintenance(id) {
        const confirmed = window.confirm("Deseja excluir este registro de manutencao?");
        if (!confirmed) return;

        try {
            const res = await Auth.authenticatedFetch("/api/maintenance/history/" + encodeURIComponent(id), {
                method: "DELETE"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro ao excluir registro");

            if (state.editingId === Number(id)) {
                resetFormState();
            }
            await Promise.all([fetchHistory(), fetchAlerts(), fetchEmailSettings()]);
            renderStats();
            renderAlerts();
            renderHistory();
            renderEmailSettings();
        } catch (err) {
            alert(err.message || "Erro ao excluir manutencao.");
        }
    }

    async function refreshData() {
        await Promise.all([fetchHistory(), fetchAlerts(), fetchEmailSettings()]);
        renderStats();
        renderAlerts();
        renderHistory();
        renderEmailSettings();
    }

    async function init() {
        if (typeof Auth === "undefined" || !Auth.isAuthenticated()) {
            window.location.href = "login.html";
            return;
        }

        const user = await Auth.syncUser({ redirectOnInvalid: true });
        if (!user) return;

        if (!Auth.requirePremiumPage({
            title: "Anotações Premium",
            message: "Para acessar suas anotações de manutenção, ative o plano Premium.",
            backHref: "index.html"
        })) {
            return;
        }

        if (user && user.is_premium) {
            var _el = document.getElementById('navDashboard'); if (_el) _el.style.display = 'inline-flex';
            var _el = document.getElementById('btnMyVideos'); if (_el) _el.style.display = 'inline-flex';
        }

        // Carregamento instantâneo via Cache
        const cachedVehicles = Auth.Cache.get('autoassist_veiculos_cache');
        const cachedHistory = Auth.Cache.get('autoassist_history_cache');
        
        if (cachedVehicles) {
            state.vehicles = cachedVehicles;
            renderVehicleSelects();
        }
        if (cachedHistory) {
            state.history = cachedHistory;
            renderStats();
            renderHistory();
        }

        try {
            await fetchVehicles();
            renderVehicleSelects();
            await refreshData();
        } catch (err) {
            console.error(err);
            if (!cachedHistory) alert("Nao foi possivel carregar suas anotações.");
        }
    }

    document.getElementById("btnSalvarRegistro").addEventListener("click", submitMaintenance);
    document.getElementById("vehicleFilter").addEventListener("change", refreshData);
    document.getElementById("sortFilter").addEventListener("change", renderHistory);
    document.getElementById("btnCancelarEdicao").addEventListener("click", resetFormState);
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) btnLogout.addEventListener("click", () => Auth.logout());
    document.getElementById("emailToggle").addEventListener("change", async (event) => {
        const checked = event.target.checked;
        try {
            await saveEmailToggle(checked);
        } catch (err) {
            event.target.checked = !checked;
            alert(err.message || "Erro ao atualizar configuracao de email.");
        }
    });

    window.startEditMaintenance = startEditMaintenance;
    window.deleteMaintenance = deleteMaintenance;

    mountSelects();
    init();
