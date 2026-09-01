// Variáveis globais
        let map;
        let userLocation = null;
        let markers = [];
        let mechanicsData = [];
        let favoritesMap = {};
let isAuthenticated = false;
        let selectedRating = 0;
        let activeFilters = new Set();
        let currentTab = 'mechanics';
        
        // Todas as UFs do Brasil (para o filtro Local)
        
        // Inicializar
        document.addEventListener('DOMContentLoaded', function() {
            Auth.syncUser().then(user => {
                isAuthenticated = !!user;
                if (!isAuthenticated) {
                    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
                    return;
                }
                if (!Auth.requirePremiumPage({
                    title: 'Mapa Premium',
                    message: 'O mapa de mecânicos é exclusivo para usuários Premium.',
                    backHref: 'index.html'
                })) {
                    return;
                }
                const show = (id) => { const el = document.getElementById(id); if (el) el.style.display = ''; };
                const hide = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
                show('navDashboard'); show('navMaintenance'); show('navLibrary');
                show('navProfile'); hide('navLogin'); hide('navSignup');
                loadFavorites();
                initMap();
                setupFilterChips();
                setupStarRating();
                setupTabDefaults();
            }).catch(() => {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            });
        });
        
        // Configurar abas
        function setupTabDefaults() {
            switchTab('mechanics');
        }
        
function switchTab(tab) {
            currentTab = tab;
            document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
            document.querySelector(`.section-tab[data-tab="${tab}"]`)?.classList.add('active');

            document.getElementById('form-mechanics').style.display = tab === 'mechanics' ? '' : 'none';
            document.getElementById('section-mechanics').style.display = tab === 'mechanics' ? 'block' : 'none';
            document.getElementById('section-favorites').style.display = tab === 'favorites' ? 'block' : 'none';

            const titleEl = document.getElementById('searchTitle');
            const subtitleEl = document.getElementById('searchSubtitle');
            if (titleEl && subtitleEl) {
                if (tab === 'mechanics') {
                    titleEl.textContent = 'Buscar Mecânicos';
                    subtitleEl.textContent = 'Encontre oficinas e mecânicos próximos a você';
                } else {
                    titleEl.textContent = 'Mecânicos Favoritos';
                    subtitleEl.textContent = 'Oficinas e mecânicos que você salvou';
                }
            }

            if (tab === 'favorites') {
                loadFavorites();
            } else if (tab === 'mechanics') {
                if (map) map.invalidateSize();
                if (userLocation) {
                    searchMechanics();
                } else {
                    const container = document.getElementById('mechanics-list');
                    if (container) {
                        container.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-map-marker-alt"></i>
                                <h3>Definindo sua localização...</h3>
                                <p>Assim que a localização for definida, clique em "Buscar Mecânicos".</p>
                            </div>
                        `;
                    }
                }
            }
        }
        
// Inicializar mapa
        function initMap() {
            map = L.map('map', { zoomControl: false }).setView([-23.5505, -46.6333], 12);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);

            map.on('popupopen', onMechanicPopupOpen);

            setupMapResizeWatch();
            
            getUserLocation();
        }
        
        // Leaflet só pinta tiles quando o contêiner tem tamanho válido, então o
        // tamanho é reavaliado ao carregar, redimensionar, rolar (qualquer
        // container) e sempre que o mapa entra de novo na viewport  em
        // telas menores o mapa fica abaixo da dobra e só recebe tiles com
        // invalidateSize() depois de visível.
        function setupMapResizeWatch() {
            if (!map) return;
            
            let rafPending = false;
            const refresh = () => {
                if (rafPending) return;
                rafPending = true;
                requestAnimationFrame(() => {
                    rafPending = false;
                    map.invalidateSize();
                });
            };
            window.addEventListener('resize', refresh);
            window.addEventListener('load', refresh);
            window.addEventListener('scroll', refresh, true);
            document.addEventListener('scroll', refresh, true);
            setTimeout(refresh, 300);
            
            const mapEl = document.getElementById('map');
            if (mapEl && 'IntersectionObserver' in window) {
                const io = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) refresh();
                    });
                }, { threshold: 0.01 });
                io.observe(mapEl);
            }
            
            const panel = document.querySelector('.search-panel');
            if (panel) panel.addEventListener('scroll', refresh, { passive: true });
        }
        
        function addUserMarker() {
            if (!map || !userLocation) return;
            L.marker([userLocation.lat, userLocation.lng], {
                icon: L.divIcon({
                    className: 'user-marker',
                    html: '<i class="fas fa-user-circle" style="color: var(--accent, #3b82f6); font-size: 32px;"></i>',
                    iconSize: [32, 32]
                })
            }).addTo(map).bindPopup('Sua localização');
        }
        
        // Obter localização do usuário (sem disparar busca automática)
        function getUserLocation() {
            try {
                const stored = JSON.parse(localStorage.getItem('autoassist_location') || 'null');
                if (stored && isFinite(stored.lat) && isFinite(stored.lng)) {
                    userLocation = { lat: stored.lat, lng: stored.lng };
                    map.setView([userLocation.lat, userLocation.lng], 12);
                    addUserMarker();
                    const fresh = Date.now() - (stored.ts || 0) < 24 * 3600 * 1000;
                    if (!fresh) requestUserLocation();
                    return;
                }
            } catch (e) { /* cache corrompido  segue para geolocalização */ }
            requestUserLocation();
        }
        
        function requestUserLocation() {
            if (!navigator.geolocation) {
                setFallbackLocation();
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    localStorage.setItem("autoassist_location", JSON.stringify({
                        lat: userLocation.lat, lng: userLocation.lng, ts: Date.now()
                    }));
                    map.setView([userLocation.lat, userLocation.lng], 13);
                    addUserMarker();
                },
                () => setFallbackLocation(),
                { timeout: 8000, maximumAge: 600000 }
            );
        }
        
function setFallbackLocation() {
            console.warn('Erro ao obter localização. Usando SP.');
            userLocation = { lat: -23.5505, lng: -46.6333 };
            map.setView([-23.5505, -46.6333], 12);
            addUserMarker();
        }
        
        // Exibir lista de mecânicos (usada apenas pelos favoritos/modal)
        function displayMechanics(mechanics) {
            const listContainer = document.getElementById('mechanics-list');
            
            if (mechanics.length === 0) {
                listContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Nenhum mecânico encontrado</h3>
                        <p>Tente aumentar o raio de busca ou remover filtros</p>
                    </div>
                `;
                return;
            }
            
            listContainer.innerHTML = `
                <div class="results-count">${mechanics.length} mecânico${mechanics.length !== 1 ? 's' : ''} encontrado${mechanics.length !== 1 ? 's' : ''}</div>
                ${mechanics.map(m => renderMechanicCard(m)).join('')}
            `;

            if (window.AAAnim && window.AAAnim.reveal) {
                window.AAAnim.reveal.staggerIn(listContainer, '.mechanic-card', { stagger: 45 });
            }
        }
        
        function whatsappLink(telefone) {
            let digits = String(telefone || '').replace(/\D/g, '');
            if (digits.length === 10 || digits.length === 11) {
                digits = '55' + digits; // Brasil como padrão
            }
            if (!digits) return '#';
            return `https://wa.me/${digits}`;
        }

        function renderMechanicCard(mechanic) {
            const isOSM = isExternalMechanic(mechanic.id);
            const isFav = favoritesMap[mechanic.id];
            return `
                <div class="mechanic-card ${isFav ? 'selected' : ''}" onclick="selectMechanic('${mechanic.id}')" data-id="${mechanic.id}">
                    <div class="mechanic-header">
                        <div class="mechanic-name-row">
                            <div class="mechanic-name">${escapeHtml(mechanic.nome)}</div>
                            ${mechanic.is_verified ? '<span class="verified-badge" title="Verificado"><i class="fas fa-check-circle"></i></span>' : ''}
                            ${isOSM ? '<span style="color: var(--success); font-size: 11px; background: rgba(34,197,94,0.1); padding: 1px 6px; border-radius: 10px;"><i class="fas fa-globe"></i> Web</span>' : ''}
                        </div>
                        <div class="mechanic-actions">
                            <div class="mechanic-rating">
                                ${mechanic.avaliacao_media ? '<i class="fas fa-star"></i>' : ''}
                                <span>${mechanic.avaliacao_media ? Number(mechanic.avaliacao_media).toFixed(1) : ''}</span>
                                ${mechanic.total_avaliacoes ? `<span style="color: var(--text-muted); font-size: 11px;">(${mechanic.total_avaliacoes})</span>` : ''}
                            </div>
                            <button class="btn-favorite ${isFav ? 'is-favorite' : ''}" 
                                    onclick="event.stopPropagation(); toggleFavorite('${mechanic.id}')" 
                                    title="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mechanic-distance">
                        <i class="fas fa-location-arrow"></i> ${mechanic.distance_km} km de distância
                    </div>
                    
                    <div class="mechanic-info">
                        <div class="mechanic-info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${escapeHtml(mechanic.endereco)}, ${escapeHtml(mechanic.cidade)}-${mechanic.estado}</span>
                        </div>
${mechanic.telefone ? `
                            <div class="mechanic-info-item">
                                <i class="fas fa-phone"></i>
                                <span>${escapeHtml(mechanic.telefone)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${mechanic.telefone ? `
                        <a class="btn btn-whatsapp" target="_blank" rel="noopener" href="${whatsappLink(mechanic.telefone)}">
                            <i class="fab fa-whatsapp"></i> Agendar no WhatsApp
                        </a>
                    ` : ''}
                    
                    ${mechanic.especialidades && mechanic.especialidades.length > 0 ? `
                        <div class="mechanic-services">
                            ${mechanic.especialidades.slice(0, 4).map(s => `<span class="service-tag">${formatService(s)}</span>`).join('')}
                            ${mechanic.especialidades.length > 4 ? `<span class="service-tag">+${mechanic.especialidades.length - 4}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        // Configurar filter chips de especialidades
        function setupFilterChips() {
            document.querySelectorAll('.filter-chip').forEach(chip => {
                chip.addEventListener('click', function() {
                    const filter = this.dataset.filter;
                    this.classList.toggle('active');
                    
                    if (activeFilters.has(filter)) {
                        activeFilters.delete(filter);
                    } else {
                        activeFilters.add(filter);
                    }
                    
                    applyFilters();
                });
            });
        }
        
        // Aplicar filtros à lista exibida
        function applyFilters() {
            if (mechanicsData.length === 0) return;
            
            let filtered = mechanicsData;
            
            if (activeFilters.size > 0) {
                filtered = mechanicsData.filter(m => {
                    const specs = m.especialidades || [];
                    return specs.some(s => activeFilters.has(s));
                });
            }
            
            displayMechanics(filtered);
            addMechanicsToMap(filtered);
        }
        
        // Buscar mecânicos próximos
        async function searchMechanics() {
            if (!userLocation) return;
            
            const serviceType = document.getElementById('search-service').value;
            const radius = document.getElementById('search-radius').value;
            const minRating = document.getElementById('search-rating').value;
            
            const btn = document.getElementById('btn-mechanics-search');
            const container = document.getElementById('mechanics-list');
            if (!btn || !container) return;
            
            btn.disabled = true;
            btn.innerHTML = AppLoader.button('Buscando...');
            
            container.innerHTML = AppLoader.block('Buscando mecânicos próximos...');
            
            const startTime = Date.now();
            
            try {
                let url = `${CONFIG.API_URL}/api/mechanics/search?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radius}`;
                
                if (serviceType) url += `&service_type=${serviceType}`;
                if (minRating > 0) url += `&min_rating=${minRating}`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Erro na busca');
                }
                
                mechanicsData = data.mechanics || [];
                const elapsed = Date.now() - startTime;
                const minLoad = 300;
                if (elapsed < minLoad) {
                    await new Promise(r => setTimeout(r, minLoad - elapsed));
                }
                applyFilters();
            } catch (error) {
                console.error('Erro:', error);
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>Erro na busca</h3>
                        <p>${escapeHtml(error.message)}</p>
                    </div>
                `;
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-search"></i> Buscar Mecânicos';
            }
        }
        
        // Mantém o scroll/clique/teclado DENTRO do popup, sem afetar o mapa
        // (o Leaflet captura wheel/setas para zoom/pan por padrão).
        function onMechanicPopupOpen(e) {
            const popup = e.popup;
            const el = popup.getElement();
            if (!el) return;

            L.DomEvent.disableScrollPropagation(el);
            L.DomEvent.disableClickPropagation(el);

            const content = el.querySelector('.leaflet-popup-content');
            if (!content) return;

            content.setAttribute('tabindex', '0');
            content.focus({ preventScroll: true });

            L.DomEvent.on(content, 'keydown', function (ev) {
                const scrollKeys = [
                    'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown',
                    'Home', 'End', ' '
                ];
                if (scrollKeys.includes(ev.key)) {
                    L.DomEvent.stopPropagation(ev);
                }
            });
        }

        function addMechanicsToMap(mechanics) {
            markers.forEach(marker => map.removeLayer(marker));
            markers = [];
            
            mechanics.forEach(mechanic => {
                const lat = mechanic.latitude;
                const lng = mechanic.longitude;
                if (!lat || !lng) return;

                const isFav = favoritesMap[mechanic.id];
                const icon = L.divIcon({
                    className: 'mechanic-marker',
                    html: `<i class="fas fa-wrench" style="color: ${isFav ? '#ef4444' : '#f59e0b'}; font-size: 28px;"></i>`,
                    iconSize: [28, 28]
                });

                let marker;
                if (mechanic.geometry) {
                    marker = L.geoJSON(mechanic.geometry, {
                        pointToLayer: (feature, latlng) => L.marker(latlng, { icon })
                    });
                    marker.addTo(map);
                } else {
                    marker = L.marker([lat, lng], { icon }).addTo(map);
                }

                const popupContent = `
                    <div class="mechanic-popup">
                        <h4>${escapeHtml(mechanic.nome)}</h4>
                        <div class="popup-rating">
                            <i class="fas fa-star"></i> ${mechanic.avaliacao_media ? Number(mechanic.avaliacao_media).toFixed(1) : 'N/A'}
                            <span style="color: #71717a; font-size: 11px;">(${mechanic.total_avaliacoes || 0})</span>
                        </div>
                        <div class="popup-addr">${escapeHtml(mechanic.endereco)}</div>
                        <div class="popup-dist">${mechanic.distance_km} km</div>
                        <a class="popup-link" onclick="selectMechanic('${mechanic.id}')">Ver detalhes</a>
                    </div>
                `;

                if (marker.bindPopup) {
                    marker.bindPopup(popupContent);
                    marker.bindTooltip(popupContent, { direction: 'top', offset: [0, -14], sticky: true, className: 'map-preview-tooltip' });
                    marker.on('click', () => selectMechanic(mechanic.id));
                } else if (marker.eachLayer) {
                    marker.eachLayer(l => {
                        l.bindPopup(popupContent);
                        l.bindTooltip(popupContent, { direction: 'top', offset: [0, -14], sticky: true, className: 'map-preview-tooltip' });
                        l.on('click', () => selectMechanic(mechanic.id));
                    });
                }

                markers.push(marker);
            });
            
            if (markers.length > 0) {
                const group = L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.1));
            }
        }
        
        function findMechanic(mechanicId) {
            return mechanicsData.find(m => String(m.id) === String(mechanicId));
        }

        function isExternalMechanic(mechanicId) {
            const id = String(mechanicId);
            return id.startsWith('osm_') || id.startsWith('web_');
        }

        // Selecionar mecânico
        function selectMechanic(mechanicId) {
            document.querySelectorAll('.mechanic-card').forEach(card => {
                card.classList.remove('selected');
            });

            const selectedCard = document.querySelector(`[data-id="${mechanicId}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }

            const mechanic = findMechanic(mechanicId);
            if (mechanic && mechanic.latitude && mechanic.longitude) {
                map.setView([mechanic.latitude, mechanic.longitude], 15);
            } else if (!isExternalMechanic(mechanicId)) {
                // Se for favorito do MySQL mas não está na lista atual,
                // busca do backend pra centralizar o mapa
                fetch(`${CONFIG.API_URL}/api/mechanics/${mechanicId}`)
                    .then(r => r.json())
                    .then(d => {
                        if (d.success && d.mechanic && d.mechanic.latitude) {
                            map.setView([d.mechanic.latitude, d.mechanic.longitude], 15);
                            L.marker([d.mechanic.latitude, d.mechanic.longitude], {
                                icon: L.divIcon({
                                    className: 'favorite-marker',
                                    html: '<i class="fas fa-heart" style="color: #ef4444; font-size: 28px;"></i>',
                                    iconSize: [28, 28]
                                })
                            }).addTo(map).bindPopup(escapeHtml(d.mechanic.nome));
                        }
                    }).catch(() => {});
            }

            openDetailModal(mechanicId);
        }
        
        // ─── Modal de Detalhes ─────────────────────────────────────────────────
        
        function openDetailModal(mechanicId) {
            const modal = document.getElementById('detail-modal');
            modal.classList.add('open');
            
            document.getElementById('modal-body').innerHTML = AppLoader.block('Carregando detalhes...');
            
            loadMechanicDetail(mechanicId);
        }
        
        function closeDetailModal() {
            document.getElementById('detail-modal').classList.remove('open');
        }
        
        // Fechar modal ao clicar fora
        document.addEventListener('click', function(e) {
            const modal = document.getElementById('detail-modal');
            if (modal.classList.contains('open') && e.target === modal) {
                closeDetailModal();
            }
        });
        
        // Fechar com ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeDetailModal();
            }
        });
        
        async function loadMechanicDetail(mechanicId) {
            try {
                if (isExternalMechanic(mechanicId)) {
                    const mechanic = findMechanic(mechanicId);
                    if (mechanic) {
                        renderDetailModal(mechanic);
                    } else {
                        throw new Error('Mecânico não encontrado');
                    }
                    return;
                }

                const response = await fetch(`${CONFIG.API_URL}/api/mechanics/${mechanicId}`);
                const data = await response.json();
                
                if (data.success) {
                    renderDetailModal(data.mechanic);
                } else {
                    throw new Error(data.error || 'Erro ao carregar detalhes');
                }
            } catch (error) {
                document.getElementById('modal-body').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>Erro ao carregar</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }
        
        function renderDetailModal(mechanic) {
            const isOSM = isExternalMechanic(mechanic.id);
            const isFav = favoritesMap[mechanic.id];
            
            document.getElementById('modal-name').innerHTML = `
                ${escapeHtml(mechanic.nome)}
                ${mechanic.is_verified ? '<span style="color: var(--accent); font-size: 16px;"><i class="fas fa-check-circle"></i></span>' : ''}
                ${isOSM ? '<span style="color: var(--success); font-size: 12px; background: rgba(34,197,94,0.1); padding: 2px 8px; border-radius: 12px;"><i class="fas fa-globe"></i> Web</span>' : ''}
                <button class="btn-favorite ${isFav ? 'is-favorite' : ''}" 
                        onclick="toggleFavorite('${mechanic.id}')" 
                        style="font-size: 18px; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; background: ${isFav ? 'var(--danger-soft)' : 'var(--bg-card)'}; border: 1px solid var(--border-color);"
                        title="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                    <i class="fas fa-heart" style="color: ${isFav ? 'var(--danger)' : 'var(--text-muted)'};"></i>
                    <span style="font-size: 12px; font-weight: 500; color: ${isFav ? 'var(--danger)' : 'var(--text-muted)'};">${isFav ? 'Favorito' : 'Favoritar'}</span>
                </button>
            `;
            
            document.getElementById('modal-subtitle').textContent = 
                `${mechanic.endereco}, ${mechanic.cidade} - ${mechanic.estado} • ${mechanic.distance_km || '?'} km`;
            
            const body = document.getElementById('modal-body');
            
            let html = '';
            
            // Descrição
            if (mechanic.descricao) {
                html += `
                    <div class="detail-section">
                        <div class="detail-section-title"><i class="fas fa-info-circle"></i> Sobre</div>
                        <div class="detail-description">${escapeHtml(mechanic.descricao)}</div>
                    </div>
                `;
            }
            
            // Avaliação
            html += `
                <div class="detail-section">
                    <div class="detail-section-title"><i class="fas fa-star"></i> Avaliação</div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 28px; font-weight: 700; color: var(--warning);">
                            ${mechanic.avaliacao_media ? Number(mechanic.avaliacao_media).toFixed(1) : 'N/A'}
                        </span>
                        <div>
                            <div style="color: var(--warning); font-size: 16px;">
                                ${renderStars(mechanic.avaliacao_media || 0)}
                            </div>
                            <span style="font-size: 13px; color: var(--text-muted);">
                                ${mechanic.total_avaliacoes || 0} avaliaç${(mechanic.total_avaliacoes || 0) === 1 ? 'ão' : 'ões'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
            
            // Serviços com preços
            if (mechanic.servicos && mechanic.servicos.length > 0) {
                html += `
                    <div class="detail-section">
                        <div class="detail-section-title"><i class="fas fa-tools"></i> Serviços e Preços</div>
                        <table class="services-table">
                            <thead>
                                <tr><th>Serviço</th><th style="text-align: right;">Preço</th></tr>
                            </thead>
                            <tbody>
                                ${mechanic.servicos.map(s => `
                                    <tr>
                                        <td>${escapeHtml(s.nome)}</td>
                                        <td style="text-align: right;" class="price">${s.preco ? `R$ ${Number(s.preco).toFixed(2)}` : 'Sob consulta'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            // Especialidades
            if (mechanic.especialidades && mechanic.especialidades.length > 0) {
                html += `
                    <div class="detail-section">
                        <div class="detail-section-title"><i class="fas fa-wrench"></i> Especialidades</div>
                        <div class="mechanic-services">
                            ${mechanic.especialidades.map(s => `<span class="service-tag">${formatService(s)}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
            
            // Horários
            if (mechanic.horario_funcionamento) {
                html += `
                    <div class="detail-section">
                        <div class="detail-section-title"><i class="fas fa-clock"></i> Horário de Funcionamento</div>
                        <div class="hours-grid">
                            ${renderHours(mechanic.horario_funcionamento)}
                        </div>
                    </div>
                `;
            }
            
            // Contato
            html += `
                <div class="detail-section">
                    <div class="detail-section-title"><i class="fas fa-phone"></i> Contato</div>
                    <div class="contact-grid">
${mechanic.telefone ? `
                            <div class="contact-item">
                                <i class="fas fa-phone"></i>
                                <span>${escapeHtml(mechanic.telefone)}</span>
                            </div>
                            <div class="contact-item contact-whatsapp">
                                <i class="fab fa-whatsapp"></i>
                                <a href="${whatsappLink(mechanic.telefone)}" target="_blank" rel="noopener">Agendar no WhatsApp</a>
                            </div>
                        ` : ''}
                        ${mechanic.email ? `
                            <div class="contact-item">
                                <i class="fas fa-envelope"></i>
                                <a href="mailto:${escapeHtml(mechanic.email)}">${escapeHtml(mechanic.email)}</a>
                            </div>
                        ` : ''}
                        ${mechanic.website ? `
                            <div class="contact-item">
                                <i class="fas fa-globe"></i>
                                <a href="${escapeHtml(mechanic.website)}" target="_blank" rel="noopener">${escapeHtml(mechanic.website)}</a>
                            </div>
                        ` : ''}
                        ${mechanic.cnpj ? `
                            <div class="contact-item">
                                <i class="fas fa-building"></i>
                                <span>CNPJ: ${escapeHtml(mechanic.cnpj)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            // Avaliações
            html += `
                <div class="detail-section">
                    <div class="detail-section-title"><i class="fas fa-comments"></i> Avaliações</div>
                    <div id="reviews-container">
                        ${renderReviewsSection(mechanic)}
                    </div>
                </div>
            `;
            
            body.innerHTML = html;
            
            // Setup star rating no formulário de review
            setupStarRating();
            
            // Scroll para o topo
            body.scrollTop = 0;
        }
        
        function renderStars(rating) {
            const full = Math.floor(rating);
            const half = rating - full >= 0.25 && rating - full < 0.75;
            const empty = 5 - full - (half ? 1 : 0);
            return '★'.repeat(full) + (half ? '★' : '') + '☆'.repeat(empty);
        }
        
        function renderHours(hours) {
            const dayNames = {
                'seg': 'Segunda-feira',
                'ter': 'Terça-feira',
                'qua': 'Quarta-feira',
                'qui': 'Quinta-feira',
                'sex': 'Sexta-feira',
                'sab': 'Sábado',
                'dom': 'Domingo'
            };
            
            const order = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
            
            return order.map(day => {
                const time = hours[day];
                const label = dayNames[day] || day;
                if (!time || time === 'fechado') {
                    return `
                        <div class="hours-row">
                            <span class="hours-day">${label}</span>
                            <span class="hours-time hours-closed">Fechado</span>
                        </div>
                    `;
                }
                return `
                    <div class="hours-row">
                        <span class="hours-day">${label}</span>
                        <span class="hours-time">${escapeHtml(time)}</span>
                    </div>
                `;
            }).join('');
        }
        
        function renderReviewsSection(mechanic) {
            const reviews = mechanic.reviews || [];
            
            let html = '';
            
            // Formulário de review (apenas para autenticados)
            if (isAuthenticated) {
                html += `
                    <div class="review-form">
                        <div class="review-form-title">Deixe sua avaliação</div>
                        <div class="star-rating" id="review-stars">
                            <i class="fas fa-star" data-value="1"></i>
                            <i class="fas fa-star" data-value="2"></i>
                            <i class="fas fa-star" data-value="3"></i>
                            <i class="fas fa-star" data-value="4"></i>
                            <i class="fas fa-star" data-value="5"></i>
                        </div>
                        <textarea id="review-comment" placeholder="Conte sua experiência (opcional)"></textarea>
                        <button class="btn-submit-review" onclick="submitReview(${mechanic.id})">
                            <i class="fas fa-paper-plane"></i> Enviar Avaliação
                        </button>
                    </div>
                `;
            }
            
            // Lista de reviews
            if (reviews.length === 0 && !isAuthenticated) {
                html += `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 12px;">Nenhuma avaliação ainda.</div>`;
            } else if (reviews.length === 0) {
                // Only show if we already showed the form
                if (!isAuthenticated) {
                    html += `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 12px;">Nenhuma avaliação ainda.</div>`;
                }
            } else {
                html += `<div class="reviews-list">`;
                reviews.slice(0, 5).forEach(r => {
                    html += `
                        <div class="review-item">
                            <div class="review-header">
                                <div class="review-user">
                                    <div class="review-avatar">${(r.user_nome || 'A').charAt(0).toUpperCase()}</div>
                                    <div>
                                        <div class="review-name">${escapeHtml(r.user_nome || 'Anônimo')}</div>
                                        <div class="review-date">${formatDate(r.created_at)}</div>
                                    </div>
                                </div>
                                <div class="review-stars">
                                    ${'★'.repeat(r.avaliacao)}${'☆'.repeat(5 - r.avaliacao)}
                                </div>
                            </div>
                            ${r.comentario ? `<div class="review-comment">${escapeHtml(r.comentario)}</div>` : ''}
                            ${r.service_type ? `<div class="review-service">${formatService(r.service_type)}</div>` : ''}
                        </div>
                    `;
                });
                html += `</div>`;
            }
            
            return html;
        }
        
        // ─── Favoritos ─────────────────────────────────────────────────────────
        
        async function loadFavorites() {
            if (!isAuthenticated) {
                document.getElementById('favorites-list').innerHTML = `
                    <div class="favorites-empty">
                        <i class="fas fa-heart" style="font-size: 20px; margin-bottom: 8px; display: block; color: var(--border-color);"></i>
                        Faça login para salvar favoritos
                    </div>
                `;
                return;
            }
            
            try {
                const response = await Auth.authenticatedFetch(`/api/mechanics/favorites`);
                if (!response) return;
                
                const data = await response.json();
                if (data.success) {
                    const favs = data.favorites || [];
                    favoritesMap = {};
                    favs.forEach(f => {
                        favoritesMap[f.id] = true;
                    });

                    // Mapeia mecânicos externos nos resultados atuais para os IDs do MySQL
                    // pra que os ícones de favorito apareçam corretamente
                    mechanicsData.forEach(m => {
                        if (isExternalMechanic(m.id)) {
                            const match = favs.find(f =>
                                f.nome === m.nome &&
                                Math.abs(parseFloat(f.latitude) - parseFloat(m.latitude)) < 0.001 &&
                                Math.abs(parseFloat(f.longitude) - parseFloat(m.longitude)) < 0.001
                            );
                            if (match) {
                                m.id = match.id;
                                favoritesMap[m.id] = true;
                            }
                        }
                    });
                    
                    renderFavorites(favs);
                    updateFavoriteIcons();
                }
            } catch (error) {
                console.error('Erro ao carregar favoritos:', error);
            }
        }
        
        function renderFavorites(favorites) {
            const container = document.getElementById('favorites-list');
            
            if (favorites.length === 0) {
                container.innerHTML = `
                    <div class="favorites-empty">
                        <i class="fas fa-heart" style="font-size: 20px; margin-bottom: 8px; display: block; color: var(--border-color);"></i>
                        Nenhum mecânico favoritado ainda
                    </div>
                `;
                return;
            }
            
            container.innerHTML = favorites.map(f => `
                <div class="favorite-item" onclick="selectMechanic('${f.id}'); switchTab('mechanics');">
                    <div>
                        <div class="favorite-item-name">${escapeHtml(f.nome)}</div>
                        <div class="favorite-item-rating">
                            <i class="fas fa-star"></i> ${f.avaliacao_media ? Number(f.avaliacao_media).toFixed(1) : 'N/A'}
                            <span style="color: var(--text-muted); font-size: 11px;">(${f.total_avaliacoes || 0})</span>
                        </div>
                    </div>
                    <button class="favorite-item-remove" onclick="event.stopPropagation(); toggleFavorite('${f.id}')" title="Remover">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
        
        function updateFavoriteIcons() {
            document.querySelectorAll('.btn-favorite').forEach(btn => {
                const card = btn.closest('[data-id]');
                if (card) {
                    const id = card.dataset.id;
                    const isFav = favoritesMap[id];
                    btn.classList.toggle('is-favorite', isFav);
                    btn.title = isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
                    btn.innerHTML = `<i class="fas fa-heart"></i>`;
                }
            });
            
            // Re-render map markers with updated colors
            if (mechanicsData.length > 0) {
                addMechanicsToMap(mechanicsData);
            }
        }
        
        async function toggleFavorite(mechanicId) {
            if (!isAuthenticated) {
                alert('Faça login para salvar favoritos.');
                return;
            }

            const mechanic = findMechanic(mechanicId);
            const isExternal = isExternalMechanic(mechanicId);
            const isFav = !!favoritesMap[mechanicId];

            try {
                const method = isFav ? 'DELETE' : 'POST';
                const options = { method };

                if (isExternal && !isFav && mechanic) {
                    options.headers = { 'Content-Type': 'application/json' };
                    options.body = JSON.stringify({
                        nome: mechanic.nome,
                        endereco: mechanic.endereco,
                        cidade: mechanic.cidade,
                        estado: mechanic.estado,
                        latitude: mechanic.latitude,
                        longitude: mechanic.longitude,
                        telefone: mechanic.telefone,
                        website: mechanic.website,
                        descricao: mechanic.descricao,
                        especialidades: mechanic.especialidades
                    });
                }

                const response = await Auth.authenticatedFetch(`/api/mechanics/${mechanicId}/favorite`, options);
                if (!response) return;

                const data = await response.json();
                if (data.success) {
                    if (isFav) {
                        delete favoritesMap[mechanicId];
                    } else {
                        favoritesMap[mechanicId] = true;
                    }

                    // Se o backend retornou um novo ID (mecânico externo salvo no MySQL),
                    // atualiza o ID no mechanicsData e no favoritesMap
                    if (data.mechanic_id && isExternal && !isFav) {
                        const newId = data.mechanic_id;
                        if (mechanic) {
                            mechanic.id = newId;
                            favoritesMap[newId] = true;
                            delete favoritesMap[mechanicId];
                        }
                    }

loadFavorites();
                    updateFavoriteIcons();

                    const modal = document.getElementById('detail-modal');
                    if (modal.classList.contains('open')) {
                        const targetId = mechanic ? mechanic.id : mechanicId;
                        loadMechanicDetail(targetId);
                    }
                }
            } catch (error) {
                console.error('Erro ao alterar favorito:', error);
            }
        }
        
        // ─── Avaliações ────────────────────────────────────────────────────────
        
        function setupStarRating() {
            document.querySelectorAll('.star-rating').forEach(container => {
                const stars = container.querySelectorAll('i');
                stars.forEach(star => {
                    star.addEventListener('mouseenter', function() {
                        const value = parseInt(this.dataset.value);
                        stars.forEach(s => {
                            s.classList.toggle('hover', parseInt(s.dataset.value) <= value);
                        });
                    });
                    
                    star.addEventListener('mouseleave', function() {
                        stars.forEach(s => s.classList.remove('hover'));
                    });
                    
                    star.addEventListener('click', function() {
                        const value = parseInt(this.dataset.value);
                        selectedRating = value;
                        stars.forEach(s => {
                            s.classList.toggle('selected', parseInt(s.dataset.value) <= value);
                        });
                    });
                });
            });
        }
        
        async function submitReview(mechanicId) {
            if (!isAuthenticated) {
                alert('Faça login para avaliar.');
                return;
            }
            
            if (selectedRating === 0) {
                alert('Selecione uma nota.');
                return;
            }
            
            const comment = document.getElementById('review-comment')?.value || '';
            
            const btn = document.querySelector('.btn-submit-review');
            btn.disabled = true;
            btn.innerHTML = AppLoader.button('Enviando...');
            
            try {
                const response = await Auth.authenticatedFetch(
                    `/api/mechanics/${mechanicId}/reviews`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            avaliacao: selectedRating,
                            comentario: comment
                        })
                    }
                );
                
                if (!response) return;
                
                const data = await response.json();
                if (data.success) {
                    selectedRating = 0;
                    if (document.getElementById('review-comment')) {
                        document.getElementById('review-comment').value = '';
                    }
                    document.querySelectorAll('.star-rating i').forEach(s => s.classList.remove('selected'));
                    
                    // Recarregar detalhes para mostrar a nova avaliação
                    loadMechanicDetail(mechanicId);
                } else {
                    alert(data.error || 'Erro ao enviar avaliação.');
                }
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro ao enviar avaliação.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Avaliação';
            }
        }
        
        // ─── Utilitários ───────────────────────────────────────────────────────
        
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function formatService(service) {
            if (!service) return '';
            return service
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
        }
        
        function formatDate(dateStr) {
            if (!dateStr) return '';
            try {
                const d = new Date(dateStr);
                return d.toLocaleDateString('pt-BR');
            } catch {
                return dateStr;
            }
        }
