// WhisperMap Service Worker
const CACHE_NAME = 'whispermap-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/public/css/styles.css',
  '/public/css/social.css',
  '/public/css/premium-fix.css',
  '/public/css/location-fix.css',
  '/public/css/record-fix.css',
  '/public/js/app.js',
  '/public/js/auth.js',
  '/public/js/social.js',
  '/public/js/payment.js',
  '/public/js/analytics.js',
  '/public/js/cache-buster.js',
  '/public/images/logo.svg',
  '/public/images/icon-192x192.png',
  '/public/images/icon-512x512.png',
  '/public/images/default-avatar.png',
  '/public/images/favicon.ico',
  '/public/sounds/record-start.mp3',
  '/public/sounds/record-stop.mp3',
  '/public/sounds/location.mp3',
  '/public/sounds/error.mp3',
  '/public/sounds/success.mp3',
  '/public/sounds/premium.mp3'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell and assets');
        return cache.addAll(ASSETS_TO_CACHE)
          .catch(error => {
            console.error('[Service Worker] Failed to cache some assets:', error);
            // Continue even if some assets fail to cache
            return Promise.resolve();
          });
      })
      .catch(error => {
        console.error('[Service Worker] Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Claim clients to ensure the service worker controls all clients immediately
  event.waitUntil(self.clients.claim());
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => {
                console.error('[Service Worker] Error caching response:', err);
              });
            
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            // You could return a custom offline page here
            return new Response('Network error, please check your connection');
          });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Service Worker registered successfully!');

// Handle push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  const title = 'WhisperMap';
  const options = {
    body: event.data ? event.data.text() : 'New whispers nearby!',
    icon: '/public/images/icon-192x192.png',
    badge: '/public/images/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});