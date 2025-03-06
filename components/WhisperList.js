import React, { useState, useEffect } from 'react';

export default function WhisperList({ whispers, setWhispers }) {
  const [playingId, setPlayingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Clean up audio elements when component unmounts
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.remove();
      }
    };
  }, [currentAudio]);
  
  useEffect(() => {
    // Load whispers from localStorage
    const storedWhispers = JSON.parse(localStorage.getItem('whispers') || '[]');
    if (storedWhispers.length > 0) {
      // If you have a setWhispers function from props, use it
      // Otherwise, you might need to modify this based on your component structure
      if (typeof setWhispers === 'function') {
        setWhispers(storedWhispers);
      }
    }
  }, []);
  
  const playAudio = (whisper) => {
    setIsLoading(true);
    
    // Stop any currently playing audio
    if (playingId) {
      const oldAudio = document.getElementById(`audio-${playingId}`);
      if (oldAudio) {
        oldAudio.pause();
        oldAudio.currentTime = 0;
      }
    }
    
    // Create or get audio element
    let audio = document.getElementById(`audio-${whisper.id}`);
    if (!audio) {
      audio = new Audio();
      audio.id = `audio-${whisper.id}`;
      
      // Handle different URL formats (Blob Storage URLs will be https://...)
      if (whisper.audioUrl.startsWith('data:')) {
        // It's a data URI, use it directly
        audio.src = whisper.audioUrl;
      } else if (whisper.audioUrl.startsWith('http')) {
        // It's a remote URL (like Vercel Blob Storage)
        audio.src = whisper.audioUrl;
        audio.crossOrigin = "anonymous"; // Add this for CORS support
      } else {
        // It's a local path, prepend the base URL if needed
        audio.src = whisper.audioUrl.startsWith('/') ? whisper.audioUrl : `/${whisper.audioUrl}`;
      }
      
      document.body.appendChild(audio);
      
      // Set up event listeners
      audio.addEventListener('ended', () => {
        console.log(`Audio playback ended for whisper ${whisper.id}`);
        setPlayingId(null);
        setAudioProgress(0);
        // Don't remove the audio element from the DOM to prevent whisper disappearance
      });
      
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      });
      
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
        setIsLoading(false);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Error loading audio:', e);
        setIsLoading(false);
        setPlayingId(null);
      });
    }
    
    setCurrentAudio(audio);
    
    // Play the audio
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setIsLoading(false);
    });
    
    setPlayingId(whisper.id);
  };
  
  const pauseAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setPlayingId(null);
    }
  };
  
  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Filter the whispers
  const filteredWhispers = filter === 'all' 
    ? whispers 
    : whispers.filter(whisper => whisper.category === filter);
  
  // Categories for filter buttons
  const categories = [
    { id: 'all', name: 'All Whispers' },
    { id: 'story', name: 'Stories' },
    { id: 'general', name: 'General' },
    { id: 'tip', name: 'Tips' },
    { id: 'music', name: 'Music' },
    { id: 'guide', name: 'Guides' },
    { id: 'history', name: 'History' }
  ];
  
  // Find unique categories in the whispers
  const uniqueCategories = [...new Set(whispers.map(w => w.category))];
  const filteredCategories = categories.filter(c => 
    c.id === 'all' || uniqueCategories.includes(c.id)
  );
  
  // Calculate days remaining until expiration
  const getDaysRemaining = (whisper) => {
    if (!whisper.expirationDate && !whisper.timestamp) return null;
    
    // If whisper has an expiration date, use it
    let expirationDate;
    if (whisper.expirationDate) {
      expirationDate = new Date(whisper.expirationDate);
    } else {
      // Otherwise, calculate based on timestamp (default 7 days)
      expirationDate = new Date(whisper.timestamp);
      expirationDate.setDate(expirationDate.getDate() + 7);
    }
    
    const now = new Date();
    const diffTime = expirationDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };
  
  // Format expiration message
  const formatExpiration = (whisper) => {
    const daysRemaining = getDaysRemaining(whisper);
    
    if (daysRemaining === null) return '';
    
    if (daysRemaining === 0) {
      return 'Expires today';
    } else if (daysRemaining === 1) {
      return 'Expires tomorrow';
    } else {
      return `Expires in ${daysRemaining} days`;
    }
  };
  
  if (!whispers || whispers.length === 0) {
    return (
      <div className="rounded-xl overflow-hidden animate-fadeIn">
        <div className="text-center py-16 bg-gradient-to-br from-indigo-50 to-purple-50 px-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-lg max-w-md mx-auto border border-indigo-100">
            <div className="w-24 h-24 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No whispers found nearby</h3>
            <p className="text-gray-600 mb-6">
              Be the first to leave a voice message in this area! Share your story, tip, or experience.
            </p>
            <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all transform hover:scale-105">
              Record Your First Whisper
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 sticky top-0 z-10 bg-white/80 backdrop-blur-sm pt-2 pb-3 px-2 -mx-2 rounded-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-3">Discover Whispers</h2>
        <div className="overflow-x-auto pb-1 -mx-2 px-2">
          <div className="flex items-center gap-2 min-w-max">
            {filteredCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setFilter(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  filter === category.id 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md transform scale-105' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredWhispers.map((whisper, index) => (
          <div 
            key={whisper.id} 
            className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 border border-gray-100 ${
              playingId === whisper.id 
                ? 'ring-2 ring-indigo-500 transform scale-[1.02] shadow-md' 
                : 'hover:shadow-md hover:border-indigo-200'
            } animate-fadeIn`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-shrink-0">
                  <div 
                    onClick={() => playingId === whisper.id ? pauseAudio() : playAudio(whisper)}
                    className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                      playingId === whisper.id 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg' 
                        : 'bg-gradient-to-r from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200'
                    }`}
                  >
                    {isLoading && playingId === whisper.id ? (
                      <div className="animate-spin h-8 w-8 border-4 border-indigo-100 rounded-full border-t-transparent"></div>
                    ) : playingId === whisper.id ? (
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full animate-ping bg-white opacity-30"></div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {whisper.title && (
                      <h3 className="text-base font-bold text-gray-800">{whisper.title}</h3>
                    )}
                    {whisper.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {whisper.category}
                      </span>
                    )}
                    {whisper.isAnonymous && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Anonymous
                      </span>
                    )}
                  </div>
                  
                  {whisper.description && (
                    <p className="text-sm text-gray-600 mb-2">{whisper.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center text-xs text-gray-500 gap-3">
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(whisper.timestamp).toLocaleString()}
                    </span>
                    
                    {whisper.location && (
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Nearby
                      </span>
                    )}
                    
                    {/* Expiration date */}
                    <span className={`flex items-center ${getDaysRemaining(whisper) <= 1 ? 'text-amber-600' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {formatExpiration(whisper)}
                    </span>
                  </div>
                </div>
              </div>
              
              {playingId === whisper.id && (
                <div className="mt-4">
                  <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-100"
                      style={{ width: `${audioProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{formatTime(currentAudio?.currentTime)}</span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 