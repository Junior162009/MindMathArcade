// Importa Workbox desde la CDN (como tu versión original)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE_NAME = 'tecnomath-offline-v2';
const OFFLINE_FALLBACK_PAGE = '/index.html';

// Lista de recursos importantes que se cachean al instalar
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/shared.js',
  '/manifest.json',
  '/auth.html',
  '/game.html',
  '/eco-collector.html',
  '/animalandia.html',
  '/ods-2048.html',
  '/coral-guardian.html',
  '/orbit-cleaner.html',
  '/marine-cleaner.html',
  '/eco-barrio.html',
  '/emoji-math.html',
  '/img/icon-192.png',
  '/img/icon-512.png'
];

// ═══════════════════════════════════════
// INSTALACIÓN: Cachea recursos esenciales
// ═══════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Precaching assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Algunos assets no se precachearon:', err);
      });
    })
  );
  self.skipWaiting();
});

// ═══════════════════════════════════════
// ACTIVACIÓN: Limpia cachés antiguos
// ═══════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ═══════════════════════════════════════
// NAVEGACIÓN PRECARGADA (Workbox)
// ═══════════════════════════════════════
if (workbox.navigationPreload && workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// ═══════════════════════════════════════
// ESTRATEGIA DE FETCH: Network First + Cache Fallback
// ═══════════════════════════════════════
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      try {
        // Primero intenta obtener el recurso de la red
        const networkResponse = await fetch(event.request);
        // Si la respuesta es válida, la guardamos en caché para futuras visitas
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // Si no hay red, busca en la caché
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Si es una solicitud de navegación, devuelve la página offline
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return cache.match(OFFLINE_FALLBACK_PAGE);
        }
        // En cualquier otro caso, devuelve un error 503
        return new Response('Sin conexión', { status: 503 });
      }
    })()
  );
});

// ═══════════════════════════════════════
// BACKGROUND SYNC
// ═══════════════════════════════════════
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tecnomath') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'background-sync', tag: event.tag });
        });
      })
    );
  }
});

// ═══════════════════════════════════════
// PERIODIC SYNC
// ═══════════════════════════════════════
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-tecnomath') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'periodic-sync', tag: event.tag });
        });
      })
    );
  }
});

// ═══════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════
self.addEventListener('push', (event) => {
  let data = { 
    title: 'Tecnomath', 
    body: '¡Nuevo minijuego disponible!', 
    icon: '/img/icon-192.png' 
  };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/img/icon-96.png',
      vibrate: [200, 100, 200],
      data: { url: '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// ═══════════════════════════════════════
// MENSAJES (compatibilidad con tu antiguo SW)
// ═══════════════════════════════════════
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
