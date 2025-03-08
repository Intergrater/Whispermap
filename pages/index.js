import React, { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import WhisperList from '../components/WhisperList'
import PremiumFeatures from '../components/PremiumFeatures'
import { useUser } from '../contexts/UserContext'

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
  // Track if we have an active whisper playing - this is crucial for preventing refresh loops
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  // Add refs to track refresh state
  const lastRefreshTimeRef = useRef(Date.now());
  const refreshTimeoutRef = useRef(null);
  const isRefreshingRef = useRef(false);
  // Add loading state tracking
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const { user, updateUser } = useUser()
  
  // Update loading state with timestamp
  useEffect(() => {
    if (isLoading) {
      setLoadingStartTime(Date.now());
    } else {
      setLoadingStartTime(null);
    }
  }, [isLoading]);
  
  // Function to force reset loading state
  const forceResetLoadingState = () => {
    console.log('Manually resetting loading state');
    isRefreshingRef.current = false;
    setIsLoading(false);
    setLoadingStartTime(null);
  };
  
  // Recovery button component for stuck loading states
  const LoadingRecoveryButton = () => {
    const [showButton, setShowButton] = useState(false);
    
    // Check if loading has been stuck for too long (8+ seconds)
    useEffect(() => {
      if (loadingStartTime && isLoading) {
        const checkTimeout = setTimeout(() => {
          const loadingDuration = Date.now() - loadingStartTime;
          if (loadingDuration > 8000) { // 8 seconds
            setShowButton(true);
          }
        }, 8000);
        
        return () => clearTimeout(checkTimeout);
      } else {
        setShowButton(false);
      }
    }, [loadingStartTime, isLoading]);
    
    if (!showButton) return null;
    
    return (
      <button
        onClick={forceResetLoadingState}
        className="fixed bottom-4 right-4 z-50 bg-red-500 text-white rounded-full p-3 shadow-lg flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cancel Loading
      </button>
    );
  };
  
  // Load whispers from localStorage on initial mount with Safari-specific handling
  useEffect(() => {
    try {
      // Function to safely parse localStorage
      const safelyParseLocalStorage = (key, defaultValue = []) => {
        try {
          const item = localStorage.getItem(key);
          if (!item) return defaultValue;
          return JSON.parse(item);
        } catch (parseError) {
          console.error(`Error parsing ${key} from localStorage:`, parseError);
          return defaultValue;
        }
      };
      
      const storedWhispers = safelyParseLocalStorage('whispers', []);
      
      if (storedWhispers.length > 0) {
        console.log(`Loaded ${storedWhispers.length} whispers from localStorage on initial mount`);
        setWhispers(storedWhispers);
      }
    } catch (error) {
      console.error('Error loading whispers from localStorage:', error);
    }
  }, []);
  
  // Helper function to add timeout to any promise
  const withTimeout = (promise, timeoutMs = 10000, operationName = 'operation') => {
    let timeoutId;
    
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    return Promise.race([
      promise,
      timeoutPromise
    ]).finally(() => {
      clearTimeout(timeoutId);
    });
  };

  // Fetch whispers from your API with improved mobile handling
  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    
    async function fetchWhispers() {
      // Prevent concurrent refreshes
      if (isRefreshingRef.current) {
        console.log('Already refreshing, skipping this cycle');
        return;
      }
      
      // Skip fetching if audio is playing
      if (isPlayingAudio) {
        console.log('Skipping whisper fetch because audio is playing');
        return;
      }
      
      // Enforce minimum time between refreshes (5 seconds)
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      if (timeSinceLastRefresh < 5000) {
        console.log(`Too soon to refresh (${timeSinceLastRefresh}ms), enforcing cooldown`);
        return;
      }
      
      try {
        isRefreshingRef.current = true;
        setIsLoading(true);
        
        // Your existing fetch logic with timeout protection
        let url = '/api/whispers';
        if (location) {
          const timestamp = Date.now();
          url = `/api/whispers?latitude=${location.lat}&longitude=${location.lng}&radius=${detectionRange}&_t=${timestamp}`;
          console.log(`Fetching whispers with detection range: ${detectionRange}m`);
        } else {
          console.log('Location not available, fetching all whispers');
        }
        
        console.log(`Fetching whispers from: ${url}`);
        
        try {
          // Use our timeout wrapper for the fetch operation
          const fetchOperation = async () => {
            const controller = new AbortController();
            const response = await fetch(url, { signal: controller.signal });
            
            if (!response.ok) {
              throw new Error(`Server responded with ${response.status}`);
            }
            
            return await response.json();
          };
          
          const data = await withTimeout(fetchOperation(), 15000, 'Whispers fetch');
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
              
              // Always add valid whispers that are marked as persistent
              if (isValid && (storedWhisper.isPersistent || !location)) {
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
          
          // Limit number of whispers on mobile for performance
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          const finalWhispers = isMobile && mergedWhispers.length > 20 
            ? mergedWhispers.slice(0, 20) 
            : mergedWhispers;
          
          if (isMobile && mergedWhispers.length > 20) {
            console.log(`Limited whispers from ${mergedWhispers.length} to 20 for mobile performance`);
          }
          
          // Store the whispers in state and localStorage
          setWhispers(finalWhispers);
          
          // Ensure we're storing the whispers with all necessary data
          try {
            localStorage.setItem('whispers', JSON.stringify(finalWhispers));
            console.log(`Saved ${finalWhispers.length} whispers to localStorage with complete data`);
            
            // Also save to sessionStorage as backup on mobile
            if (isMobile) {
              sessionStorage.setItem('whispers_backup', JSON.stringify(finalWhispers));
            }
          } catch (storageError) {
            console.error('Error saving to localStorage:', storageError);
          }
          
          setError('');
          lastRefreshTimeRef.current = Date.now();
        } catch (fetchError) {
          console.error('Error in fetch operation:', fetchError);
          throw fetchError;
        }
      } catch (error) {
        console.error('Error fetching whispers:', error);
        
        if (isMounted) {
          setError(`Failed to load whispers: ${error.message}`);
          
          // Try to load from localStorage as fallback
          try {
            const storedWhispers = JSON.parse(localStorage.getItem('whispers') || '[]');
            if (storedWhispers.length === 0) {
              // Try backup in sessionStorage
              const backupWhispers = JSON.parse(sessionStorage.getItem('whispers_backup') || '[]');
              if (backupWhispers.length > 0) {
                console.log(`Loaded ${backupWhispers.length} whispers from sessionStorage backup`);
                setWhispers(backupWhispers);
              }
            } else if (storedWhispers.length > 0) {
              console.log(`Loaded ${storedWhispers.length} whispers from localStorage as fallback`);
              setWhispers(storedWhispers);
            }
          } catch (localStorageError) {
            console.error('Error loading from localStorage:', localStorageError);
          }
        }
      } finally {
        isRefreshingRef.current = false;
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    // Initial fetch with delay for mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    if (isMobile) {
      // Delay initial fetch on mobile to let the UI stabilize
      setTimeout(fetchWhispers, 1000);
    } else {
      fetchWhispers();
    }
    
    // Set up polling with a more conservative approach for mobile
    const refreshInterval = isMobile ? 300000 : 60000; // 5 minutes on mobile, 1 minute on desktop
    console.log(`Setting refresh interval: ${refreshInterval/1000}s (${isMobile ? 'mobile' : 'desktop'})`);
    
    // Use setTimeout instead of setInterval for more control
    function scheduleNextRefresh() {
      if (!isMounted) return;
      
      refreshTimeoutRef.current = setTimeout(() => {
        fetchWhispers().finally(() => {
          if (isMounted) scheduleNextRefresh();
        });
      }, refreshInterval);
    }
    
    scheduleNextRefresh();
    
    // Handle visibility changes to pause/resume operations on mobile
    function handleVisibilityChange() {
      if (document.hidden) {
        console.log('App moved to background, pausing operations');
        // Pause any ongoing operations
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      } else {
        console.log('App returned to foreground, resuming operations');
        // Resume operations with a delay
        setTimeout(() => {
          if (isMounted) {
            fetchWhispers().finally(() => {
              if (isMounted) scheduleNextRefresh();
            });
          }
        }, 1000);
      }
    }
    
    if (isMobile) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    // Cleanup
    return () => {
      isMounted = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (isMobile) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [location, detectionRange, isPlayingAudio]);
  
  // Save whispers to localStorage whenever they change with Safari-specific handling
  useEffect(() => {
    if (whispers && whispers.length > 0) {
      try {
        localStorage.setItem('whispers', JSON.stringify(whispers));
        console.log(`Updated ${whispers.length} whispers in localStorage after state change`);
      } catch (error) {
        console.error('Error updating whispers in localStorage:', error);
      }
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

  // Get user's location
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      // Get initial location
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
          enableHighAccuracy: true,
          maximumAge: 30000, // 30 seconds
          timeout: 10000 // 10 seconds
        }
      );
      
      // Set up watch position for continuous updates
      const watchId = navigator.geolocation.watchPosition(
        position => {
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
          enableHighAccuracy: true,
          maximumAge: 30000, // 30 seconds
          timeout: 27000 // 27 seconds
        }
      );
      
      // Clean up watch position on component unmount
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } else if (typeof window !== 'undefined') {
      setError('Geolocation is not supported by your browser.');
    }
  }, []); // Remove location and isPlayingAudio dependencies to prevent re-renders

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

      {/* Recovery button for stuck loading states */}
      <LoadingRecoveryButton />

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
                      onClick={() => {
                        setError('');
                        setIsLoading(true);
                        
                        // Don't allow manual refresh if already refreshing
                        if (isRefreshingRef.current) {
                          console.log('Already refreshing, ignoring manual refresh request');
                          setIsLoading(false);
                          return;
                        }
                        
                        // Manually trigger a fetch with timeout protection
                        async function manualFetch() {
                          // Don't refresh if audio is playing
                          if (isPlayingAudio) {
                            console.log('Manual refresh: Skipping because audio is playing');
                            setIsLoading(false);
                            return;
                          }
                          
                          // Set a flag to prevent concurrent refreshes
                          isRefreshingRef.current = true;
                          
                          try {
                            const timestamp = Date.now();
                            let url = '/api/whispers';
                            if (location) {
                              url = `/api/whispers?latitude=${location.lat}&longitude=${location.lng}&radius=${detectionRange}&_t=${timestamp}`;
                            }
                            
                            console.log(`Manual refresh: Fetching from ${url}`);
                            
                            // Use timeout protection for the fetch
                            const fetchOperation = async () => {
                              const controller = new AbortController();
                              const response = await fetch(url, { signal: controller.signal });
                              
                              if (!response.ok) {
                                throw new Error(`Server responded with ${response.status}`);
                              }
                              
                              return await response.json();
                            };
                            
                            const data = await withTimeout(fetchOperation(), 15000, 'Manual whispers fetch');
                            console.log(`Manual refresh: Received ${data.length} whispers from API`);
                            
                            // Get whispers from localStorage to merge with API results
                            let storedWhispers = [];
                            try {
                              // Try to get from primary storage
                              const stored = localStorage.getItem('whispers');
                              if (stored && stored !== '') {
                                storedWhispers = JSON.parse(stored);
                              } else {
                                // Try to get from backup storage
                                const backup = sessionStorage.getItem('whispers_backup');
                                if (backup && backup !== '') {
                                  storedWhispers = JSON.parse(backup);
                                }
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
                                
                                // Always add valid whispers that are marked as persistent
                                if (isValid && (storedWhisper.isPersistent || !location)) {
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
                            
                            // Limit number of whispers on mobile for performance
                            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                            const finalWhispers = isMobile && mergedWhispers.length > 20 
                              ? mergedWhispers.slice(0, 20) 
                              : mergedWhispers;
                            
                            if (isMobile && mergedWhispers.length > 20) {
                              console.log(`Limited whispers from ${mergedWhispers.length} to 20 for mobile performance`);
                            }
                            
                            // Update state with merged whispers
                            setWhispers(finalWhispers);
                            
                            // Save to localStorage
                            try {
                              localStorage.setItem('whispers', JSON.stringify(finalWhispers));
                              console.log(`Manual refresh: Saved ${finalWhispers.length} whispers to localStorage`);
                              
                              // Also save to sessionStorage as backup on mobile
                              if (isMobile) {
                                sessionStorage.setItem('whispers_backup', JSON.stringify(finalWhispers));
                              }
                            } catch (saveError) {
                              console.error('Error saving whispers to localStorage during manual refresh:', saveError);
                            }
                            
                            setError('');
                            lastRefreshTimeRef.current = Date.now();
                          } catch (error) {
                            console.error('Error during manual refresh:', error);
                            setError(`Failed to refresh: ${error.message}`);
                            
                            // Try to load from localStorage as fallback
                            try {
                              const storedWhispers = JSON.parse(localStorage.getItem('whispers') || '[]');
                              if (storedWhispers.length === 0) {
                                // Try backup in sessionStorage
                                const backupWhispers = JSON.parse(sessionStorage.getItem('whispers_backup') || '[]');
                                if (backupWhispers.length > 0) {
                                  console.log(`Loaded ${backupWhispers.length} whispers from sessionStorage backup during manual refresh`);
                                  setWhispers(backupWhispers);
                                }
                              } else if (storedWhispers.length > 0) {
                                console.log(`Loaded ${storedWhispers.length} whispers from localStorage as fallback during manual refresh`);
                                setWhispers(storedWhispers);
                              }
                            } catch (localStorageError) {
                              console.error('Error loading from localStorage during manual refresh fallback:', localStorageError);
                            }
                          } finally {
                            isRefreshingRef.current = false;
                            setIsLoading(false);
                          }
                        }
                        
                        // Set a timeout to ensure loading state is cleared even if something goes wrong
                        const safetyTimeoutId = setTimeout(() => {
                          if (isRefreshingRef.current) {
                            console.log('Manual refresh safety timeout reached, resetting state');
                            isRefreshingRef.current = false;
                            setIsLoading(false);
                          }
                        }, 20000); // 20 second safety timeout
                        
                        manualFetch().finally(() => {
                          clearTimeout(safetyTimeoutId);
                        });
                      }}
                      className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                    >
                      Try Again
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