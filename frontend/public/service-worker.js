const CACHE_NAME = 'fitnessgeek-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/main.bundle.js',
  '/static/css/main.css',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Handle background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-food-logs') {
    event.waitUntil(syncFoodLogs());
  }
});

// Sync food logs with server
async function syncFoodLogs() {
  try {
    const db = await openDB('fitnessgeek-offline', 1);
    const queue = await db.getAll('syncQueue');

    for (const item of queue) {
      if (item.status === 'pending') {
        try {
          const response = await fetch(`${self.registration.scope}api/${item.action}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data),
          });

          if (response.ok) {
            await db.put('syncQueue', {
              ...item,
              status: 'completed'
            });
          }
        } catch (error) {
          console.error('Sync failed:', error);
        }
      }
    }
  } catch (error) {
    console.error('Database error:', error);
  }
}

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If offline, try to get from IndexedDB
          return new Promise((resolve) => {
            const request = event.request.clone();
            request.json().then(data => {
              // Store in sync queue for later
              const db = openDB('fitnessgeek-offline', 1);
              db.then(db => {
                db.add('syncQueue', {
                  action: request.url.split('/api/')[1],
                  data,
                  timestamp: new Date().toISOString(),
                  status: 'pending'
                });
              });

              // Return a success response to the client
              resolve(new Response(JSON.stringify({
                success: true,
                message: 'Stored offline, will sync when online'
              })));
            });
          });
        })
    );
    return;
  }

  // For other requests, try network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // If both network and cache fail, show offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('Not available offline');
          });
      })
  );
});