importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

// v11: limpia cualquier versión anterior del caché para evitar que componentes eliminados vuelvan a aparecer.
const CACHE_NAME = 'tecnomath-offline-v11';
const OFFLINE_FALLBACK_PAGE = '/index.html';
const PRECACHE_ASSETS = [
  '/', '/index.html', '/js/shared.js', '/js/firebase-config.js', '/js/admin-guard.js', '/js/theme-sync.js',
  '/manifest.json', '/pages/auth.html', '/pages/admin/index.html', '/css/admin.css',
  '/pages/game.html', '/pages/eco-collector.html', '/pages/animalandia.html',
  '/pages/ods-2048.html', '/pages/coral-guardian.html', '/pages/eco-barrio.html',
  '/pages/emoji-math.html', '/img/icon-192.png', '/img/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS).catch(err => console.warn('Precaché parcial:', err))));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))));
  self.clients.claim();
});
if (workbox.navigationPreload && workbox.navigationPreload.isSupported()) workbox.navigationPreload.enable();

async function injectThemeScript(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  try {
    const html = await response.text();
    if (html.includes('/js/theme-sync.js')) return new Response(html, {status:response.status, statusText:response.statusText, headers:response.headers});
    const injected = html.replace(/<\/body>/i, '<script src="/js/theme-sync.js?v=11"></script></body>');
    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    return new Response(injected, {status:response.status, statusText:response.statusText, headers});
  } catch (_) {
    return response;
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    try {
      const networkResponse = await fetch(event.request);
      const response = await injectThemeScript(networkResponse);
      if (response && response.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (_) {
      let cached = await caches.match(event.request);
      if (cached) return injectThemeScript(cached);
      if (event.request.mode === 'navigate') {
        cached = await caches.match(OFFLINE_FALLBACK_PAGE);
        if (cached) return injectThemeScript(cached);
      }
      return new Response('Sin conexión', { status: 503 });
    }
  })());
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-tecnomath') event.waitUntil(self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage({type:'background-sync',tag:event.tag}))));
});
self.addEventListener('periodicsync', event => {
  if (event.tag === 'periodic-tecnomath') event.waitUntil(self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage({type:'periodic-sync',tag:event.tag}))));
});
self.addEventListener('push', event => {
  let data={title:'Tecnomath',body:'¡Nuevo minijuego disponible!',icon:'/img/icon-192.png'};
  if(event.data){try{data={...data,...event.data.json()}}catch(_){}
  }
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:data.icon,badge:'/img/icon-96.png',vibrate:[200,100,200],data:{url:'/'}}));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window'}).then(list=>{
    for(const client of list) if(client.url==='/'&&'focus' in client)return client.focus();
    if(self.clients.openWindow)return self.clients.openWindow('/');
  }));
});
self.addEventListener('message', event => { if(event.data?.type==='SKIP_WAITING') self.skipWaiting(); });
