import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function LeafletMap({ location, whispers }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current && location) {
      try {
        // Create map instance
        mapInstanceRef.current = L.map(mapRef.current).setView([location.lat, location.lng], 15);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);
        
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
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize map. Please try again later.');
        setIsLoading(false);
      }
    }
    
    // Update markers when whispers change
    if (mapInstanceRef.current && whispers && whispers.length > 0) {
      updateMarkers();
    }
  }, [location, whispers]);

  // Update markers on the map
  const updateMarkers = () => {
    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];
    
    // Add new markers for each whisper
    whispers.forEach(whisper => {
      if (!whisper.location) return;
      
      const marker = L.marker([whisper.location.lat, whisper.location.lng], {
        icon: L.divIcon({
          className: 'whisper-marker',
          html: `
            <div class="whisper-marker-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        })
      }).addTo(mapInstanceRef.current);
      
      // Add popup with whisper info
      const popupContent = document.createElement('div');
      popupContent.className = 'whisper-popup';
      popupContent.innerHTML = `
        <h3 class="font-bold mb-2">Whisper</h3>
        <p class="text-sm mb-2">${new Date(whisper.timestamp).toLocaleString()}</p>
        <button id="play-whisper-${whisper.id}" class="bg-indigo-600 text-white px-3 py-1 rounded text-sm">
          Play Audio
        </button>
      `;
      
      marker.bindPopup(popupContent);
      
      marker.on('popupopen', () => {
        setTimeout(() => {
          const playButton = document.getElementById(`play-whisper-${whisper.id}`);
          if (playButton) {
            playButton.addEventListener('click', () => {
              const audio = new Audio(whisper.audioUrl);
              audio.play();
            });
          }
        }, 100);
      });
      
      markersRef.current.push(marker);
    });
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-lg border border-gray-200">
      {isLoading && (
        <div className="flex items-center justify-center h-96 bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}
      
      {error && (
        <div className="flex flex-col items-center justify-center h-96 bg-red-50 text-red-500 p-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-center">{error}</p>
          <p className="text-center text-sm mt-2 text-red-400">
            Whispers will still be available in the list below.
          </p>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        className={`w-full h-96 ${isLoading || error ? 'hidden' : ''}`}
        style={{ height: '400px' }}
      ></div>
      
      <style jsx global>{`
        .user-location-marker {
          background: transparent;
        }
        
        .pulse {
          width: 20px;
          height: 20px;
          background: rgba(79, 70, 229, 0.6);
          border-radius: 50%;
          position: relative;
        }
        
        .pulse:after {
          content: "";
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          border: 2px solid rgba(79, 70, 229, 0.6);
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