document.addEventListener('DOMContentLoaded', async () => {
            if (!Auth.isAuthenticated()) {
                window.location.href = 'login.html';
                return;
            }

            const user = await Auth.syncUser({ redirectOnInvalid: true });
            if (!user) return;

            if (!Auth.requirePremiumPage({
                title: 'Biblioteca Premium',
                message: 'Para acessar sua biblioteca automotiva, ative o plano Premium.',
                backHref: 'index.html'
            })) {
                return;
            }

            loadLibrary();
        });

        function escapeHTML(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        async function loadLibrary() {
            const content = document.getElementById('libraryContent');
            
            try {
                const res = await Auth.authenticatedFetch('/api/videos/library');
                if (!res.ok) throw new Error("Erro ao carregar biblioteca");
                
                const data = await res.json();
                
                if (!data.library || data.library.length === 0) {
                    content.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-book-open"></i>
                            <h2>Sua biblioteca ainda está vazia.</h2>
                            <p style="color:var(--text-gray); margin-top:10px;">Interaja com o NOG no Chat para receber dicas, vídeos e recomendações personalizadas.</p>
                            <a href="chat.html" style="display:inline-block; margin-top:25px; color:var(--accent-blue); text-decoration:none; font-weight:600;">Ir para o Chat <i class="fas fa-arrow-right"></i></a>
                        </div>
                    `;
                    return;
                }

                content.innerHTML = data.library.map(topic => {
                    const date = new Date(topic.last_updated).toLocaleDateString('pt-BR');
                    
                    const mediaItems = [];
                    
                    // Adicionar vídeos
                    topic.videos.forEach(v => {
                        
                        mediaItems.push(`
                            <div class="video-card">
                                <a href="${escapeHTML(v.url)}" target="_blank" class="video-play-area">
                                    <div class="play-icon-wrapper">
                                        <i class="fas fa-play"></i>
                                    </div>
                                </a>
                                <div class="video-info">
                                    <div class="video-title">${escapeHTML(v.titulo)}</div>
                                </div>
                            </div>
                        `);
                    });

                    // Adicionar links
                    topic.links.forEach(l => {
                        mediaItems.push(`
                            <a href="${escapeHTML(l.url)}" target="_blank" rel="noopener noreferrer" class="link-card">
                                <div class="link-icon">
                                    <i class="${escapeHTML(l.icon) || 'fas fa-external-link-alt'}"></i>
                                </div>
                                <div class="link-content">
                                    <h3>${escapeHTML(l.titulo)}</h3>
                                    <p>${l.tipo === 'peca' ? 'Sugestão de Peças/Ferramentas' : 'Ofertas de Veículos'}</p>
                                </div>
                                <div class="link-btn">
                                    Acessar <i class="fas fa-chevron-right"></i>
                                </div>
                            </a>
                        `);
                    });

                    return `
                        <div class="topic-section">
                            <div class="topic-header">
                                <h2>${escapeHTML(topic.topic)}</h2>
                                <span class="topic-date">Consultado em ${date}</span>
                            </div>
                            <div class="media-grid">
                                ${mediaItems.join('')}
                            </div>
                        </div>
                    `;
                }).join('');

                if (window.AAAnim && window.AAAnim.reveal) {
                    window.AAAnim.reveal.staggerIn(content, '.topic-section', { stagger: 90 });
                }

            } catch (error) {
                console.error(error);
                content.innerHTML = '<p style="text-align:center; color:var(--danger-red);">Falha ao carregar biblioteca. Tente novamente mais tarde.</p>';
            }
        }

        function getYouTubeVideoId(url) {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        }
