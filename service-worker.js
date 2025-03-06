// WhisperMap Service Worker
const CACHE_NAME = 'whispermap-cache-v2';
const DYNAMIC_CACHE_NAME = 'whispermap-dynamic-cache-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/public/css/styles.css',
  '/public/css/social.css',
  '/public/css/premium-fix.css',
  '/public/css/location-fix.css',
  '/public/js/app.js',
  '/public/js/auth.js',
  '/public/js/payment.js',
  '/public/js/social.js',
  '/public/js/analytics.js',
  '/public/js/cache-buster.js',
  '/public/images/logo.svg',
  '/public/images/icon-192x192.svg',
  '/public/images/icon-512x512.svg',
  '/public/images/default-avatar.png',
  '/public/sounds/location.mp3',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching App Shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(error => {
        console.error('[Service Worker] Precaching failed:', error);
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
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        }));
      })
  );
  
  return self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Never cache audio files - always get from network
  if (url.pathname.includes('/api/whispers/') && url.pathname.includes('/audio')) {
    console.log('[Service Worker] Audio file request, bypassing cache:', url.pathname);
    return fetch(event.request);
  }
  
  // Handle API requests differently - network first with timeout fallback
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(
      networkFirstWithTimeout(event.request, 3000)
    );
  }
  
  // For static assets - cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();
            
            caches.open(DYNAMIC_CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            
            // For HTML requests, return the offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            return new Response('Network error', {
              status: 408,
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Network first with timeout fallback
function networkFirstWithTimeout(request, timeout) {
  return new Promise(resolve => {
    // Set a timeout for the network request
    const timeoutId = setTimeout(() => {
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            resolve(cachedResponse);
          } else {
            resolve(new Response('Network timeout', {
              status: 408,
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            }));
          }
        });
    }, timeout);
    
    // Try the network first
    fetch(request)
      .then(response => {
        clearTimeout(timeoutId);
        
        // Cache the response for future use
        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE_NAME)
          .then(cache => {
            cache.put(request, responseToCache);
          });
        
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        console.error('[Service Worker] Network request failed:', error);
        
        // Try to get from cache
        caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              resolve(cachedResponse);
            } else {
              resolve(new Response('Network error', {
                status: 408,
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              }));
            }
          });
      });
  });
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background Sync', event.tag);
  
  if (event.tag === 'sync-whispers') {
    event.waitUntil(
      // Implement logic to sync offline whispers
      syncOfflineWhispers()
    );
  }
});

// Function to sync offline whispers
function syncOfflineWhispers() {
  return new Promise((resolve, reject) => {
    // This would be implemented to send cached whispers when online
    console.log('[Service Worker] Syncing offline whispers');
    resolve();
  });
}

// Push notification support
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received', event);
  
  let data = { title: 'New Notification', body: 'Something new happened!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[Service Worker] Error parsing push data', e);
    }
  }
  
  const options = {
    body: data.body,
    icon: '/public/images/icon-192x192.svg',
    badge: '/public/images/icon-192x192.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
}); 