import React, { useEffect, useRef, useState } from 'react';

export default function Map({ location, whispers }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize map when component mounts
    if (typeof window === 'undefined') {
      return; // Skip on server-side
    }
    
    if (!mapInstanceRef.current && mapRef.current && location) {
      setIsLoading(true);
      
      // Check if API key is available
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setError('Google Maps API key is missing. Please check your environment variables.');
        setIsLoading(false);
        return;
      }
      
      // Check if window is defined (for SSR)
      if (window.google) {
        initMap();
        setIsLoading(false);
      } else {
        // Load Google Maps script if not already loaded
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          initMap();
          setIsLoading(false);
        };
        script.onerror = () => {
          setError('Failed to load Google Maps. Please check your API key.');
          setIsLoading(false);
        };
        document.head.appendChild(script);
      }
    }

    // Update markers when whispers change
    if (mapInstanceRef.current && whispers && whispers.length > 0) {
      updateMarkers();
    }
  }, [location, whispers]);

  const initMap = () => {
    if (!mapRef.current || !location || typeof window === 'undefined') return;

    try {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: location.lat, lng: location.lng },
        zoom: 15,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#e9e9e9' }, { lightness: 17 }]
          },
          {
            featureType: 'landscape',
            elementType: 'geometry',
            stylers: [{ color: '#f5f5f5' }, { lightness: 20 }]
          }
        ]
      });

      // Add user location marker with custom icon
      new window.google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#6366F1', // Indigo color
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        title: 'Your Location'
      });

      // Add whisper markers
      if (whispers && whispers.length > 0) {
        updateMarkers();
      }
    } catch (err) {
      setError(`Error initializing map: ${err.message}`);
    }
  };

  const updateMarkers = () => {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers for each whisper
    whispers.forEach(whisper => {
      // Create a custom SVG marker
      const svgMarker = {
        path: "M12,2C8.14,2,5,5.14,5,9c0,5.25,7,13,7,13s7-7.75,7-13C19,5.14,15.86,2,12,2z M12,11.5c-1.38,0-2.5-1.12-2.5-2.5s1.12-2.5,2.5-2.5s2.5,1.12,2.5,2.5S13.38,11.5,12,11.5z",
        fillColor: '#EC4899', // Pink color
        fillOpacity: 0.9,
        strokeWeight: 1,
        strokeColor: '#ffffff',
        rotation: 0,
        scale: 1.5,
        anchor: new window.google.maps.Point(12, 22),
      };

      const marker = new window.google.maps.Marker({
        position: { lat: whisper.location.lat, lng: whisper.location.lng },
        map: mapInstanceRef.current,
        icon: svgMarker,
        title: `Whisper from ${new Date(whisper.timestamp).toLocaleString()}`,
        animation: window.google.maps.Animation.DROP
      });

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <h3 style="margin: 0 0 8px; font-weight: bold;">Whisper</h3>
            <p style="margin: 0 0 8px;">${new Date(whisper.timestamp).toLocaleString()}</p>
            <button id="play-whisper-${whisper.id}" style="background-color: #6366F1; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
              Play Audio
            </button>
          </div>
        `
      });

      // Add click listener to show info window
      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
        
        // Add event listener to play button after info window is opened
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
    </div>
  );
}