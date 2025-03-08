import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';

export default function WhisperList({ whispers, setWhispers }) {
  const [playingId, setPlayingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [replyAudioURL, setReplyAudioURL] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentTheme, setCurrentTheme] = useState('default');
  const { user } = useUser();
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  
  // Get current theme from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('whispermap_theme') || 'default';
      setCurrentTheme(savedTheme);
    }
  }, []);
  
  // Get theme-specific classes
  const getThemeClasses = () => {
    switch (currentTheme) {
      case 'cyberpunk':
        return {
          cardBg: 'bg-gray-800',
          textColor: 'text-white',
          textMuted: 'text-gray-300',
          buttonPrimary: 'bg-gradient-to-r from-cyan-500 to-blue-600',
          buttonSecondary: 'bg-gray-700 text-gray-300 hover:bg-gray-600',
          filterActive: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md transform scale-105',
          filterInactive: 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 hover:border-gray-500',
          headerBg: 'bg-gray-800/80 backdrop-blur-sm'
        };
      case 'sunset':
        return {
          cardBg: 'bg-amber-50',
          textColor: 'text-amber-900',
          textMuted: 'text-amber-700',
          buttonPrimary: 'bg-gradient-to-r from-amber-500 to-orange-600',
          buttonSecondary: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
          filterActive: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md transform scale-105',
          filterInactive: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 hover:border-amber-300',
          headerBg: 'bg-amber-50/80 backdrop-blur-sm'
        };
      case 'ocean':
        return {
          cardBg: 'bg-blue-50',
          textColor: 'text-blue-900',
          textMuted: 'text-blue-700',
          buttonPrimary: 'bg-gradient-to-r from-blue-500 to-teal-600',
          buttonSecondary: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
          filterActive: 'bg-gradient-to-r from-blue-500 to-teal-600 text-white shadow-md transform scale-105',
          filterInactive: 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 hover:border-blue-300',
          headerBg: 'bg-blue-50/80 backdrop-blur-sm'
        };
      default:
        return {
          cardBg: 'bg-white',
          textColor: 'text-gray-800',
          textMuted: 'text-gray-600',
          buttonPrimary: 'bg-gradient-to-r from-indigo-600 to-purple-600',
          buttonSecondary: 'bg-white text-gray-700 hover:bg-gray-100',
          filterActive: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md transform scale-105',
          filterInactive: 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-gray-300',
          headerBg: 'bg-white/80 backdrop-blur-sm'
        };
    }
  };
  
  const themeClasses = getThemeClasses();
  
  // Ensure audio elements are properly cleaned up
  useEffect(() => {
    // Clean up function to handle component unmount or whispers change
    return () => {
      // Clean up any playing audio when whispers change
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.setAttribute('data-playing', 'false');
      }
      
      // Remove any orphaned audio elements
      document.querySelectorAll('audio[id^="audio-"]').forEach(audioElement => {
        if (!whispers.some(w => `audio-${w.id}` === audioElement.id)) {
          audioElement.remove();
        }
      });
    };
  }, [whispers]);
  
  // Save whispers to localStorage whenever they change
  useEffect(() => {
    if (whispers && whispers.length > 0) {
      localStorage.setItem('whispers', JSON.stringify(whispers));
      console.log(`Saved ${whispers.length} whispers to localStorage from WhisperList`);
    }
  }, [whispers]);
  
  const playAudio = (whisper) => {
    // Prevent multiple rapid clicks
    if (isLoading) return;
    
    setIsLoading(true);
    
    // Stop any currently playing audio
    if (playingId) {
      const oldAudio = document.getElementById(`audio-${playingId}`);
      if (oldAudio) {
        oldAudio.pause();
        oldAudio.currentTime = 0;
        oldAudio.setAttribute('data-playing', 'false');
      }
    }
    
    // Create or get audio element
    let audio = document.getElementById(`audio-${whisper.id}`);
    if (!audio) {
      audio = new Audio();
      audio.id = `audio-${whisper.id}`;
      
      // Preload metadata only to improve performance
      audio.preload = "metadata";
      
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
      
      // Add to document but keep hidden
      audio.style.display = 'none';
      document.body.appendChild(audio);
      
      // Set up event listeners
      audio.addEventListener('ended', () => {
        console.log(`Audio playback ended for whisper ${whisper.id}`);
        setPlayingId(null);
        setAudioProgress(0);
        audio.setAttribute('data-playing', 'false');
        setIsLoading(false);
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
        audio.setAttribute('data-playing', 'false');
      });
      
      // Add a canplaythrough event to ensure audio is ready before playing
      audio.addEventListener('canplaythrough', () => {
        setIsLoading(false);
      });
    }
    
    setCurrentAudio(audio);
    
    // Play the audio with a small delay to ensure UI responsiveness
    setTimeout(() => {
      audio.play().then(() => {
        audio.setAttribute('data-playing', 'true');
      }).catch(err => {
        console.error('Error playing audio:', err);
        setIsLoading(false);
        audio.setAttribute('data-playing', 'false');
      });
    }, 100);
    
    setPlayingId(whisper.id);
  };
  
  const pauseAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.setAttribute('data-playing', 'false');
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
  
  // Function to handle replying to a whisper
  const handleReply = (whisperId) => {
    if (!user) {
      alert('Please sign in to reply to whispers');
      return;
    }
    
    setReplyingTo(whisperId);
    setReplyAudioURL('');
    setIsRecording(false);
    setRecordingTime(0);
  };
  
  // Start recording a reply
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for visualizer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up timer for recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime(prevTime => {
          // Update audio level for visualizer
          if (analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
            setAudioLevel(average / 128); // Normalize to 0-1 range
          }
          
          return prevTime + 1;
        });
      }, 1000);
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop event
      mediaRecorder.onstop = () => {
        clearInterval(timerRef.current);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setReplyAudioURL(audioUrl);
        
        // Stop all audio tracks
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check your permissions.');
    }
  };
  
  // Stop recording a reply
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Play recorded reply audio
  const playReplyAudio = () => {
    const audio = new Audio(replyAudioURL);
    audio.play();
  };
  
  // Function to submit a whisper reply
  const submitReply = async (parentWhisper) => {
    if (!replyAudioURL) {
      alert('Please record an audio reply first');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get the audio blob from the existing audioURL
      const audioBlob = await fetch(replyAudioURL).then(r => r.blob());
      
      // Create a FormData instance
      const formData = new FormData();
      
      // Append the audio file
      formData.append('audio', new File([audioBlob], 'reply.wav', { type: 'audio/wav' }));
      
      // Get current location
      let location;
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000, // 10 second timeout
            maximumAge: 60000 // Accept positions up to 1 minute old
          });
        });
        
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } catch (geoError) {
        console.error('Geolocation error:', geoError);
        // Use a fallback location or the parent whisper's location
        location = parentWhisper.location || { lat: 0, lng: 0 };
      }
      
      // Append other data
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('category', parentWhisper.category || 'general');
      formData.append('title', `Reply to: ${parentWhisper.title || 'Untitled Whisper'}`);
      formData.append('description', `Reply to whisper #${parentWhisper.id}`);
      formData.append('timestamp', new Date().toISOString());
      formData.append('parentId', parentWhisper.id);
      formData.append('isReply', 'true');
      formData.append('isAnonymous', 'false');
      
      // Add user data
      if (user) {
        formData.append('userId', user.id);
        formData.append('userName', user.displayName || user.name);
        formData.append('userProfileImage', user.profileImage || '');
      }
      
      // Set a timeout to prevent indefinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 15000)
      );
      
      // Send POST request to /api/whispers with timeout
      const response = await Promise.race([
        fetch('/api/whispers', {
          method: 'POST',
          body: formData,
        }),
        timeoutPromise
      ]);
      
      if (!response.ok) {
        throw new Error('Server responded with ' + response.status);
      }
      
      const newWhisper = await response.json();
      
      // Add the new whisper to the list
      setWhispers(prevWhispers => [newWhisper, ...prevWhispers]);
      
      // Reset state
      setReplyingTo(null);
      setReplyAudioURL('');
      setIsLoading(false);
      
      // Show success message
      alert('Reply sent successfully!');
      
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Failed to send reply. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Function to cancel replying
  const cancelReply = () => {
    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Reset state
    setReplyingTo(null);
    setReplyAudioURL('');
    setIsRecording(false);
    setRecordingTime(0);
  };
  
  // Format recording time
  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
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
      <div className={`mb-6 sticky top-0 z-10 ${themeClasses.headerBg} pt-2 pb-3 px-2 -mx-2 rounded-lg`}>
        <h2 className={`text-lg font-bold ${themeClasses.textColor} mb-3`}>Discover Whispers</h2>
        <div className="overflow-x-auto pb-1 -mx-2 px-2">
          <div className="flex items-center gap-2 min-w-max">
            {filteredCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setFilter(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  filter === category.id 
                    ? themeClasses.filterActive
                    : themeClasses.filterInactive
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
            className={`${themeClasses.cardBg} rounded-xl shadow-sm overflow-hidden transition-all duration-300 border border-gray-100 ${
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
                    {whisper.title ? (
                      <h3 className={`text-base font-bold ${themeClasses.textColor}`}>{whisper.title}</h3>
                    ) : (
                      <h3 className={`text-base font-bold ${themeClasses.textColor}`}>Untitled Whisper</h3>
                    )}
                    {whisper.category && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        currentTheme === 'cyberpunk' 
                          ? 'bg-cyan-900 text-cyan-200' 
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {whisper.category}
                      </span>
                    )}
                    {whisper.isAnonymous ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Anonymous
                      </span>
                    ) : whisper.userName ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {whisper.userProfileImage ? (
                          <img 
                            src={whisper.userProfileImage} 
                            alt={whisper.userName} 
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                        {whisper.userName}
                      </span>
                    ) : null}
                  </div>
                  
                  {whisper.description && whisper.description.length > 0 ? (
                    <p className="text-sm text-gray-600 mb-2">{whisper.description}</p>
                  ) : null}
                  
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
              
              {/* Reply button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleReply(whisper.id)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Reply
                </button>
              </div>
              
              {/* Reply form */}
              {replyingTo === whisper.id && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Reply to this whisper</h4>
                  
                  {isRecording ? (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                          <span className="text-sm text-gray-700">Recording... {formatRecordingTime(recordingTime)}</span>
                        </div>
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden w-1/2">
                          <div 
                            className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-100"
                            style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <button
                        onClick={stopRecording}
                        className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                        Stop Recording
                      </button>
                    </div>
                  ) : replyAudioURL ? (
                    <div className="mb-4">
                      <div className="bg-white p-3 rounded-md border border-gray-200 mb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Your Reply</span>
                          <button
                            onClick={playReplyAudio}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setReplyAudioURL('');
                            startRecording();
                          }}
                          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                          disabled={isLoading}
                        >
                          Record Again
                        </button>
                        <button
                          onClick={() => submitReply(whisper)}
                          className={`flex-1 py-2 ${
                            isLoading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          } text-white rounded-md transition-colors`}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending...
                            </span>
                          ) : 'Send Reply'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <button
                        onClick={startRecording}
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-md hover:from-indigo-600 hover:to-purple-700 transition-colors flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                        Record Audio Reply
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      onClick={cancelReply}
                      className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 text-sm hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Display existing replies */}
              {whisper.replies && whisper.replies.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Replies ({whisper.replies.length})</h4>
                  <div className="space-y-3">
                    {whisper.replies.map(reply => (
                      <div key={reply.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center mb-1">
                          {reply.userProfileImage ? (
                            <img 
                              src={reply.userProfileImage} 
                              alt={reply.userName} 
                              className="w-5 h-5 rounded-full mr-2 object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                          <span className="text-xs font-medium text-gray-700">{reply.userName}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(reply.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{reply.text}</p>
                      </div>
                    ))}
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