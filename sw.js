const STATIC_CACHE_NAME = 'restaurants-sw-v1';
const CONTENT_IMAGES_CACHE = 'restaurants-imgs-v1';
const ALL_CACHES = [
  STATIC_CACHE_NAME,
  CONTENT_IMAGES_CACHE
];


/**
 * Cache the site assets 
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(STATIC_CACHE_NAME).then((cache) => {
          return cache.addAll([
            '/',
            '/index.html',
            '/restaurant.html',
            '/dist/js/idb-min.js',
            '/dist/js/dbhelper-min.js',
            '/dist/js/main-min.js',
            '/dist/js/restaurant_info-min.js',
            '/dist/css/styles.css',
            '/icons/icons-192.png',
            '/icons/icons-512.png',
            '/icons/like-fill.svg',
            '/icons/like-outline.svg',
            'https://fonts.gstatic.com/s/roboto/v15/2UX7WLTfW3W8TclTUvlFyQ.woff',
            'https://fonts.gstatic.com/s/roboto/v15/d-6IYplOFocCacKzxwXSOD8E0i7KZn-EPnyo3HZu7kw.woff'
          ]);
      })
    );
});


/**
 * Delete the old caches if new one exists  
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName.startsWith('restaurants-') &&
                 !ALL_CACHES.includes(cacheName);
        }).map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});


/**
 * Check the cache for the requests before sending them to the network  
 */
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);
    console.log('urls:', requestUrl.pathname);
    if (requestUrl.origin === location.origin) {        
        if (requestUrl.pathname === '/restaurant.html') {
            event.respondWith(caches.match('/restaurant.html'));
            return;
        }

        if (requestUrl.pathname.startsWith('/dist/img/')) {
            event.respondWith(serveImage(event.request));
            return;
        }
    }

    event.respondWith(
      caches.match(event.request).then((response) => {
          return response || fetch(event.request);
      })
    );
});


/**
 * Get the requested images from the cache if exist,
 * otherwise fetch them from the network then cache them  
 */
serveImage = (request) => {
    var storageUrl = request.url.replace(/-\d+px\.(jpg|webp)$/, '');
    
    return caches.open(CONTENT_IMAGES_CACHE).then((cache) => {
        return cache.match(storageUrl).then((response) => {
            if (response) return response;

            return fetch(request).then((networkResponse) => {
                cache.put(storageUrl, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}
