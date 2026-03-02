const CACHE_NAME = 'countdown-v3';
const STATIC_CACHE_NAME = 'countdown-static-v3';

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache the main page and essential files
        return cache.addAll([
          '/',
          '/manifest.json',
          '/icon-192.png',
          '/icon-512.png',
        ]).catch((err) => {
          console.log('Cache addAll failed, continuing:', err);
        });
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // For API requests, try network first, then return offline response
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return new Response(
            JSON.stringify({ 
              offline: true, 
              message: 'You are offline. Data will sync when back online.' 
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 200, // Return 200 so the app can handle it gracefully
            }
          );
        })
    );
    return;
  }

  // For navigation requests (HTML pages), try cache first, then network
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/')
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached page, then update cache in background
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, networkResponse.clone());
                  });
                }
              })
              .catch(() => {});
            return cachedResponse;
          }

          // No cache, try network
          return fetch(request)
            .then((response) => {
              // Cache the response
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
              return response;
            })
            .catch(() => {
              // Return cached page as fallback
              return caches.match('/');
            });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images), use cache-first strategy
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Update cache in background
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, networkResponse.clone());
                  });
                }
              })
              .catch(() => {});
            return cachedResponse;
          }

          // Not in cache, fetch from network
          return fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return response;
            });
        })
        .catch(() => {
          // Return a fallback for images
          if (request.destination === 'image') {
            return new Response('', { status: 404 });
          }
        })
    );
    return;
  }

  // Default: network first, cache as fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background Sync - for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'sync-countdowns') {
    event.waitUntil(syncCountdowns());
  }
});

// Periodic Background Sync - check countdowns in background
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-countdowns') {
    event.waitUntil(checkCountdowns());
  }
});

// Sync countdowns when back online
async function syncCountdowns() {
  try {
    // Notify the client to sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_REQUIRED' });
    });
  } catch (error) {
    console.error('Failed to sync countdowns:', error);
  }
}

// Check countdowns in background (for notifications)
async function checkCountdowns() {
  try {
    // This would check countdowns and trigger notifications
    // For now, we rely on the client-side check
    console.log('Checking countdowns in background...');
  } catch (error) {
    console.error('Failed to check countdowns:', error);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Countdown';
  const options = {
    body: data.body || 'Your countdown has ended!',
    icon: '/icon-512.png',
    badge: '/icon-192.png',
    tag: data.tag || 'countdown-notification',
    data: data.data || {},
    vibrate: [200, 100, 200], // Vibration pattern
    requireInteraction: true, // Keep notification until user interacts
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If already open, focus it
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Message handler - for communication with main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Schedule a notification for a countdown
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { countdownId, title, targetDate } = event.data;
    const delay = new Date(targetDate).getTime() - Date.now();

    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(`⏰ ${title}`, {
          body: 'Your countdown has ended!',
          icon: '/icon-512.png',
          badge: '/icon-192.png',
          tag: countdownId,
          vibrate: [200, 100, 200],
          requireInteraction: true,
        });
      }, delay);
    }
  }
});
