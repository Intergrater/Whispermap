import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
const DefaultIcon = L.icon({
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function LeafletMapClient({ location, whispers, detectionRange, whisperRange, refreshTimestamp }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const detectionCircleRef = useRef(null);
  const whisperCircleRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const lastMapUpdateRef = useRef(Date.now());
  const isMobileRef = useRef(typeof window !== 'undefined' && window.innerWidth < 768);
  const mapInitializedRef = useRef(false);

  // Initialize map when component mounts - with special mobile handling
  useEffect(() => {
    // Skip if we don't have the necessary elements or location
    if (!mapRef.current || !location) {
      return;
    }
    
    // If map is already initialized, just update it
    if (mapInstanceRef.current) {
      console.log('Map already initialized, skipping initialization');
      return;
    }
    
    // Mark that we're attempting to initialize
    mapInitializedRef.current = true;
      
    try {
      console.log('Initializing map with location:', location);
      
      // Record initialization time
      lastMapUpdateRef.current = Date.now();
      
      // CRITICAL FIX: Always allow map initialization, even on mobile
      // This ensures the map appears while still preventing refresh issues
      
      // Create map instance with mobile-specific options
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [location.lat, location.lng],
        zoom: isMobileRef.current ? 14 : 15, // Slightly zoomed out on mobile
        zoomControl: !isMobileRef.current, // Hide zoom controls on mobile (use pinch instead)
        attributionControl: true,
        // CRITICAL: Disable automatic repositioning on mobile
        zoomAnimation: !isMobileRef.current, // Disable zoom animation on mobile for better performance
        markerZoomAnimation: !isMobileRef.current, // Disable marker zoom animation on mobile
        fadeAnimation: !isMobileRef.current, // Disable fade animation on mobile
        // Prevent automatic repositioning when user is interacting with the map
        trackResize: false
      });
      
      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
      
      // Force a resize after map is created to ensure it renders properly
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300); // Increased timeout for mobile
      
      // Add user location marker
      L.marker([location.lat, location.lng], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: `<div class="pulse"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(mapInstanceRef.current)
        .bindPopup('Your location')
        .openPopup();
      
      // Add detection range circle
      if (detectionRange) {
        detectionCircleRef.current = L.circle([location.lat, location.lng], {
          radius: detectionRange,
          color: '#6366F1',
          fillColor: '#6366F1',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '5, 5'
        }).addTo(mapInstanceRef.current);
      }
      
      // Add whisper range circle
      if (whisperRange) {
        whisperCircleRef.current = L.circle([location.lat, location.lng], {
          radius: whisperRange,
          color: '#EC4899',
          fillColor: '#EC4899',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '5, 5'
        }).addTo(mapInstanceRef.current);
      }
      
      // CRITICAL: Add event listeners to prevent automatic repositioning
      // Store the user's chosen view state
      let userCenter = null;
      let userZoom = null;
      
      // Track when user interacts with the map
      mapInstanceRef.current.on('zoomstart', () => {
        setUserHasInteracted(true);
        mapInstanceRef.current._userHasInteracted = true;
        console.log('User started zooming - disabling auto repositioning');
      });
      
      mapInstanceRef.current.on('dragstart', () => {
        setUserHasInteracted(true);
        mapInstanceRef.current._userHasInteracted = true;
        console.log('User started dragging - disabling auto repositioning');
      });
      
      // Store the user's chosen view after interaction
      mapInstanceRef.current.on('moveend', () => {
        if (userHasInteracted || mapInstanceRef.current._userHasInteracted) {
          userCenter = mapInstanceRef.current.getCenter();
          userZoom = mapInstanceRef.current.getZoom();
          console.log(`User moved map to: [${userCenter.lat}, ${userCenter.lng}], zoom: ${userZoom}`);
        }
      });
      
      // Override the map's setView method to respect user interaction
      const originalSetView = mapInstanceRef.current.setView;
      mapInstanceRef.current.setView = function(...args) {
        // Only auto-reposition if user hasn't interacted OR if it's been >30s since last update
        const timeSinceLastUpdate = Date.now() - lastMapUpdateRef.current;
        const forceUpdate = timeSinceLastUpdate > 30000; // 30 seconds
        
        if ((!userHasInteracted && !this._userHasInteracted) || forceUpdate) {
          if (forceUpdate) {
            console.log('Forcing map update due to timeout');
          }
          lastMapUpdateRef.current = Date.now();
          return originalSetView.apply(this, args);
        } else {
          // If user has interacted, maintain their chosen view
          console.log('Preserving user map view due to interaction');
          if (userCenter && userZoom) {
            // Do nothing - let the user's view remain
            return this;
          }
          return this;
        }
      };
      
      // For mobile devices, limit marker updates but don't completely disable
      if (isMobileRef.current) {
        mapInstanceRef.current._limitMarkerUpdates = true;
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map. Please try again later.');
      setIsLoading(false);
    }

    // Cleanup function to properly remove the map instance
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location, detectionRange, whisperRange]);

  // Update range circles when detection or whisper ranges change
  useEffect(() => {
    // Skip if map isn't initialized
    if (!mapInstanceRef.current || !location) {
      return;
    }
    
    // Skip updates on mobile if the user has interacted with the map
    if (isMobileRef.current && (userHasInteracted || mapInstanceRef.current._userHasInteracted)) {
      console.log('Skipping map range update due to user interaction');
      return;
    }
    
    // Rate limit updates to prevent too frequent refreshes
    const timeSinceLastUpdate = Date.now() - lastMapUpdateRef.current;
    if (timeSinceLastUpdate < 5000) { // 5 seconds minimum between updates
      console.log('Rate limiting map update - too soon since last update');
      return;
    }
    
    console.log('Updating map range circles');
    lastMapUpdateRef.current = Date.now();
    
    // Update detection range circle
    if (detectionCircleRef.current) {
      mapInstanceRef.current.removeLayer(detectionCircleRef.current);
    }
    
    detectionCircleRef.current = L.circle([location.lat, location.lng], {
      radius: detectionRange,
      color: '#6366F1',
      fillColor: '#6366F1',
      fillOpacity: 0.1,
      weight: 1,
      dashArray: '5, 5'
    }).addTo(mapInstanceRef.current);
    
    // Update whisper range circle
    if (whisperCircleRef.current) {
      mapInstanceRef.current.removeLayer(whisperCircleRef.current);
    }
    
    whisperCircleRef.current = L.circle([location.lat, location.lng], {
      radius: whisperRange,
      color: '#EC4899',
      fillColor: '#EC4899',
      fillOpacity: 0.1,
      weight: 1,
      dashArray: '5, 5'
    }).addTo(mapInstanceRef.current);
    
    // Don't recenter the map if user has interacted with it
    if (!userHasInteracted && !mapInstanceRef.current._userHasInteracted) {
      // Force a resize to ensure the map renders properly
      mapInstanceRef.current.invalidateSize();
    }
  }, [location, detectionRange, whisperRange, userHasInteracted]);

  // Handle window resize to ensure map renders properly
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update markers when whispers change - limited on mobile
  useEffect(() => {
    // Skip if map isn't initialized
    if (!mapInstanceRef.current || !location || !whispers || whispers.length === 0) {
      return;
    }
    
    // Skip updates if explicitly disabled
    if (mapInstanceRef.current._disableMarkerUpdates) {
      console.log('Marker updates have been disabled for this map instance');
      return;
    }
    
    // Limit frequency of marker updates on mobile
    if (isMobileRef.current && mapInstanceRef.current._limitMarkerUpdates) {
      // Rate limit marker updates more aggressively on mobile
      const timeSinceLastUpdate = Date.now() - lastMapUpdateRef.current;
      if (timeSinceLastUpdate < 10000) { // 10 seconds on mobile
        console.log('Rate limiting marker updates on mobile - too soon since last update');
        return;
      }
    } else {
      // Rate limit on desktop too, but less aggressively
      const timeSinceLastUpdate = Date.now() - lastMapUpdateRef.current;
      if (timeSinceLastUpdate < 3000) { // 3 seconds on desktop
        console.log('Rate limiting marker updates - too soon since last update');
        return;
      }
    }
    
    console.log(`Updating map markers with ${whispers.length} whispers`);
    lastMapUpdateRef.current = Date.now();
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];
    
    // Limit number of markers on mobile to improve performance
    let whispersToDisplay = whispers;
    if (isMobileRef.current && whispers.length > 20) {
      whispersToDisplay = whispers.slice(0, 20);
      console.log(`Limited markers from ${whispers.length} to 20 for mobile performance`);
    }
    
    // Filter whispers based on detection range
    const filteredWhispers = whispersToDisplay.filter(whisper => {
      if (whisper.location && whisper.location.lat && whisper.location.lng) {
        // Calculate distance between user and whisper
        const distance = calculateDistance(
          location.lat, 
          location.lng, 
          whisper.location.lat, 
          whisper.location.lng
        );
        
        // Only show whispers within detection range
        return distance <= detectionRange;
      }
      return false;
    });
    
    // Add new markers for each whisper
    filteredWhispers.forEach(whisper => {
      if (whisper.location && whisper.location.lat && whisper.location.lng && mapInstanceRef.current) {
        try {
          const marker = L.marker([whisper.location.lat, whisper.location.lng], {
            icon: L.divIcon({
              className: 'whisper-marker',
              html: `
                <div class="whisper-marker-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 40]
            })
          }).addTo(mapInstanceRef.current);
          
          // Add popup with whisper info
          const popupContent = `
            <div>
              <p class="font-bold">${new Date(whisper.timestamp).toLocaleString()}</p>
              <p class="text-sm text-gray-600 mb-2">${whisper.category || 'General'}</p>
              <button onclick="document.dispatchEvent(new CustomEvent('play-whisper', {detail: '${whisper.id}'}))">
                Play Whisper
              </button>
            </div>
          `;
          
          marker.bindPopup(popupContent);
          markersRef.current.push(marker);
        } catch (err) {
          console.error('Error adding whisper marker:', err);
        }
      }
    });
  }, [whispers, location, detectionRange]);

  // Calculate distance between two points in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Handle play whisper event from popup
  useEffect(() => {
    const handlePlayWhisper = (e) => {
      const whisperId = e.detail;
      const whisper = whispers?.find(w => w.id === whisperId);
      if (whisper) {
        // Create audio element
        const audio = new Audio(whisper.audioUrl);
        audio.play().catch(err => console.error('Error playing audio:', err));
      }
    };
    
    document.addEventListener('play-whisper', handlePlayWhisper);
    
    return () => {
      document.removeEventListener('play-whisper', handlePlayWhisper);
    };
  }, [whispers]);

  // Force map refresh when refreshTimestamp changes
  useEffect(() => {
    if (refreshTimestamp && mapInstanceRef.current) {
      console.log(`Manual map refresh triggered (timestamp: ${refreshTimestamp})`);
      
      // Force a resize to ensure the map renders properly
      mapInstanceRef.current.invalidateSize();
      
      // Update the last refresh time
      lastMapUpdateRef.current = Date.now();
      
      // If we have location, recenter the map
      if (location && !userHasInteracted && !mapInstanceRef.current._userHasInteracted) {
        mapInstanceRef.current.setView([location.lat, location.lng], mapInstanceRef.current.getZoom());
      }
    }
  }, [refreshTimestamp, location, userHasInteracted]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10 p-4">
          <div className="text-red-500 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        className={`w-full h-96 ${isLoading || error ? 'hidden' : ''}`}
        style={{ height: '400px', width: '100%', zIndex: 1 }}
      ></div>
      
      <div className="mt-4 flex justify-between text-sm text-gray-600 px-2">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
          <span>Detection Range</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-pink-500 mr-2"></div>
          <span>Whisper Range</span>
        </div>
      </div>
      
      <style jsx global>{`
        .leaflet-container {
          width: 100%;
          height: 400px;
          z-index: 1;
        }
        
        .user-location-marker {
          background: transparent;
        }
        
        .pulse {
          width: 20px;
          height: 20px;
          background: rgba(99, 102, 241, 0.6);
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        
        .whisper-marker {
          background: transparent;
        }
        
        .whisper-marker-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: linear-gradient(to right, #6366f1, #a855f7);
          border-radius: 50%;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transform-origin: bottom center;
          animation: bounce 1s ease-in-out;
        }
        
        .whisper-marker-icon svg {
          width: 24px;
          height: 24px;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
} 