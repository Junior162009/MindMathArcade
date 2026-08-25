const CACHE_NAME = 'banderquiz-v2';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll([
            'index.html',
            'manifest.json',
            'logo.png'
        ])).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

function transformarBanderQuiz(html) {
    const script = `
<script>
(function () {
    'use strict';
    // BanderQuiz: bandera externa primero; emoji solo como respaldo automático.
    const FLAG_URL = 'https://flagcdn.com/128x96/';

    function emojiAISO(emoji) {
        const regional = [...String(emoji || '')]
            .map(c => c.codePointAt(0))
            .filter(cp => cp >= 0x1F1E6 && cp <= 0x1F1FF);
        if (regional.length !== 2) return null;
        return regional.map(cp => String.fromCharCode(cp - 0x1F1E6 + 65)).join('').toLowerCase();
    }

    function mostrarBanderaExterna(el) {
        if (!el || el.dataset.bqProcesada === '1') return;
        const emoji = el.textContent.trim();
        const codigo = emojiAISO(emoji);
        if (!codigo) return;

        el.dataset.bqProcesada = '1';
        el.dataset.bqEmoji = emoji;
        el.textContent = '';

        const img = document.createElement('img');
        img.src = FLAG_URL + codigo + '.png';
        img.alt = 'Bandera';
        img.loading = 'eager';
        img.decoding = 'async';
        img.style.cssText = 'display:block;width:min(100%,420px);height:auto;max-height:180px;object-fit:contain;filter:drop-shadow(0 10px 20px rgba(0,0,0,.5));';

        img.onerror = function () {
            el.textContent = el.dataset.bqEmoji || emoji;
            el.removeAttribute('data-bq-procesada');
        };

        el.appendChild(img);
    }

    function procesar() {
        document.querySelectorAll('.flag-emoji').forEach(mostrarBanderaExterna);
    }

    function iniciar() {
        if (!document.body) return;
        const observer = new MutationObserver(procesar);
        observer.observe(document.body, { childList: true, subtree: true });
        procesar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar, { once: true });
    } else {
        iniciar();
    }
})();
</script>`;

    if (html.includes('</body>')) return html.replace('</body>', script + '\n</body>');
    return html + script;
}

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request).then(cached => {
            const source = cached || fetch(e.request);
            return source.then(response => {
                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('text/html') && !e.request.url.endsWith('/index.html')) {
                    return response;
                }

                return response.text().then(html => {
                    const transformed = transformarBanderQuiz(html);
                    const headers = new Headers(response.headers);
                    headers.delete('content-length');
                    return new Response(transformed, {
                        status: response.status,
                        statusText: response.statusText,
                        headers
                    });
                });
            });
        })
    );
});