const CACHE_NAME = 'banderquiz-v3';
const FLAG_BASE_URL = 'https://flagcdn.com/160x120/';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(['index.html', 'logo.png']))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

function transformarBanderQuiz(html) {
    const script = `
<script>
(function () {
    'use strict';

    // BanderQuiz de Laura: imagen externa SIEMPRE primero.
    // El emoji solamente aparece automáticamente si la imagen no carga.
    const FLAG_URL = '${FLAG_BASE_URL}';

    function emojiAISO(emoji) {
        const regional = [...String(emoji || '')]
            .map(char => char.codePointAt(0))
            .filter(cp => cp >= 0x1F1E6 && cp <= 0x1F1FF);
        if (regional.length !== 2) return null;
        return regional
            .map(cp => String.fromCharCode(cp - 0x1F1E6 + 65))
            .join('')
            .toLowerCase();
    }

    function mostrarBandera(el) {
        if (!el || el.dataset.bqReady === '1') return;

        const emoji = (el.dataset.bqEmoji || el.textContent || '').trim();
        const iso = emojiAISO(emoji);
        if (!iso) return;

        el.dataset.bqReady = '1';
        el.dataset.bqEmoji = emoji;
        el.classList.add('bq-external-flag');
        el.setAttribute('aria-label', 'Bandera del país');

        const img = document.createElement('img');
        img.src = FLAG_URL + iso + '.png';
        img.alt = 'Bandera';
        img.loading = 'eager';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.style.cssText = [
            'display:block',
            'width:min(100%,420px)',
            'height:auto',
            'max-height:180px',
            'object-fit:contain',
            'border-radius:12px',
            'filter:drop-shadow(0 10px 20px rgba(0,0,0,.5))'
        ].join(';');

        img.addEventListener('error', function () {
            // Fallback definitivo: no vuelve a intentar la imagen para evitar bucles.
            el.classList.add('bq-emoji-fallback');
            el.textContent = emoji;
            el.dataset.bqFallback = '1';
            el.style.fontSize = 'clamp(5rem, 20vw, 10rem)';
            el.style.lineHeight = '1';
        }, { once: true });

        el.textContent = '';
        el.appendChild(img);
    }

    function procesarBanderas() {
        document.querySelectorAll('.flag-emoji').forEach(mostrarBandera);
    }

    function iniciar() {
        procesarBanderas();

        const observer = new MutationObserver(procesarBanderas);
        observer.observe(document.body, { childList: true, subtree: true });

        // Refuerza el procesamiento cuando el juego cambia de pregunta dinámicamente.
        setTimeout(procesarBanderas, 50);
        setTimeout(procesarBanderas, 250);
        setTimeout(procesarBanderas, 1000);
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

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const path = decodeURIComponent(url.pathname);
    const isGamePage = path.endsWith('/games/laura10°/index.html') ||
        path.endsWith('/games/laura10°/');

    if (!isGamePage) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            const request = cached ? Promise.resolve(cached) : fetch(event.request);
            return request.then(response => {
                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('text/html') && !path.endsWith('/index.html')) return response;

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
