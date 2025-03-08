import React, { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import WhisperList from '../components/WhisperList'
import PremiumFeatures from '../components/PremiumFeatures'
import { useUser } from '../contexts/UserContext'

// Add this at the top level to completely disable automatic refreshes on mobile
if (typeof window !== 'undefined' && window.innerWidth < 768) {
  console.log('MOBILE DEVICE DETECTED: Disabling automatic refreshes');
  // Create a global variable to signal that we're on mobile
  window.IS_MOBILE_DEVICE = true;
  // Create a global flag to control all refresh operations
  window.ALLOW_REFRESH = false;
  
  // Immediately try to load whispers from localStorage
  try {
    const storedWhispers = JSON.parse(localStorage.getItem('whispers') || '[]');
    if (storedWhispers.length > 0) {
      console.log(`Pre-loaded ${storedWhispers.length} whispers from localStorage for mobile`);
      // Store this in global space for immediate access
      window.PRELOADED_WHISPERS = storedWhispers;
    }
  } catch (err) {
    console.error('Failed to pre-load whispers:', err);
  }
}

// Dynamically import components that use browser APIs
const AudioRecorder = dynamic(() => import('../components/AudioRecorder'), { ssr: false })
const LeafletMap = dynamic(() => import('../components/LeafletMap'), { ssr: false })
const MapComponent = dynamic(() => import('../components/Map'), { ssr: false })
const DistanceControls = dynamic(() => import('../components/DistanceControls'), { ssr: false })

export default function Home() {
  const [whispers, setWhispers] = useState([])
  const [location, setLocation] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [detectionRange, setDetectionRange] = useState(1000) // Default 1km detection range
  const [whisperRange, setWhisperRange] = useState(500) // Default 500m whisper range
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState(0) // Track last refresh time
  const [manualRefreshCount, setManualRefreshCount] = useState(0) // Track manual refreshes
  const [preventAllRefreshes, setPreventAllRefreshes] = useState(false) // Global refresh prevention
  const { user, updateUser } = useUser()
  
  // Determine if we're on mobile once on component mount
  const isMobile = useRef(typeof window !== 'undefined' && window.innerWidth < 768);

  // Initialize state with any preloaded whispers for mobile
  useEffect(() => {
    if (isMobile.current && window.PRELOADED_WHISPERS) {
      console.log('Using preloaded whispers for mobile');
      setWhispers(window.PRELOADED_WHISPERS);
      setIsLoading(false);
    }
  }, []);
  
  // Load whispers from localStorage on initial mount
  useEffect(() => {
    // Skip if we already have preloaded whispers
    if (isMobile.current && window.PRELOADED_WHISPERS) {
      return;
    }
    
    try {
      const storedWhispers = JSON.parse(localStorage.getItem('whispers') || '[]');
      if (storedWhispers.length > 0) {
        console.log(`Loaded ${storedWhispers.length} whispers from localStorage on initial mount`);
        
        // Filter out expired whispers
        const currentDate = new Date();
        const validWhispers = storedWhispers.filter(whisper => {
          let isValid = true;
          
          if (whisper.expirationDate) {
            isValid = new Date(whisper.expirationDate) > currentDate;
          } else if (whisper.timestamp) {
            // Default 7-day expiration if no explicit expiration date
            const timestamp = new Date(whisper.timestamp);
            const defaultExpiration = new Date(timestamp);
            defaultExpiration.setDate(defaultExpiration.getDate() + 7);
            isValid = defaultExpiration > currentDate;
          }
          
          return isValid;
        });
        
        console.log(`After filtering, ${validWhispers.length} valid whispers remain`);
        setWhispers(validWhispers);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading whispers from localStorage:', error);
    }
  }, []);

  // Function to enable refresh for a short period
  const temporarilyEnableRefresh = () => {
    // Only needed on mobile
    if (!isMobile.current) return;
    
    console.log('Temporarily enabling refresh for manual operation');
    window.ALLOW_REFRESH = true;
    
    // Automatically disable after 5 seconds as a safety measure
    setTimeout(() => {
      window.ALLOW_REFRESH = false;
      console.log('Automatic disable of refresh after timeout');
    }, 5000);
  };

  // Fetch whispers from your API - completely redesigned for mobile
  useEffect(() => {
    // Early exit on mobile - manual refresh only
    if (isMobile.current) {
      console.log('On mobile: Skipping automatic fetch setup. Manual refresh only.');
      setIsLoading(false);
      return;
    }
    
    let isMounted = true; // Track if component is mounted
    
    async function fetchWhispers() {
      // Skip if all refreshes are prevented
      if (preventAllRefreshes) {
        console.log('All refreshes currently prevented');
        return;
      }
      
      // Skip fetching if audio is playing
      if (isPlayingAudio) {
        console.log('Skipping whisper fetch because audio is playing');
        return;
      }
      
      // CRITICAL: Check for audio playback flag in localStorage
      if (typeof window !== 'undefined' && localStorage.getItem('whispermap_playing_audio') === 'true') {
        console.log('Skipping whisper fetch because audio is playing (localStorage flag)');
        return;
      }
      
      // Rate limiting - prevent refresh if the last one was less than 5 seconds ago
      const now = Date.now();
      if (now - lastRefreshTime < 5000) {
        console.log('Rate limiting: Too soon since last refresh');
        return;
      }
      
      try {
        if (!isMounted) return; // Don't proceed if component unmounted
        
        setIsLoading(true);
        
        // Include detection range in the API request if location is available
        let url = '/api/whispers';
        if (location) {
          // Add a timestamp to prevent caching
          const timestamp = new Date().getTime();
          url = `/api/whispers?latitude=${location.lat}&longitude=${location.lng}&radius=${detectionRange}&_t=${timestamp}`;
          console.log(`Fetching whispers with detection range: ${detectionRange}m`);
        } else {
          console.log('Location not available, fetching all whispers');
        }
        
        console.log(`Fetching whispers from: ${url}`);
        
        // Set a timeout for the fetch operation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId); // Clear the timeout if fetch completes
          
          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
          }
          
          const data = await response.json();
          console.log(`Received ${data.length} whispers from API`);
          
          if (!isMounted) return; // Don't proceed if component unmounted
          
          // Check if we have existing whispers in localStorage
          const storedWhispers = JSON.parse(localStorage.getItem('whispers') || '[]');
          console.log(`Found ${storedWhispers.length} whispers in localStorage`);
          
          // Merge new whispers with existing ones, avoiding duplicates
          const mergedWhispers = [...data];
          let addedFromStorage = 0;
          
          // Add any stored whispers that aren't in the API response
          storedWhispers.forEach(storedWhisper => {
            // Check if this whisper is already in our merged array
            const exists = mergedWhispers.some(w => w.id === storedWhisper.id);
            if (!exists) {
              // Check if the whisper is still valid (not expired)
              const currentDate = new Date();
              let isValid = true;
              
              if (storedWhisper.expirationDate) {
                isValid = new Date(storedWhisper.expirationDate) > currentDate;
              } else if (storedWhisper.timestamp) {
                // Default 7-day expiration if no explicit expiration date
                const timestamp = new Date(storedWhisper.timestamp);
                const defaultExpiration = new Date(timestamp);
                defaultExpiration.setDate(defaultExpiration.getDate() + 7);
                isValid = defaultExpiration > currentDate;
              }
              
              // CRITICAL: Always add valid whispers regardless of location
              // This ensures whispers are displayed on mobile even if location changes
              if (isValid) {
                // Mark the whisper as persistent to ensure it's always loaded
                storedWhisper.isPersistent = true;
                mergedWhispers.push(storedWhisper);
                addedFromStorage++;
              }
            }
          });
          
          console.log(`Added ${addedFromStorage} valid whispers from localStorage`);
          
          // Sort by timestamp, newest first
          mergedWhispers.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
          });
          
          console.log(`After merging, we have ${mergedWhispers.length} whispers`);
          
          if (!isMounted) return; // Don't proceed if component unmounted
          
          // Store the whispers in state and localStorage
          setWhispers(mergedWhispers);
          localStorage.setItem('whispers', JSON.stringify(mergedWhispers));
          console.log(`Saved ${mergedWhispers.length} whispers to localStorage with complete data`);
          
          // Update the last refresh time
          setLastRefreshTime(Date.now());
          
          setError('');
          setIsLoading(false);
        } catch (fetchError) {
          if (fetchError.name === 'AbortError') {
            console.error('Fetch operation timed out');
            throw new Error('Request timed out. Please check your connection.');
          } else {
            throw fetchError;
          }
        }
      } catch (error) {
        console.error('Error fetching whispers:', error);
        
        if (isMounted) {
          setError(`Failed to load whispers: ${error.message}`);
          
          // Try to load from localStorage as fallback
          try {
            const storedWhispers = JSON.parse(localStorage.getItem('whispers') || '[]');
            if (storedWhispers.length > 0) {
              console.log(`Loaded ${storedWhispers.length} whispers from localStorage as fallback`);
              setWhispers(storedWhispers);
            }
          } catch (localStorageError) {
            console.error('Error loading from localStorage:', localStorageError);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    // Only desktop gets automatic fetches
    if (!isMobile.current) {
      // Initial fetch for desktop only
      fetchWhispers();
      
      // Set up polling ONLY for desktop
      const refreshInterval = 60000; // 1 minute for desktop
      console.log(`Setting whisper refresh interval to ${refreshInterval/1000} seconds (desktop)`);
      
      const intervalId = setInterval(() => {
        if (!isPlayingAudio && !preventAllRefreshes) {
          fetchWhispers();
        } else {
          console.log('Skipping scheduled refresh due to playback or prevention flag');
        }
      }, refreshInterval);
      
      // Clean up interval on component unmount
      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    } else {
      // For mobile, just set up a cleanup function
      return () => {
        isMounted = false;
      };
    }
  }, [location, detectionRange, isPlayingAudio, preventAllRefreshes]);
  
  // Save whispers to localStorage whenever they change
  useEffect(() => {
    if (whispers && whispers.length > 0) {
      localStorage.setItem('whispers', JSON.stringify(whispers));
      console.log(`Updated ${whispers.length} whispers in localStorage after state change`);
    }
  }, [whispers]);
  
  // Helper function to calculate distance between two points
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180
    const φ2 = lat2 * Math.PI/180
    const Δφ = (lat2-lat1) * Math.PI/180
    const Δλ = (lon2-lon1) * Math.PI/180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c // Distance in meters
  }

  // Get user's location with special mobile handling
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      // Get initial location (once only)
      navigator.geolocation.getCurrentPosition(
        position => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log(`Got initial location: [${newLocation.lat}, ${newLocation.lng}]`);
          setLocation(newLocation);
          setError('');
          
          // Store location in localStorage for backup
          localStorage.setItem('lastKnownLocation', JSON.stringify(newLocation));
          
          // For mobile, once we have location, try to do one fetch (if allowed)
          if (isMobile.current && window.ALLOW_REFRESH) {
            performManualRefresh();
          }
        },
        error => {
          console.error('Error getting location:', error);
          setError('Unable to access your location. Please enable location services and refresh the page.');
          
          // Try to use last known location from localStorage as fallback
          const lastKnownLocation = localStorage.getItem('lastKnownLocation');
          if (lastKnownLocation) {
            try {
              const parsedLocation = JSON.parse(lastKnownLocation);
              console.log(`Using last known location: [${parsedLocation.lat}, ${parsedLocation.lng}]`);
              setLocation(parsedLocation);
            } catch (e) {
              console.error('Error parsing last known location:', e);
            }
          }
        },
        {
          enableHighAccuracy: !isMobile.current, // Less accurate on mobile to save battery
          maximumAge: isMobile.current ? 300000 : 30000, // 5 minutes on mobile, 30 seconds on desktop
          timeout: 10000 // 10 seconds
        }
      );
      
      // Only set up continuous location tracking on desktop
      if (!isMobile.current) {
        // Set up watch position for continuous updates
        const watchId = navigator.geolocation.watchPosition(
          position => {
            // Skip location updates when audio is playing
            if (isPlayingAudio || preventAllRefreshes) {
              console.log('Skipping location update due to playback or prevention');
              return;
            }
            
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            // Only update if location has changed significantly (more than 10 meters)
            if (!location || calculateDistance(
              location.lat, 
              location.lng, 
              newLocation.lat, 
              newLocation.lng
            ) > 10) {
              console.log(`Location updated to: [${newLocation.lat}, ${newLocation.lng}]`);
              setLocation(newLocation);
              
              // Store updated location in localStorage
              localStorage.setItem('lastKnownLocation', JSON.stringify(newLocation));
            }
          },
          error => {
            console.error('Error watching location:', error);
          },
          {
            enableHighAccuracy: false, // Less accurate to save battery
            maximumAge: 60000, // 1 minute
            timeout: 27000 // 27 seconds
          }
        );
        
        // Clean up watch position on component unmount
        return () => {
          navigator.geolocation.clearWatch(watchId);
        };
      }
    } else if (typeof window !== 'undefined') {
      setError('Geolocation is not supported by your browser.');
    }
  }, []);

  // Function to manually refresh whispers for mobile
  const performManualRefresh = async () => {
    // Skip if all refreshes are prevented
    if (preventAllRefreshes) {
      console.log('Manual refresh: Prevented due to global flag');
      return;
    }
    
    // Skip if audio is playing
    if (isPlayingAudio) {
      console.log('Manual refresh: Skipping because audio is playing');
      return;
    }
    
    // Check for audio playback flag in localStorage
    if (typeof window !== 'undefined' && localStorage.getItem('whispermap_playing_audio') === 'true') {
      console.log('Manual refresh: Skipping because audio is playing (localStorage flag)');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Temporarily allow refresh operations on mobile
      if (isMobile.current) {
        temporarilyEnableRefresh();
      }
      
      // Increment manual refresh counter
      setManualRefreshCount(prev => prev + 1);
      
      const timestamp = Date.now();
      let url = '/api/whispers';
      if (location) {
        url = `/api/whispers?latitude=${location.lat}&longitude=${location.lng}&radius=${detectionRange}&_t=${timestamp}`;
      }
      
      console.log(`Manual refresh: Fetching from ${url}`);
      
      // Set a timeout for the fetch operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Manual refresh: Received ${data.length} whispers from API`);
      
      // Get whispers from localStorage to merge with API results
      let storedWhispers = [];
      try {
        const stored = localStorage.getItem('whispers');
        if (stored && stored !== '') {
          storedWhispers = JSON.parse(stored);
        }
        console.log(`Manual refresh: Found ${storedWhispers.length} whispers in localStorage`);
      } catch (storageError) {
        console.error('Error loading whispers from localStorage during manual refresh:', storageError);
      }
      
      // Merge API data with localStorage data
      const mergedWhispers = [...data];
      let addedFromStorage = 0;
      
      // Add stored whispers that aren't in the API response
      storedWhispers.forEach(storedWhisper => {
        // Check if this whisper is already in our merged array
        const exists = mergedWhispers.some(w => w.id === storedWhisper.id);
        if (!exists) {
          // Check if the whisper is still valid (not expired)
          const currentDate = new Date();
          let isValid = true;
          
          if (storedWhisper.expirationDate) {
            isValid = new Date(storedWhisper.expirationDate) > currentDate;
          } else if (storedWhisper.timestamp) {
            // Default 7-day expiration if no explicit expiration date
            const timestamp = new Date(storedWhisper.timestamp);
            const defaultExpiration = new Date(timestamp);
            defaultExpiration.setDate(defaultExpiration.getDate() + 7);
            isValid = defaultExpiration > currentDate;
          }
          
          // Always add valid whispers
          if (isValid) {
            // Mark as persistent
            storedWhisper.isPersistent = true;
            mergedWhispers.push(storedWhisper);
            addedFromStorage++;
          }
        }
      });
      
      console.log(`Manual refresh: Added ${addedFromStorage} valid whispers from localStorage`);
      
      // Sort by timestamp, newest first
      mergedWhispers.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      
      // Update state with merged whispers
      setWhispers(mergedWhispers);
      
      // Save to localStorage
      localStorage.setItem('whispers', JSON.stringify(mergedWhispers));
      console.log(`Manual refresh: Saved ${mergedWhispers.length} whispers to localStorage`);
      
      // Update last refresh time
      setLastRefreshTime(Date.now());
      
      setError('');
    } catch (error) {
      console.error('Error during manual refresh:', error);
      setError(`Failed to refresh: ${error.message}`);
      
      // Try to load from localStorage as fallback
      try {
        const storedWhispers = JSON.parse(localStorage.getItem('whispers') || '[]');
        if (storedWhispers.length > 0) {
          console.log(`Loaded ${storedWhispers.length} whispers from localStorage as fallback`);
          setWhispers(storedWhispers);
        }
      } catch (localStorageError) {
        console.error('Error loading from localStorage during fallback:', localStorageError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new whisper creation
  const handleNewWhisper = (newWhisper) => {
    console.log('New whisper created:', newWhisper);
    
    // Mark the whisper as persistent to ensure it's always loaded
    newWhisper.isPersistent = true;
    
    // Add the new whisper to the state
    setWhispers(prevWhispers => {
      // Check if this whisper already exists
      const exists = prevWhispers.some(w => w.id === newWhisper.id);
      if (exists) {
        console.log('Whisper already exists, not adding duplicate');
        return prevWhispers;
      }
      
      // Add the new whisper to the beginning of the array
      const updatedWhispers = [newWhisper, ...prevWhispers];
      
      // Save to localStorage for persistence
      localStorage.setItem('whispers', JSON.stringify(updatedWhispers));
      console.log(`Saved ${updatedWhispers.length} whispers to localStorage after adding new whisper`);
      
      return updatedWhispers;
    });
  };

  return (
    <div>
      <Head>
        <title>WhisperMap</title>
        <meta name="description" content="Location-based audio sharing" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <div className="relative overflow-hidden mb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 z-0"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Share Voice Moments on the Map
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8">
              Discover and create location-based audio messages around you.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Geo-Located</span>
              </div>
              
              <div className="flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>Voice Messages</span>
              </div>
              
              <div className="flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Social Discovery</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-16 left-0 right-0 h-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 transform -skew-y-3"></div>
      </div>
      
      {error && (
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Explore Whispers
                </h2>
              </div>
              {location ? (
                <LeafletMap 
                  location={location} 
                  whispers={whispers} 
                  detectionRange={detectionRange}
                  whisperRange={whisperRange}
                />
              ) : (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-12 text-center">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-sm max-w-md mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Waiting for location access...</h3>
                    <p className="text-gray-600 mb-4">
                      Please allow location access to see whispers on the map.
                    </p>
                    <p className="text-gray-500 text-sm">
                      You can still record and listen to whispers without location.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Distance Controls */}
            {location && (
              <DistanceControls
                detectionRange={detectionRange}
                setDetectionRange={setDetectionRange}
                whisperRange={whisperRange}
                setWhisperRange={setWhisperRange}
              />
            )}
          </div>
          
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Record Your Whisper
                </h2>
              </div>
              <div className="p-6">
                <AudioRecorder 
                  location={location} 
                  onWhisperUploaded={handleNewWhisper} 
                  whisperRange={whisperRange}
                />
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  Recent Whispers
                </h2>
              </div>
              <div className="p-6">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                    <p className="text-gray-500">Loading whispers...</p>
                    <p className="text-gray-400 text-sm mt-2">This should only take a moment</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8 bg-red-50 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-red-800 mb-2">{error}</h3>
                    <button 
                      onClick={performManualRefresh}
                      disabled={isLoading}
                      className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Refreshing...
                        </span>
                      ) : (
                        <span>Refresh Whispers Manually</span>
                      )}
                    </button>
                  </div>
                ) : whispers.length > 0 ? (
                  <WhisperList 
                    whispers={whispers} 
                    setWhispers={setWhispers} 
                    onAudioPlay={() => setIsPlayingAudio(true)}
                    onAudioStop={() => setIsPlayingAudio(false)}
                  />
                ) : (
                  <div className="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No whispers found</h3>
                    <p className="text-gray-600">
                      Be the first to record a whisper in this area!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PremiumFeatures user={user} />
        </div>
      </div>
      
      {/* How it works section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">How WhisperMap Works</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Share and discover voice messages tied to specific locations around you.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Record</h3>
            <p className="text-gray-600">Create voice messages and attach them to your current location.</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Discover</h3>
            <p className="text-gray-600">Explore the map to find voice messages left by others near you.</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Listen</h3>
            <p className="text-gray-600">Play voice messages and connect with the world around you.</p>
          </div>
        </div>
      </div>
    </div>
  )
}