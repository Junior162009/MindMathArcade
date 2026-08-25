const CACHE_NAME = 'banderquiz-v4';
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

    // ============================================================
    // BANDERQUIZ: BANDERA EXTERNA PRIMERO + EMOJI COMO RESPALDO
    // ============================================================
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

    // ============================================================
    // DETECCIÓN AUTOMÁTICA DEL CONTINENTE
    // No se le pregunta nada al jugador.
    // Usa la zona horaria del dispositivo como señal local y segura.
    // ============================================================
    const CONTINENT_BY_TIMEZONE = {
        'America/Bogota': 'south-america',
        'America/Lima': 'south-america',
        'America/Guayaquil': 'south-america',
        'America/La_Paz': 'south-america',
        'America/Asuncion': 'south-america',
        'America/Montevideo': 'south-america',
        'America/Argentina/Buenos_Aires': 'south-america',
        'America/Santiago': 'south-america',
        'America/Caracas': 'south-america',
        'America/Cayenne': 'south-america',
        'America/Sao_Paulo': 'south-america',
        'America/Fortaleza': 'south-america',
        'America/Recife': 'south-america',
        'America/Belem': 'south-america',
        'America/Manaus': 'south-america',
        'America/Paramaribo': 'south-america',
        'America/Asuncion': 'south-america',

        'America/Mexico_City': 'north-central-america',
        'America/Monterrey': 'north-central-america',
        'America/Cancun': 'north-central-america',
        'America/Guatemala': 'north-central-america',
        'America/Tegucigalpa': 'north-central-america',
        'America/Managua': 'north-central-america',
        'America/Costa_Rica': 'north-central-america',
        'America/Panama': 'north-central-america',
        'America/El_Salvador': 'north-central-america',
        'America/Belize': 'north-central-america',
        'America/Havana': 'north-central-america',
        'America/Jamaica': 'north-central-america',
        'America/Port-au-Prince': 'north-central-america',
        'America/Santo_Domingo': 'north-central-america',
        'America/Puerto_Rico': 'north-central-america',
        'America/New_York': 'north-america',
        'America/Detroit': 'north-america',
        'America/Chicago': 'north-america',
        'America/Denver': 'north-america',
        'America/Los_Angeles': 'north-america',
        'America/Phoenix': 'north-america',
        'America/Anchorage': 'north-america',
        'America/Toronto': 'north-america',
        'America/Vancouver': 'north-america',
        'America/Halifax': 'north-america',
        'America/Winnipeg': 'north-america',
        'America/Edmonton': 'north-america',
        'America/St_Johns': 'north-america',

        'Europe/London': 'europe', 'Europe/Madrid': 'europe', 'Europe/Paris': 'europe',
        'Europe/Berlin': 'europe', 'Europe/Rome': 'europe', 'Europe/Lisbon': 'europe',
        'Europe/Amsterdam': 'europe', 'Europe/Brussels': 'europe', 'Europe/Vienna': 'europe',
        'Europe/Zurich': 'europe', 'Europe/Stockholm': 'europe', 'Europe/Oslo': 'europe',
        'Europe/Copenhagen': 'europe', 'Europe/Helsinki': 'europe', 'Europe/Warsaw': 'europe',
        'Europe/Prague': 'europe', 'Europe/Bucharest': 'europe', 'Europe/Athens': 'europe',
        'Europe/Istanbul': 'europe', 'Europe/Kyiv': 'europe', 'Europe/Moscow': 'europe',

        'Africa/Cairo': 'africa', 'Africa/Johannesburg': 'africa', 'Africa/Lagos': 'africa',
        'Africa/Nairobi': 'africa', 'Africa/Casablanca': 'africa', 'Africa/Accra': 'africa',
        'Africa/Tunis': 'africa', 'Africa/Algiers': 'africa', 'Africa/Khartoum': 'africa',

        'Asia/Tokyo': 'asia', 'Asia/Seoul': 'asia', 'Asia/Shanghai': 'asia',
        'Asia/Hong_Kong': 'asia', 'Asia/Taipei': 'asia', 'Asia/Singapore': 'asia',
        'Asia/Bangkok': 'asia', 'Asia/Jakarta': 'asia', 'Asia/Manila': 'asia',
        'Asia/Kolkata': 'asia', 'Asia/Dubai': 'asia', 'Asia/Riyadh': 'asia',
        'Asia/Jerusalem': 'asia', 'Asia/Karachi': 'asia', 'Asia/Dhaka': 'asia',

        'Australia/Sydney': 'oceania', 'Australia/Melbourne': 'oceania',
        'Australia/Brisbane': 'oceania', 'Australia/Perth': 'oceania',
        'Pacific/Auckland': 'oceania', 'Pacific/Fiji': 'oceania',
        'Pacific/Port_Moresby': 'oceania', 'Pacific/Apia': 'oceania'
    };

    const CONTINENT_NAMES = {
        'south-america': 'América del Sur',
        'north-central-america': 'Centroamérica y Caribe',
        'north-america': 'América del Norte',
        'europe': 'Europa',
        'africa': 'África',
        'asia': 'Asia',
        'oceania': 'Oceanía',
        'unknown': 'tu región'
    };

    const SOUTH_AMERICA = new Set(['AR','BO','BR','CL','CO','EC','FK','GF','GY','PE','PY','SR','UY','VE']);
    const NORTH_AMERICA = new Set(['CA','US','GL','BM']);
    const CENTRAL_CARIBBEAN = new Set(['AG','AI','AW','BB','BL','BS','BZ','BQ','CR','CU','CW','DM','DO','GD','GP','GT','HN','HT','JM','KN','KY','LC','MF','MQ','MS','MX','NI','PA','PR','SV','SX','TC','TT','VC','VG','VI']);
    const EUROPE = new Set(['AD','AL','AT','BA','BE','BG','BY','CH','CY','CZ','DE','DK','EE','ES','FI','FO','FR','GB','GG','GI','GR','HR','HU','IE','IM','IS','IT','JE','LI','LT','LU','LV','MC','MD','ME','MK','MT','NL','NO','PL','PT','RO','RS','RU','SE','SI','SJ','SK','SM','UA','VA']);
    const AFRICA = new Set(['AO','BF','BI','BJ','BW','CD','CF','CG','CI','CM','CV','DJ','DZ','EG','EH','ER','ET','GA','GH','GM','GN','GQ','GW','KE','KM','LR','LS','LY','MA','MG','ML','MR','MU','MW','MZ','NA','NE','NG','RE','RW','SC','SD','SH','SL','SN','SO','SS','ST','SZ','TD','TG','TN','TZ','UG','YT','ZA','ZM','ZW']);
    const ASIA = new Set(['AE','AF','AM','AZ','BD','BH','BN','BT','CN','GE','HK','ID','IL','IN','IQ','IR','JO','JP','KG','KH','KP','KR','KW','KZ','LA','LB','LK','MM','MN','MO','MV','MY','NP','OM','PH','PK','PS','QA','SA','SG','SY','TH','TJ','TL','TM','TR','TW','UZ','VN','YE']);
    const OCEANIA = new Set(['AS','AU','CK','FJ','FM','GU','KI','MH','MP','NC','NF','NR','NU','NZ','PF','PG','PW','SB','TK','TO','TV','UM','VU','WF','WS']);

    function detectarContinente() {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            if (CONTINENT_BY_TIMEZONE[tz]) return CONTINENT_BY_TIMEZONE[tz];
            if (tz.startsWith('Europe/')) return 'europe';
            if (tz.startsWith('Africa/')) return 'africa';
            if (tz.startsWith('Asia/')) return 'asia';
            if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return 'oceania';
            if (tz.startsWith('America/')) return 'north-central-america';
        } catch (_) {}
        return 'unknown';
    }

    const CONTINENT_LOCAL = detectarContinente();

    // Reemplaza la clasificación original por una clasificación adaptativa.
    // Fácil = banderas conocidas de la región del jugador.
    // Normal = más países de la región.
    // Difícil = resto del mundo.
    function setFiltradoAdaptativo() {
        const countries = Array.isArray(window.COUNTRIES) ? window.COUNTRIES : null;
        if (!countries || typeof window.currentLevel === 'undefined') return;

        const belongs = country => {
            const code = country.cca2;
            if (CONTINENT_LOCAL === 'south-america') return SOUTH_AMERICA.has(code);
            if (CONTINENT_LOCAL === 'north-america') return NORTH_AMERICA.has(code);
            if (CONTINENT_LOCAL === 'north-central-america') return CENTRAL_CARIBBEAN.has(code);
            if (CONTINENT_LOCAL === 'europe') return EUROPE.has(code);
            if (CONTINENT_LOCAL === 'africa') return AFRICA.has(code);
            if (CONTINENT_LOCAL === 'asia') return ASIA.has(code);
            if (CONTINENT_LOCAL === 'oceania') return OCEANIA.has(code);
            return false;
        };

        let pool;
        if (window.currentLevel === 'easy') {
            const local = countries.filter(belongs);
            // Si la región no se pudo detectar, conserva un grupo internacional sencillo.
            pool = local.length >= 8 ? local : countries.filter(c => ['CO','AR','BR','MX','US','ES','FR','IT','DE','GB','JP','CN'].includes(c.cca2));
        } else if (window.currentLevel === 'normal') {
            const local = countries.filter(belongs);
            pool = local.length >= 12 ? local : countries.filter(c => belongs(c) || EUROPE.has(c.cca2) || SOUTH_AMERICA.has(c.cca2));
        } else {
            pool = countries.filter(c => !belongs(c));
        }

        if (pool.length >= 4) window.filteredCountries = pool;
    }

    function actualizarPortalRegion() {
        const nombre = CONTINENT_NAMES[CONTINENT_LOCAL] || CONTINENT_NAMES.unknown;
        const invite = document.querySelector('.invite-line');
        if (invite) invite.textContent = '📍 Región detectada: ' + nombre + ' · dificultad adaptada automáticamente';

        const cards = document.querySelectorAll('.level-card');
        if (cards.length >= 3) {
            const desc = cards[0].querySelector('.level-desc');
            if (desc) desc.textContent = 'Banderas conocidas de ' + nombre;
            const desc2 = cards[1].querySelector('.level-desc');
            if (desc2) desc2.textContent = 'Más países de tu región';
            const desc3 = cards[2].querySelector('.level-desc');
            if (desc3) desc3.textContent = 'Resto del mundo';
        }
    }

    function iniciar() {
        procesarBanderas();
        actualizarPortalRegion();

        // Espera a que el juego cree sus funciones/estado y sustituye el filtro.
        setTimeout(function () {
            if (typeof window.setFiltered === 'function') {
                window.setFilteredOriginalBanderQuiz = window.setFiltered;
                window.setFiltered = setFiltradoAdaptativo;
            }
            actualizarPortalRegion();
            procesarBanderas();
        }, 0);

        const observer = new MutationObserver(function () {
            procesarBanderas();
            actualizarPortalRegion();
        });
        observer.observe(document.body, { childList: true, subtree: true });

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
