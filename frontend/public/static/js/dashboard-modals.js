(function () {
            const MOD_CATEGORIAS = ['visual','performance','audio','rodas','suspensao','interior','eletronica','outro'];
            const MOD_LABELS = {
                visual: 'Visual', performance: 'Performance', audio: 'Áudio',
                rodas: 'Rodas', suspensao: 'Suspensão', interior: 'Interior',
                eletronica: 'Eletrônica', outro: 'Outro'
            };
            let currentModVehicleId = null;

            function modOptions(selected) {
                return MOD_CATEGORIAS.map(c =>
                    `<option value="${c}" ${c === selected ? 'selected' : ''}>${MOD_LABELS[c]}</option>`
                ).join('');
            }
            function addModRow(cat, nome, valor) {
                const rows = document.getElementById('modPassportRows');
                const div = document.createElement('div');
                div.className = 'mod-row';
                div.innerHTML = `
                    <select class="mod-cat">${modOptions(cat || 'visual')}</select>
                    <input class="mod-nome" type="text" placeholder="Descrição (ex: Escape esportivo)" value="${escapeHTML(nome || '')}" />
                    <input class="mod-valor" type="number" step="0.01" min="0" placeholder="Valor R$ (opc.)" value="${valor != null ? valor : ''}" />
                    <button type="button" class="mod-remove" title="Remover">&times;</button>
                `;
                div.querySelector('.mod-remove').addEventListener('click', () => div.remove());
                rows.appendChild(div);
            }
            window.openModPassport = async function (vehicleId) {
                currentModVehicleId = vehicleId;
                const mod = (window.__modMap && window.__modMap[vehicleId]) || {};
                const sub = document.getElementById('modPassportSub');
                sub.textContent = `Veículo: ${escapeHTML(mod.marca || '')} ${escapeHTML(mod.modelo || '')}`;
                const rows = document.getElementById('modPassportRows');
                rows.innerHTML = '';
                const mods = parseMods(mod.modificacoes);
                if (mods.length === 0) addModRow();
                else mods.forEach(m => addModRow(m.categoria, m.nome, m.valor));
                document.getElementById('modStatus').textContent = '';
                document.getElementById('modStatus').className = 'mod-status';
                document.getElementById('modPassportModal').classList.add('open');
            };
            function closeModPassport() {
                document.getElementById('modPassportModal').classList.remove('open');
            }
            document.getElementById('modCancel').addEventListener('click', closeModPassport);
            document.getElementById('modAddRow').addEventListener('click', () => addModRow());
            document.getElementById('modPassportModal').addEventListener('click', (e) => {
                if (e.target.id === 'modPassportModal') closeModPassport();
            });
            document.getElementById('modSave').addEventListener('click', async () => {
                if (!currentModVehicleId) return;
                const status = document.getElementById('modStatus');
                const rows = document.querySelectorAll('#modPassportRows .mod-row');
                const modificacoes = [];
                rows.forEach(r => {
                    const nome = (r.querySelector('.mod-nome').value || '').trim();
                    if (!nome) return;
                    const categoria = r.querySelector('.mod-cat').value;
                    const valorRaw = r.querySelector('.mod-valor').value;
                    const valor = valorRaw === '' ? null : Number(valorRaw);
                    modificacoes.push({ categoria, nome, valor: isNaN(valor) ? null : valor });
                });
                status.textContent = 'Salvando...';
                status.className = 'mod-status';
                try {
                    const res = await Auth.authenticatedFetch(`/api/veiculos/${currentModVehicleId}/modificacoes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ modificacoes }),
                        redirectOnInvalid: false,
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        status.textContent = data.error || 'Erro ao salvar modificações.';
                        status.className = 'mod-status error';
                        return;
                    }
                    if (window.__modMap && window.__modMap[currentModVehicleId]) {
                        window.__modMap[currentModVehicleId].modificacoes = modificacoes;
                        window.__modMap[currentModVehicleId].fipe_valor = data.fipe_base;
                        window.__modMap[currentModVehicleId].fipe_ajustada = data.fipe_ajustada;
                    }
                    const id = currentModVehicleId;
                    document.getElementById('modBase-' + id).textContent = brl(data.fipe_base);
                    const pct = data.pct_ajuste || 0;
                    const badge = pct > 0 ? `<span class="modp-badge up">+${pct.toFixed(1).toString().replace('.', ',')}%</span>` : '<span class="modp-badge flat">sem ajuste</span>';
                    const adjEl = document.getElementById('modAdj-' + id);
                    adjEl.innerHTML = `${brl(data.fipe_ajustada)} ${badge}`;
                    document.getElementById('modCount-' + id).innerHTML = modificacoes.length
                        ? `<p class="modp-empty">${modificacoes.length} modificação(ões) registrada(s)</p>`
                        : `<p class="modp-empty">Nenhuma modificação ainda</p>`;
                    status.textContent = 'Mod Passport atualizado!';
                    status.className = 'mod-status ok';
                    setTimeout(closeModPassport, 900);
                } catch (e) {
                    status.textContent = 'Erro de conexão ao salvar.';
                    status.className = 'mod-status error';
                }
            });
            document.getElementById('modHistory').addEventListener('click', async () => {
                if (!currentModVehicleId) return;
                const box = document.getElementById('modHistoryList');
                box.innerHTML = 'Carregando...';
                try {
                    const res = await Auth.authenticatedFetch(`/api/veiculos/${currentModVehicleId}/modificacoes/history`, { redirectOnInvalid: false });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) { box.innerHTML = `<p class="modp-aviso">${data.error || 'Erro'}</p>`; return; }
                    if (!data.history || !data.history.length) { box.innerHTML = '<p class="modp-empty">Nenhum snapshot salvo ainda.</p>'; return; }
                    box.innerHTML = data.history.map(h => `
                        <div class="mod-history-item">
                            <span>${new Date(h.created_at).toLocaleString('pt-BR')}</span>
                            <span>${h.qtd_modificacoes} mod(s)</span>
                            <span>${h.valor_estimado || '-'}</span>
                        </div>`).join('');
                } catch (e) { box.innerHTML = '<p class="modp-aviso">Erro de conexão.</p>'; }
            });
            document.getElementById('modShare').addEventListener('click', async () => {
                if (!currentModVehicleId) return;
                const status = document.getElementById('modStatus');
                status.textContent = 'Gerando link...';
                status.className = 'mod-status';
                try {
                    const res = await Auth.authenticatedFetch(`/api/veiculos/${currentModVehicleId}/mod-passport/share`, { method: 'POST', redirectOnInvalid: false });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) { status.textContent = data.error || 'Erro ao compartilhar.'; status.className = 'mod-status error'; return; }
                    const box = document.getElementById('modShareBox');
                    box.style.display = 'flex';
                    document.getElementById('modShareUrl').value = data.share_url;
                    document.getElementById('modPdfLink').href = data.share_url + '/pdf';
                    status.textContent = 'Link público gerado!';
                    status.className = 'mod-status ok';
                } catch (e) { status.textContent = 'Erro de conexão.'; status.className = 'mod-status error'; }
            });
            document.getElementById('modExport').addEventListener('click', async () => {
                if (!currentModVehicleId) return;
                const status = document.getElementById('modStatus');
                status.textContent = 'Gerando PDF...';
                status.className = 'mod-status';
                try {
                    const res = await Auth.authenticatedFetch(`/api/veiculos/${currentModVehicleId}/mod-passport/share`, { method: 'POST', redirectOnInvalid: false });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) { status.textContent = data.error || 'Erro ao exportar.'; status.className = 'mod-status error'; return; }
                    window.open(data.share_url + '/pdf', '_blank', 'noopener');
                    status.textContent = 'PDF gerado.';
                    status.className = 'mod-status ok';
                } catch (e) { status.textContent = 'Erro de conexão.'; status.className = 'mod-status error'; }
            });
            document.getElementById('modCopyUrl').addEventListener('click', () => {
                const url = document.getElementById('modShareUrl').value;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(() => {
                        const s = document.getElementById('modStatus');
                        s.textContent = 'Link copiado!'; s.className = 'mod-status ok';
                    });
                }
            });
        })();
