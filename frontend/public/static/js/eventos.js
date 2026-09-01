// Renderiza o header correto ANTES do primeiro paint (sem flash).
      if (typeof Navbar !== 'undefined') {
        Navbar.init({ validate: true });
      }

      document.addEventListener('DOMContentLoaded', () => {
        if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) {
          window.location.href = 'login.html';
          return;
        }
        if (!Auth.requirePremiumPage({
          title: 'Eventos Premium',
          message: 'O mapa de eventos automotivos e mecânicos é exclusivo para usuários Premium.',
          backHref: 'index.html'
        })) {
          return;
        }
        // A navegação mobile (hamburguer + drawer) é fornecida por
        // static/js/responsive.js, como nas demais páginas do AutoAssist.

        const escapeHtml = (value) =>
          typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHTML
            ? SecurityUtils.escapeHTML(String(value ?? ''))
            : String(value ?? '');

        const CATEGORY_LABELS = {
          feira: 'Feira',
          encontro: 'Encontro',
          competicao: 'Competição',
          exposicao: 'Exposição',
          congresso: 'Congresso',
          outros: 'Outros',
        };

        const BR_UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

        let allEvents = [];

        function initUfSelect() {
          const el = document.getElementById('eventsUfSelect');
          if (!el || !window.AppSelect || el._appSelect) return;
          const api = AppSelect.mount(el, {
            placeholder: 'Todos os locais',
            searchPlaceholder: 'Pesquisar UF...',
            emptyText: 'Nenhuma UF encontrada'
          });
          const base = Array.isArray(allEvents) ? allEvents.filter((e) => e.uf) : [];
          const foundUfs = [...new Set(base.map((e) => String(e.uf).toUpperCase()))].sort();
          const options = foundUfs.length > 0
            ? foundUfs
            : BR_UFS;
          api.setOptions(
            [{ value: '', label: 'Todos os locais' }]
              .concat(options.map((u) => ({ value: u, label: u })))
          );
          api.onChange(() => renderEvents());
          el._appSelect = api;
        }

        function currentUf() {
          const el = document.getElementById('eventsUfSelect');
          return el ? String(el.value || '').toUpperCase() : '';
        }

        const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

        function formatEventDate(event) {
          const start = event.data_inicio ? new Date(event.data_inicio + 'T12:00:00') : null;
          const end = event.data_fim ? new Date(event.data_fim + 'T12:00:00') : null;
          if (!start || isNaN(start.getTime())) {
            return { day: null, periodLabel: '' };
          }
          const d = String(start.getDate()).padStart(2, '0');
          const m = MONTHS_PT[start.getMonth()];
          const y = String(start.getFullYear());
          let periodLabel = `${d} ${m} ${y}`;
          if (end && !isNaN(end.getTime()) && end.toDateString() !== start.toDateString()) {
            const d2 = String(end.getDate()).padStart(2, '0');
            const m2 = MONTHS_PT[end.getMonth()];
            const y2 = String(end.getFullYear());
            if (y === y2 && start.getMonth() === end.getMonth()) {
              periodLabel = `${d} a ${d2} ${m} ${y}`;
            } else if (y === y2) {
              periodLabel = `${d} ${m} a ${d2} ${m2} ${y}`;
            } else {
              periodLabel = `${d} ${m} ${y} a ${d2} ${m2} ${y2}`;
            }
          }
          return { day: d, periodLabel };
        }

        function renderEventCard(event) {
          const dateInfo = formatEventDate(event);
          const where = [event.cidade, event.uf ? `- ${event.uf}` : ''].join(' ').trim();
          const status = (event.status || '').toLowerCase();
          const isPast = !!event.passado;
          let badgeClass, badgeText;
          if (status === 'cancelled') {
            badgeClass = 'event-badge--past';
            badgeText = 'Cancelado';
          } else if (status === 'ongoing') {
            badgeClass = 'event-badge--agendado';
            badgeText = 'Acontecendo';
          } else if (isPast || status === 'finished') {
            badgeClass = 'event-badge--past';
            badgeText = 'Encerrado';
          } else if (dateInfo.day) {
            badgeClass = 'event-badge--agendado';
            badgeText = 'Agendado';
          } else {
            badgeClass = 'event-badge--semdata';
            badgeText = 'Data a confirmar';
          }
          const cat = CATEGORY_LABELS[event.categoria] || '';
          return `
            <article class="event-card">
              <div class="event-card-head">
                <h2>${escapeHtml(event.titulo || 'Evento automotivo')}</h2>
                <span class="event-badge ${badgeClass}">${badgeText}</span>
              </div>
              ${event.descricao ? `<p class="event-card-desc">${escapeHtml(event.descricao)}</p>` : ''}
              <div class="event-card-meta">
                ${dateInfo.periodLabel ? `<span><i class="fas fa-calendar-alt"></i> ${escapeHtml(dateInfo.periodLabel)}</span>` : ''}
                ${(where || event.local) ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(where || event.local)}${event.local && where ? ` &middot; ${escapeHtml(event.local)}` : ''}</span>` : ''}
                ${cat ? `<span><i class="fas fa-tag"></i> ${escapeHtml(cat)}</span>` : ''}
                ${event.fonte_nome ? `<span><i class="fas fa-building"></i> ${escapeHtml(event.fonte_nome)}</span>` : ''}
              </div>
              ${event.url ? `
                <div class="event-card-actions">
                  <a class="event-card-link" href="${escapeHtml(event.url)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> Ver detalhes</a>
                </div>
              ` : ''}
            </article>
          `;
        }

        function renderState(message, icon, showRetry) {
          const list = document.getElementById('eventsList');
          const count = document.getElementById('eventsCount');
          if (count) count.textContent = '';
          if (!list) return;
          list.innerHTML = `
            <div class="events-state" style="grid-column: 1 / -1;">
              ${icon ? `<i class="fas ${icon}"></i>` : '<div class="spinner"></div>'}
              <p>${message}</p>
              ${showRetry ? '<button type="button" class="events-retry" id="btnEventsRetry"><i class="fas fa-rotate"></i> Tentar novamente</button>' : ''}
            </div>
          `;
          if (showRetry) {
            const retry = document.getElementById('btnEventsRetry');
            if (retry) retry.addEventListener('click', () => loadEvents(true));
          }
        }

        function renderEvents() {
          const list = document.getElementById('eventsList');
          const count = document.getElementById('eventsCount');
          const uf = currentUf();
          const events = uf
            ? allEvents.filter((e) => String(e.uf || '').trim().toUpperCase() === uf)
            : allEvents;

          if (events.length === 0) {
            renderState('Nenhum evento confirmado neste local neste momento.', 'fa-calendar-alt', false);
          } else {
            list.innerHTML = events.map((e) => renderEventCard(e)).join('');
            if (window.AAAnim && window.AAAnim.reveal) {
              window.AAAnim.reveal.staggerIn(list, '.event-card', { stagger: 45 });
            }
            if (window.AAAnim && window.AAAnim.cards) {
              window.AAAnim.cards.init('.event-card');
            }
          }

          if (count) {
            count.textContent = `${events.length} evento${events.length !== 1 ? 's' : ''} encontrado${events.length !== 1 ? 's' : ''}`;
          }
        }

        async function loadEvents(force) {
          const list = document.getElementById('eventsList');
          if (!list) return;
          const btn = document.getElementById('btnEventsRefresh');
          if (btn) btn.disabled = true;

          renderState('Buscando eventos automotivos...', null, false);

          try {
            const url = `${CONFIG.API_URL}/api/events/automotive${force ? '?force=1' : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            if (!data.success) {
              throw new Error(data.error || 'Erro na varredura de eventos');
            }
            allEvents = (data.events || []).filter((e) => !e.passado);
            renderEvents();
          } catch (error) {
            console.error('Erro ao carregar eventos:', error);
            renderState('Não foi possível carregar os eventos agora. Tente novamente em instantes.', 'fa-triangle-exclamation', true);
          } finally {
            if (btn) btn.disabled = false;
          }
        }

        const btnRefresh = document.getElementById('btnEventsRefresh');
        if (btnRefresh) btnRefresh.addEventListener('click', () => loadEvents(true));
        initUfSelect();
        loadEvents(false);
      });
