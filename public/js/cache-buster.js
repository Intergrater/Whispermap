// Cache Buster for WhisperMap
(function() {
    // Version of the app - change this when deploying new versions
    const APP_VERSION = '1.0.0';
    
    // Function to update service worker
    function updateServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                // Check if there's a new version
                registration.update().then(() => {
                    console.log('[Cache Buster] Service worker updated');
                }).catch(error => {
                    console.error('[Cache Buster] Service worker update failed:', error);
                });
            });
        }
    }
    
    // Check for app updates
    function checkForUpdates() {
        const storedVersion = localStorage.getItem('whispermap_version');
        
        if (storedVersion !== APP_VERSION) {
            console.log(`[Cache Buster] App updated from ${storedVersion || 'none'} to ${APP_VERSION}`);
            
            // Clear any cached data that might be version-specific
            try {
                // Clear application cache
                if ('caches' in window) {
                    caches.keys().then(cacheNames => {
                        cacheNames.forEach(cacheName => {
                            if (cacheName.startsWith('whispermap-')) {
                                caches.delete(cacheName).then(() => {
                                    console.log(`[Cache Buster] Cache ${cacheName} deleted`);
                                });
                            }
                        });
                    });
                }
                
                // Update service worker
                updateServiceWorker();
                
                // Store the new version
                localStorage.setItem('whispermap_version', APP_VERSION);
                
                // Show update notification if not first install
                if (storedVersion) {
                    if (window.showNotification) {
                        window.showNotification('WhisperMap has been updated!', 'info');
                    }
                }
            } catch (error) {
                console.error('[Cache Buster] Error clearing cache:', error);
            }
        }
    }
    
    // Run on page load
    window.addEventListener('load', checkForUpdates);
    
    // Expose functions
    window.cacheBuster = {
        checkForUpdates,
        updateServiceWorker,
        getVersion: () => APP_VERSION
    };
})(); 