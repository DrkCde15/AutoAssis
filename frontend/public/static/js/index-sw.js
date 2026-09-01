if ('serviceWorker' in navigator) {
            // Quando uma nova versão do SW assume o controle, recarrega para
            // garantir que os arquivos (auth.js, index.html) não fiquem obsoletos.
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
        }
