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

export default function LeafletMapClient({ location, whispers, detectionRange, whisperRange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const detectionCircleRef = useRef(null);
  const whisperCircleRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current && location) {
      try {
        console.log('Initializing map with location:', location);
        
        // Create map instance
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [location.lat, location.lng],
          zoom: 15,
          zoomControl: true,
          attributionControl: true
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
        }, 100);
        
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
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize map. Please try again later.');
        setIsLoading(false);
      }
    }

    // Cleanup function to properly remove the map instance
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location]);

  // Update range circles when detection or whisper ranges change
  useEffect(() => {
    if (mapInstanceRef.current && location) {
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
      
      // Force a resize to ensure the map renders properly
      mapInstanceRef.current.invalidateSize();
    }
  }, [location, detectionRange, whisperRange]);

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

  // Update markers when whispers change
  useEffect(() => {
    if (mapInstanceRef.current && whispers && whispers.length > 0 && location) {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(marker);
        }
      });
      markersRef.current = [];
      
      // Filter whispers based on detection range
      const filteredWhispers = whispers.filter(whisper => {
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
    }
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