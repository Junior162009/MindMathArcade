const CACHE_NAME = 'banderquiz-v5';
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

function detectarContinenteDesdeZonaHoraria() {
    let tz = '';
    try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (_) {}

    if (tz === 'America/Bogota' || tz === 'America/Lima' || tz === 'America/Guayaquil' ||
        tz === 'America/La_Paz' || tz === 'America/Asuncion' || tz === 'America/Montevideo' ||
        tz === 'America/Argentina/Buenos_Aires' || tz === 'America/Santiago' ||
        tz === 'America/Caracas' || tz === 'America/Cayenne' || tz.startsWith('America/Sao_Paulo') ||
        tz === 'America/Fortaleza' || tz === 'America/Recife' || tz === 'America/Belem' ||
        tz === 'America/Manaus' || tz === 'America/Paramaribo') return 'south-america';

    if (tz.startsWith('Europe/')) return 'europe';
    if (tz.startsWith('Africa/')) return 'africa';
    if (tz.startsWith('Asia/')) return 'asia';
    if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return 'oceania';
    if (tz === 'America/New_York' || tz === 'America/Chicago' || tz === 'America/Denver' ||
        tz === 'America/Los_Angeles' || tz === 'America/Toronto' || tz === 'America/Vancouver' ||
        tz === 'America/Anchorage') return 'north-america';
    if (tz.startsWith('America/')) return 'central-america';
    return 'unknown';
}

function transformarBanderQuiz(html) {
    // Corrige el nombre del manifiesto que estaba escrito como "minifest.json".
    html = html.replace(/href=["']manifest\.json["']/gi, 'href="manifest.json"');

    // Reemplaza la clasificación antigua por una clasificación automática por región.
    // Se inserta dentro del mismo <script> del juego para poder acceder a
    // COUNTRIES, currentLevel y filteredCountries sin depender de window.
    const adaptiveFunction = `
        // ===== CLASIFICACIÓN ADAPTATIVA POR REGIÓN =====
        const BQ_CONTINENT = '${detectarContinenteDesdeZonaHoraria()}';

        const BQ_CONTINENTS = {
            'south-america': new Set(['AR','BO','BR','CL','CO','EC','FK','GF','GY','PE','PY','SR','UY','VE']),
            'central-america': new Set(['BZ','CR','GT','HN','NI','PA','SV','MX','CU','DO','HT','JM','PR','TT','BB','BS','AG','DM','GD','KN','LC','VC']),
            'north-america': new Set(['CA','US','GL','BM','MX']),
            'europe': new Set(['AD','AL','AT','BA','BE','BG','BY','CH','CY','CZ','DE','DK','EE','ES','FI','FR','GB','GR','HR','HU','IE','IS','IT','LI','LT','LU','LV','MC','MD','ME','MK','MT','NL','NO','PL','PT','RO','RS','RU','SE','SI','SK','SM','UA','VA']),
            'africa': new Set(['AO','BF','BI','BJ','BW','CD','CF','CG','CI','CM','CV','DJ','DZ','EG','ER','ET','GA','GH','GM','GN','GQ','GW','KE','KM','LR','LS','LY','MA','MG','ML','MR','MU','MW','MZ','NA','NE','NG','RW','SC','SD','SL','SN','SO','SS','ST','SZ','TD','TG','TN','TZ','UG','ZA','ZM','ZW']),
            'asia': new Set(['AE','AF','AM','AZ','BD','BH','BN','BT','CN','GE','HK','ID','IL','IN','IQ','IR','JO','JP','KG','KH','KP','KR','KW','KZ','LA','LB','LK','MM','MN','MO','MV','MY','NP','OM','PH','PK','PS','QA','SA','SG','SY','TH','TJ','TL','TM','TR','TW','UZ','VN','YE']),
            'oceania': new Set(['AS','AU','CK','FJ','FM','GU','KI','MH','MP','NC','NF','NR','NU','NZ','PF','PG','PW','SB','TK','TL','TO','TV','VU','WF','WS'])
        };

        function bqSetFiltered() {
            const localSet = BQ_CONTINENTS[BQ_CONTINENT];
            const local = localSet ? COUNTRIES.filter(c => localSet.has(c.cca2)) : [];

            if (currentLevel === 'easy') {
                // Fácil: países del continente/región del jugador.
                filteredCountries = local.length >= 4 ? local : COUNTRIES.slice(0, 24);
            } else if (currentLevel === 'normal') {
                // Normal: continente del jugador + países cercanos/internacionales conocidos.
                const expanded = localSet
                    ? COUNTRIES.filter(c => localSet.has(c.cca2))
                    : COUNTRIES.slice(0, 60);
                filteredCountries = expanded.length >= 4 ? expanded : COUNTRIES.slice(0, 60);
            } else {
                // Difícil: resto del mundo, evitando repetir solamente la región local.
                filteredCountries = localSet
                    ? COUNTRIES.filter(c => !localSet.has(c.cca2))
                    : COUNTRIES.slice();
            }
        }

        // Mantiene compatibilidad con cualquier llamada que use setFiltered().
        setFiltered = bqSetFiltered;
        `;

    // Sustituye exactamente la función original del juego.
    const oldFunction = /function setFiltered\(\)\s*\{[\s\S]*?\n        \}\n\n        \/\/ ============================================================\n        \/\/  GENERAR PREGUNTA/;
    if (oldFunction.test(html)) {
        html = html.replace(oldFunction, adaptiveFunction + '\n\n        // ============================================================\n        //  GENERAR PREGUNTA');
    }

    const regionScript = `
<script>
(function () {
    'use strict';
    const FLAG_URL = '${FLAG_BASE_URL}';
    const REGION_NAME = {
        'south-america': 'América del Sur',
        'central-america': 'Centroamérica y Caribe',
        'north-america': 'América del Norte',
        'europe': 'Europa',
        'africa': 'África',
        'asia': 'Asia',
        'oceania': 'Oceanía',
        'unknown': 'tu región'
    };
    const continent = '${detectarContinenteDesdeZonaHoraria()}';

    function emojiAISO(emoji) {
        const chars = [...String(emoji || '')]
            .map(c => c.codePointAt(0))
            .filter(cp => cp >= 0x1F1E6 && cp <= 0x1F1FF);
        if (chars.length !== 2) return null;
        return chars.map(cp => String.fromCharCode(cp - 0x1F1E6 + 65)).join('').toLowerCase();
    }

    function mostrarBanderaExterna(el) {
        if (!el || el.dataset.bqReady === '1') return;
        const emoji = (el.dataset.bqEmoji || el.textContent || '').trim();
        const iso = emojiAISO(emoji);
        if (!iso) return;

        el.dataset.bqReady = '1';
        el.dataset.bqEmoji = emoji;
        const img = document.createElement('img');
        img.src = FLAG_URL + iso + '.png';
        img.alt = 'Bandera';
        img.loading = 'eager';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.style.cssText = 'display:block;width:min(100%,420px);height:auto;max-height:180px;object-fit:contain;border-radius:12px;filter:drop-shadow(0 10px 20px rgba(0,0,0,.5));';
        img.onerror = function () {
            el.textContent = emoji;
            el.style.fontSize = 'clamp(5rem,20vw,10rem)';
            el.style.lineHeight = '1';
        };
        el.textContent = '';
        el.appendChild(img);
    }

    function procesarBanderas() {
        document.querySelectorAll('.flag-emoji').forEach(mostrarBanderaExterna);
    }

    function actualizarRegion() {
        const invite = document.querySelector('.invite-line');
        if (invite && document.querySelector('.portal')) {
            invite.textContent = '📍 ' + (REGION_NAME[continent] || REGION_NAME.unknown) + ' · dificultad adaptada automáticamente';
        }
        const cards = document.querySelectorAll('.level-card');
        if (cards.length >= 3) {
            const nombre = REGION_NAME[continent] || REGION_NAME.unknown;
            const d1 = cards[0].querySelector('.level-desc');
            const d2 = cards[1].querySelector('.level-desc');
            const d3 = cards[2].querySelector('.level-desc');
            if (d1) d1.textContent = 'Banderas de ' + nombre;
            if (d2) d2.textContent = 'Más países de ' + nombre;
            if (d3) d3.textContent = 'Resto del mundo';
        }
    }

    function init() {
        procesarBanderas();
        actualizarRegion();
        const observer = new MutationObserver(function () {
            procesarBanderas();
            actualizarRegion();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
</script>`;

    return html.includes('</body>') ? html.replace('</body>', regionScript + '\n</body>') : html + regionScript;
}

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const path = decodeURIComponent(url.pathname);
    const isGamePage = path.endsWith('/games/laura10°/index.html') || path.endsWith('/games/laura10°/');
    if (!isGamePage) return;

    event.respondWith(
        caches.match(event.request)
            .then(cached => cached ? cached : fetch(event.request))
            .then(response => {
                if (!response || !response.ok) return response;
                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('text/html')) return response;
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
            })
            .catch(() => caches.match('index.html'))
    );
});
