self.addEventListener('install', e => {
    e.waitUntil(
        caches.open('banderquiz-v1').then(cache => {
            return cache.addAll([
                'index.html',
                'manifest.json',
                'logo.png'
            ]);
        })
    );
});
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(response => response || fetch(e.request))
    );
});