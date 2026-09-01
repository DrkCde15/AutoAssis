let selectedStars = 5;
    const API_BASE = (typeof CONFIG !== 'undefined' && typeof CONFIG.API_URL === 'string') ? CONFIG.API_URL : '';

    function isAuthenticated() {
        return typeof Auth !== 'undefined' && Auth.isAuthenticated();
    }

    function getCurrentUser() {
        return isAuthenticated() ? Auth.getUser() : null;
    }


    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', () => {
            selectedStars = parseInt(star.getAttribute('data-value'));
            updateStars();
        });
    });

    function updateStars() {
        document.querySelectorAll('.star').forEach(star => {
            const val = parseInt(star.getAttribute('data-value'));
            if (val <= selectedStars) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    function escapeHTML(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function loadFeedbacks() {
        try {
            const res = await fetch(`${API_BASE}/api/feedbacks`);
            const data = await res.json();
            const container = document.getElementById('feedbackList');
            const currentUser = getCurrentUser();

            if (!data.feedbacks || data.feedbacks.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhum feedback ainda. Seja o primeiro!</div>';
                return;
            }

            container.innerHTML = data.feedbacks.map(f => {
                const stars = Math.max(1, Math.min(Number(f.estrelas) || 5, 5));
                const createdAt = f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '';
                const isOwner = currentUser && (f.user_id == currentUser.id);

                return `
                <div class="feedback-item" id="feedback-${f.id}">
                    <div class="feedback-meta">
                        <div>
                            <span class="feedback-user">${escapeHTML(f.nome || 'Usuario Anonimo')}</span>
                            <div class="feedback-stars">
                                ${Array(5).fill(0).map((_, i) => `<i class="${i < stars ? 'fas' : 'far'} fa-star"></i>`).join('')}
                            </div>
                        </div>
                        ${isOwner ? `
                        <div class="feedback-actions">
                            <button class="action-btn" onclick="enterEditMode(${f.id})">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="action-btn delete" onclick="deleteFeedback(${f.id})">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                        ` : ''}
                    </div>
                    <div class="feedback-text">${escapeHTML(f.comentario)}</div>

                    <div class="edit-form">
                        <div class="form-group">
                            <div class="rating edit-stars" id="edit-stars-${f.id}">
                                ${Array(5).fill(0).map((_, i) => `
                                    <i class="fas fa-star star ${i < stars ? 'active' : ''}"
                                       data-value="${i + 1}"
                                       onclick="setEditStars(${f.id}, ${i + 1})"></i>
                                `).join('')}
                            </div>
                        </div>
                        <textarea class="form-control" id="edit-comment-${f.id}">${escapeHTML(f.comentario)}</textarea>
                        <div class="edit-actions">
                            <button class="btn-submit btn-small" onclick="saveEdit(${f.id})">Salvar</button>
                            <button class="btn-cancel btn-small" onclick="cancelEdit(${f.id})">Cancelar</button>
                        </div>
                    </div>

                    <div class="feedback-date">${escapeHTML(createdAt)}</div>
                </div>
            `}).join('');
        } catch (err) {
            console.error('Erro ao carregar feedbacks:', err);
        }
    }

    let editingStarsMap = {};

    function enterEditMode(id) {
        const item = document.getElementById(`feedback-${id}`);
        item.classList.add('edit-mode');

        // Initialize editing stars with current value
        const activeStars = item.querySelectorAll('.edit-stars .star.active').length;
        editingStarsMap[id] = activeStars || 5;
    }

    function cancelEdit(id) {
        const item = document.getElementById(`feedback-${id}`);
        item.classList.remove('edit-mode');
    }

    function setEditStars(feedbackId, val) {
        editingStarsMap[feedbackId] = val;
        const container = document.getElementById(`edit-stars-${feedbackId}`);
        container.querySelectorAll('.star').forEach((star, i) => {
            if (i < val) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    async function saveEdit(id) {
        const comment = document.getElementById(`edit-comment-${id}`).value;
        const stars = editingStarsMap[id] || 5;

        try {
            const res = await Auth.authenticatedFetch(`/api/feedback/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comentario: comment, estrelas: stars })
            });

            if (res.ok) {
                loadFeedbacks();
            } else {
                const err = await res.json();
                alert(err.error || 'Erro ao salvar alterações');
            }
        } catch (err) {
            alert('Erro de conexão');
        }
    }

    async function deleteFeedback(id) {
        if (!confirm('Tem certeza que deseja excluir seu feedback?')) return;

        try {
            const res = await Auth.authenticatedFetch(`/api/feedback/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                loadFeedbacks();
            } else {
                const err = await res.json();
                alert(err.error || 'Erro ao excluir feedback');
            }
        } catch (err) {
            alert('Erro de conexão');
        }
    }

    document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('btnSubmit');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        const payload = {
            nome: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            estrelas: selectedStars,
            comentario: document.getElementById('comment').value
        };

        try {
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            };
            const res = isAuthenticated()
                ? await Auth.authenticatedFetch('/api/feedback', requestOptions)
                : await fetch(`${API_BASE}/api/feedback`, requestOptions);

            if (res.ok) {
                showToast();
                document.getElementById('feedbackForm').reset();
                selectedStars = 5;
                updateStars();
                loadFeedbacks();
            } else {
                const contentType = (res.headers.get('content-type') || '').toLowerCase();
                let message = `Erro ao enviar feedback (HTTP ${res.status}).`;

                if (contentType.includes('application/json')) {
                    const err = await res.json().catch(() => null);
                    message = (err && (err.error || err.message)) || message;
                }

                alert(message);
            }
        } catch (err) {
            alert(err?.message || 'Erro de conexao.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Feedback';
        }
    });

    function showToast() {
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        if (window.AAAnim && window.AAAnim.toasts) {
            window.AAAnim.toasts.show(toast, { duration: 5000 });
            return;
        }
        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }

    if (typeof Navbar !== 'undefined') { Navbar.init({ validate: true }); }
    (function () {
        var toggle = document.getElementById('navToggle');
        var links = document.getElementById('authLinks');
        if (toggle && links) {
            toggle.addEventListener('click', function () {
                var open = links.classList.toggle('nav-open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            links.addEventListener('click', function (e) {
                if (e.target.closest('a')) { links.classList.remove('nav-open'); toggle.setAttribute('aria-expanded', 'false'); }
            });
        }
    })();

    if (isAuthenticated()) {
        const user = getCurrentUser();
        if (user) {
            document.getElementById('userName').value = user.nome || '';
            document.getElementById('userEmail').value = user.email || '';
        }
    }

    loadFeedbacks();
