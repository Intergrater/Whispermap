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

export default function LeafletMapClient({ location, whispers }) {
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

    // Cleanup function to properly remove the map instance
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location]);

  // Update markers when whispers change
  useEffect(() => {
    if (mapInstanceRef.current && whispers && whispers.length > 0) {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(marker);
        }
      });
      markersRef.current = [];
      
      // Add new markers for each whisper
      whispers.forEach(whisper => {
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
  }, [whispers]);

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
        style={{ height: '400px' }}
      ></div>
      
      <style jsx global>{`
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