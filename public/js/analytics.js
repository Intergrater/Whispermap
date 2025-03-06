/**
 * WhisperMap Analytics Module
 * A lightweight analytics solution for tracking app usage
 */

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize analytics
    initAnalytics();
    
    // Set up event listeners
    setupEventListeners();
    
    // Track page view
    trackPageView();
    
    // Dispatch event to signal analytics module is loaded
    document.dispatchEvent(new CustomEvent('analytics-module-loaded'));
});

// Analytics configuration
const ANALYTICS_CONFIG = {
    endpoint: 'https://analytics.whispermap.app/collect', // Replace with your actual endpoint
    appVersion: '1.0.0',
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    debug: false // Set to true to enable console logging
};

// User session data
let sessionData = {
    sessionId: null,
    userId: null,
    startTime: null,
    lastActivity: null,
    pageViews: 0,
    events: {}
};

/**
 * Initialize analytics
 */
function initAnalytics() {
    // Try to get existing session
    const existingSession = localStorage.getItem('whispermap_analytics_session');
    
    if (existingSession) {
        try {
            const parsedSession = JSON.parse(existingSession);
            const now = Date.now();
            
            // Check if session is still valid (not expired)
            if (parsedSession.lastActivity && (now - parsedSession.lastActivity < ANALYTICS_CONFIG.sessionTimeout)) {
                sessionData = parsedSession;
                sessionData.lastActivity = now;
                logDebug('Restored existing analytics session');
            } else {
                // Session expired, create new one
                createNewSession();
                logDebug('Previous session expired, created new one');
            }
        } catch (e) {
            // Error parsing session, create new one
            createNewSession();
            logDebug('Error parsing previous session, created new one');
        }
    } else {
        // No existing session, create new one
        createNewSession();
        logDebug('No existing session, created new one');
    }
    
    // Save session data
    saveSessionData();
    
    // Set up session refresh interval
    setInterval(refreshSession, 60000); // Refresh every minute
    
    // Get user ID if available
    if (window.WhisperAuth && window.WhisperAuth.getCurrentUser) {
        const user = window.WhisperAuth.getCurrentUser();
        if (user && user.id) {
            sessionData.userId = user.id;
            saveSessionData();
        }
    }
}

/**
 * Create a new analytics session
 */
function createNewSession() {
    sessionData = {
        sessionId: generateSessionId(),
        userId: null,
        startTime: Date.now(),
        lastActivity: Date.now(),
        pageViews: 0,
        events: {}
    };
}

/**
 * Generate a unique session ID
 * @returns {string} - Unique session ID
 */
function generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Save session data to localStorage
 */
function saveSessionData() {
    try {
        localStorage.setItem('whispermap_analytics_session', JSON.stringify(sessionData));
    } catch (e) {
        logDebug('Error saving session data: ' + e.message);
    }
}

/**
 * Refresh the session to prevent timeout
 */
function refreshSession() {
    sessionData.lastActivity = Date.now();
    saveSessionData();
}

/**
 * Set up event listeners for tracking
 */
function setupEventListeners() {
    // Track whisper recording
    document.addEventListener('whisper-recorded', () => {
        trackEvent('whisper', 'record');
    });
    
    // Track whisper playback
    document.addEventListener('whisper-played', (e) => {
        trackEvent('whisper', 'play', e.detail ? e.detail.id : null);
    });
    
    // Track premium modal opens
    const premiumBtn = document.getElementById('premium-btn');
    if (premiumBtn) {
        premiumBtn.addEventListener('click', () => {
            trackEvent('premium', 'modal_open');
        });
    }
    
    // Track authentication events
    document.addEventListener('user-login', () => {
        trackEvent('auth', 'login');
        
        // Update user ID if available
        if (window.WhisperAuth && window.WhisperAuth.getCurrentUser) {
            const user = window.WhisperAuth.getCurrentUser();
            if (user && user.id) {
                sessionData.userId = user.id;
                saveSessionData();
            }
        }
    });
    
    document.addEventListener('user-signup', () => {
        trackEvent('auth', 'signup');
    });
    
    document.addEventListener('user-logout', () => {
        trackEvent('auth', 'logout');
        sessionData.userId = null;
        saveSessionData();
    });
    
    // Track social interactions
    document.addEventListener('whisper-liked', () => {
        trackEvent('social', 'like');
    });
    
    document.addEventListener('whisper-commented', () => {
        trackEvent('social', 'comment');
    });
    
    document.addEventListener('whisper-shared', () => {
        trackEvent('social', 'share');
    });
    
    // Track payment events
    document.addEventListener('payment-completed', (e) => {
        trackEvent('payment', 'complete', e.detail ? e.detail.plan : null);
    });
    
    // Track errors
    window.addEventListener('error', (e) => {
        trackEvent('error', e.message);
    });
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // User left the page
            trackEvent('session', 'background');
        } else {
            // User returned to the page
            trackEvent('session', 'foreground');
        }
    });
    
    // Track before unload (user leaving the page)
    window.addEventListener('beforeunload', () => {
        trackEvent('session', 'end');
        
        // Use sendBeacon for more reliable tracking when page is unloading
        const data = {
            type: 'session_end',
            sessionId: sessionData.sessionId,
            userId: sessionData.userId,
            duration: Date.now() - sessionData.startTime,
            pageViews: sessionData.pageViews
        };
        
        if (navigator.sendBeacon) {
            navigator.sendBeacon(ANALYTICS_CONFIG.endpoint, JSON.stringify(data));
        }
    });
}

/**
 * Track a page view
 */
function trackPageView() {
    sessionData.pageViews++;
    saveSessionData();
    
    // Send page view data
    sendAnalyticsData({
        type: 'pageview',
        path: window.location.pathname,
        referrer: document.referrer || 'direct'
    });
    
    logDebug('Tracked page view: ' + window.location.pathname);
}

/**
 * Track an event
 * @param {string} category - Event category
 * @param {string} action - Event action
 * @param {string} label - Event label (optional)
 * @param {number} value - Event value (optional)
 */
function trackEvent(category, action, label = null, value = null) {
    // Increment event counter
    if (!sessionData.events[category]) {
        sessionData.events[category] = {};
    }
    
    if (!sessionData.events[category][action]) {
        sessionData.events[category][action] = 0;
    }
    
    sessionData.events[category][action]++;
    saveSessionData();
    
    // Send event data
    sendAnalyticsData({
        type: 'event',
        category: category,
        action: action,
        label: label,
        value: value
    });
    
    logDebug(`Tracked event: ${category} - ${action}${label ? ' - ' + label : ''}${value ? ' - ' + value : ''}`);
}

/**
 * Send analytics data to the server
 * @param {Object} data - The data to send
 */
function sendAnalyticsData(data) {
    // Add session and user data
    const payload = {
        ...data,
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        appVersion: ANALYTICS_CONFIG.appVersion
    };
    
    // In a real implementation, you would send this data to your analytics server
    // For this demo, we'll just log it if debug is enabled
    logDebug('Analytics data:', payload);
    
    // Simulate sending data to server
    if (navigator.onLine) {
        try {
            // Use fetch API to send data
            // This is commented out since we don't have a real endpoint
            /*
            fetch(ANALYTICS_CONFIG.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                // Use keepalive to ensure the request completes even if the page unloads
                keepalive: true
            }).catch(error => {
                logDebug('Error sending analytics data: ' + error.message);
            });
            */
        } catch (e) {
            logDebug('Error sending analytics data: ' + e.message);
        }
    } else {
        // User is offline, queue the event for later
        queueOfflineEvent(payload);
    }
}

/**
 * Queue an event to be sent when the user is back online
 * @param {Object} data - The data to queue
 */
function queueOfflineEvent(data) {
    try {
        // Get existing queue
        const queueStr = localStorage.getItem('whispermap_analytics_queue');
        let queue = [];
        
        if (queueStr) {
            queue = JSON.parse(queueStr);
        }
        
        // Add new event to queue
        queue.push(data);
        
        // Save queue
        localStorage.setItem('whispermap_analytics_queue', JSON.stringify(queue));
        
        logDebug('Queued offline event');
    } catch (e) {
        logDebug('Error queuing offline event: ' + e.message);
    }
}

/**
 * Process queued offline events
 */
function processOfflineQueue() {
    try {
        // Get existing queue
        const queueStr = localStorage.getItem('whispermap_analytics_queue');
        
        if (!queueStr) return;
        
        const queue = JSON.parse(queueStr);
        
        if (queue.length === 0) return;
        
        logDebug(`Processing ${queue.length} queued events`);
        
        // Process each event
        queue.forEach(event => {
            sendAnalyticsData(event);
        });
        
        // Clear queue
        localStorage.removeItem('whispermap_analytics_queue');
    } catch (e) {
        logDebug('Error processing offline queue: ' + e.message);
    }
}

/**
 * Log debug messages if debug is enabled
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to log
 */
function logDebug(message, data) {
    if (ANALYTICS_CONFIG.debug) {
        if (data) {
            console.log(`[Analytics] ${message}`, data);
        } else {
            console.log(`[Analytics] ${message}`);
        }
    }
}

// Listen for online status changes
window.addEventListener('online', () => {
    logDebug('Device is online, processing offline queue');
    processOfflineQueue();
});

// Export analytics functions for use in other modules
window.WhisperAnalytics = {
    trackEvent: trackEvent,
    trackPageView: trackPageView
}; 