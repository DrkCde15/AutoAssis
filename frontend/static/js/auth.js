/**
 * Auth.js - Gerenciador Central de Autenticação e Refresh Tokens
 * AutoAssist IA
 */

class AuthManager {
    constructor() {
        this.ACCESS_KEY = 'access_token';
        this.REFRESH_KEY = 'refresh_token';
        this.USER_KEY = 'autoassist_user';
        // URL do Backend no Render: Substitua após o deploy
        this.API_URL = 'https://autoassis.onrender.com';
    }

    /**
     * Realiza login e salva os tokens
     */
    async login(email, password) {
        const res = await fetch(`${this.API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro no login');

        // Salva tudo no localStorage
        localStorage.setItem(this.ACCESS_KEY, data.access_token);
        localStorage.setItem(this.REFRESH_KEY, data.refresh_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));

        return data;
    }

    /**
     * Faz logout local e (opcionalmente) no servidor
     */
    logout(redirect = true) {
        localStorage.removeItem(this.ACCESS_KEY);
        localStorage.removeItem(this.REFRESH_KEY);
        localStorage.removeItem(this.USER_KEY);
        
        if (redirect) {
            window.location.href = '/login';
        }
    }

    /**
     * Tenta renovar o Access Token usando o Refresh Token
     */
    async refreshToken() {
        const refreshToken = localStorage.getItem(this.REFRESH_KEY);
        
        if (!refreshToken) {
            throw new Error('Sem refresh token');
        }

        try {
            const res = await fetch(`${this.API_URL}/api/refresh`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (!res.ok) {
                throw new Error('Refresh token expirado ou inválido');
            }

            const data = await res.json();
            localStorage.setItem(this.ACCESS_KEY, data.access_token);
            
            // Sliding Expiration (Premium): Se vier um novo refresh token, atualiza
            if (data.refresh_token) {
                localStorage.setItem(this.REFRESH_KEY, data.refresh_token);
                console.log('Refresh token renovado (Sliding Expiration)');
            }
            
            return data.access_token;

        } catch (error) {
            console.error('Falha ao renovar token:', error);
            this.logout(); // Se falhar o refresh, desloga
            throw error;
        }
    }

    /**
     * Wrapper do fetch que lida com 401 automaticamente
     */
    async authenticatedFetch(url, options = {}) {
        let token = localStorage.getItem(this.ACCESS_KEY);
        
        // Configura headers padrão
        options.headers = options.headers || {};
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            // Tenta a requisição original
            let finalUrl = url.startsWith('http') ? url : `${this.API_URL}${url}`;
            let response = await fetch(finalUrl, options);

            // Se der 401 (Unauthorized), tenta renovar o token
            if (response.status === 401) {
                console.warn('Token expirado (401). Tentando refresh...');
                
                // Tenta pegar novo token
                token = await this.refreshToken();
                
                // Atualiza o header com o novo token
                options.headers['Authorization'] = `Bearer ${token}`;
                
                // Tenta a requisição novamente
                response = await fetch(url, options);
            }

            return response;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Verifica se está logado (apenas verificação local simples)
     */
    isAuthenticated() {
        return !!localStorage.getItem(this.ACCESS_KEY);
    }
    
    getUser() {
        const userStr = localStorage.getItem(this.USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    }
}

// Exporta uma instância global
const Auth = new AuthManager();
