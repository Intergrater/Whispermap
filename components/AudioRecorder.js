import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';

export default function AudioRecorder({ location, onWhisperUploaded, whisperRange }) {
  const { user } = useUser();
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [category, setCategory] = useState('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7); // Default to 7 days for free users
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  
  // Get current theme from localStorage
  const [currentTheme, setCurrentTheme] = useState('default');
  
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
          container: 'bg-gray-800 border-gray-700',
          text: 'text-white',
          textMuted: 'text-gray-300',
          inputBg: 'bg-gray-700',
          inputBorder: 'border-gray-600',
          inputText: 'text-white',
          inputPlaceholder: 'placeholder-gray-400',
          inputFocus: 'focus:ring-cyan-500 focus:border-cyan-500',
          selectBg: 'bg-gray-700',
          selectText: 'text-white',
          cardBg: 'bg-gray-700',
          cardBorder: 'border-gray-600',
          buttonPrimary: 'bg-gradient-to-r from-cyan-500 to-blue-600',
          buttonSecondary: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        };
      case 'sunset':
        return {
          container: 'bg-amber-50 border-amber-200',
          text: 'text-amber-900',
          textMuted: 'text-amber-700',
          inputBg: 'bg-white',
          inputBorder: 'border-amber-300',
          inputText: 'text-amber-900',
          inputPlaceholder: 'placeholder-amber-400',
          inputFocus: 'focus:ring-amber-500 focus:border-amber-500',
          selectBg: 'bg-white',
          selectText: 'text-amber-900',
          cardBg: 'bg-white',
          cardBorder: 'border-amber-200',
          buttonPrimary: 'bg-gradient-to-r from-amber-500 to-orange-600',
          buttonSecondary: 'bg-amber-100 text-amber-800 hover:bg-amber-200'
        };
      case 'ocean':
        return {
          container: 'bg-blue-50 border-blue-200',
          text: 'text-blue-900',
          textMuted: 'text-blue-700',
          inputBg: 'bg-white',
          inputBorder: 'border-blue-300',
          inputText: 'text-blue-900',
          inputPlaceholder: 'placeholder-blue-400',
          inputFocus: 'focus:ring-blue-500 focus:border-blue-500',
          selectBg: 'bg-white',
          selectText: 'text-blue-900',
          cardBg: 'bg-white',
          cardBorder: 'border-blue-200',
          buttonPrimary: 'bg-gradient-to-r from-blue-500 to-teal-600',
          buttonSecondary: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
        };
      default:
        return {
          container: 'bg-white border-gray-100',
          text: 'text-gray-800',
          textMuted: 'text-gray-600',
          inputBg: 'bg-white',
          inputBorder: 'border-gray-300',
          inputText: 'text-gray-900',
          inputPlaceholder: 'placeholder-gray-400',
          inputFocus: 'focus:ring-indigo-500 focus:border-indigo-500',
          selectBg: 'bg-white',
          selectText: 'text-gray-900',
          cardBg: 'bg-white',
          cardBorder: 'border-gray-100',
          buttonPrimary: 'bg-gradient-to-r from-indigo-500 to-purple-600',
          buttonSecondary: 'bg-white text-gray-700 hover:bg-gray-100'
        };
    }
  };
  
  const themeClasses = getThemeClasses();
  
  // Set isAnonymous based on user preferences when user data is available
  useEffect(() => {
    if (user && user.defaultAnonymous) {
      setIsAnonymous(user.defaultAnonymous);
    }
  }, [user]);
  
  // Set expiration days based on user premium status
  useEffect(() => {
    if (user && user.isPremium) {
      setExpirationDays(90); // 90 days for premium users
    } else {
      setExpirationDays(7); // 7 days for free users
    }
  }, [user]);
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      // Set max recording time based on user status
      const maxRecordingTime = user && user.isPremium ? 300 : 60; // 5 minutes for premium, 1 minute for free
      
      // Set up audio analyzer to visualize audio levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      // Start timer for recording duration
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxRecordingTime) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
        
        // Update audio level visualization
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
          setAudioLevel(average);
        }
      }, 1000);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setAudioLevel(0);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError('');
      setUploadSuccess(false);
    } catch (err) {
      setError('Error accessing microphone: ' + err.message);
      console.error('Error accessing microphone:', err);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  const saveAudio = async (audioBlob) => {
    try {
      // Generate a unique ID for the audio
      const audioId = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Initialize IndexedDB
      const db = await initDB();
      
      // Store the audio in IndexedDB
      await db.put('audio', {
        id: audioId,
        blob: audioBlob,
        timestamp: new Date().toISOString()
      });
      
      console.log('Audio saved to IndexedDB with ID:', audioId);
      return audioId;
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
      throw error;
    }
  };
  
  const uploadAudio = async () => {
    if (!audioURL || !location) {
      setError('No audio recorded or location not available');
      return;
    }

    try {
      console.log('Starting audio upload process...');
      setIsUploading(true);
      setError('');

      // Get the audio blob from the existing audioURL
      const audioBlob = await fetch(audioURL).then(r => r.blob());
      console.log('Audio blob size:', audioBlob.size, 'bytes');

      // Try to save to IndexedDB first
      let clientAudioId = null;
      try {
        clientAudioId = await saveAudio(audioBlob);
        console.log('Audio saved with ID:', clientAudioId, 'using client storage');
      } catch (dbError) {
        console.error('Error saving to IndexedDB:', dbError);
      }

      // Create a new FormData instance
      const formData = new FormData();
      formData.append('audio', new File([audioBlob], 'recording.wav', { type: 'audio/wav' }));
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('category', category);
      formData.append('title', title || 'Untitled Whisper');
      formData.append('description', description || '');
      formData.append('timestamp', new Date().toISOString());
      formData.append('expirationDays', expirationDays.toString());
      formData.append('isAnonymous', isAnonymous.toString());
      if (clientAudioId) {
        formData.append('clientAudioId', clientAudioId);
      }

      // If not anonymous, add user profile data
      if (!isAnonymous && user) {
        formData.append('userId', user.id || '');
        formData.append('userName', user.displayName || user.name || '');
        formData.append('userProfileImage', user.profileImage || '');
      }

      // Implement retry logic with exponential backoff
      const maxRetries = 3;
      const baseDelay = 2000; // 2 seconds
      let lastError = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Upload attempt ${attempt} of ${maxRetries}`);
          
          // Set a timeout for the fetch request
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const response = await fetch('/api/whispers', {
            method: 'POST',
            headers: user && !isAnonymous ? { 'user-id': user.id } : {},
            body: formData,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
          }

          const data = await response.json();
          console.log('Whisper uploaded successfully:', data);

          // Reset local state
          setAudioURL('');
          setTitle('');
          setDescription('');
          setCategory('general');
          setUploadSuccess(true);

          if (onWhisperUploaded) {
            onWhisperUploaded(data);
          }

          setTimeout(() => setUploadSuccess(false), 3000);
          return;
        } catch (error) {
          lastError = error;
          console.error(`Upload attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
    } catch (error) {
      console.error('Error uploading whisper:', error);
      setError('Failed to upload whisper: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };
  
  const playAudio = () => {
    const audio = new Audio(audioURL);
    audio.play();
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  return (
    <div className={`${themeClasses.container} rounded-xl shadow-lg p-6 mb-8 border animate-fadeIn`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Record a Whisper</h2>
        {user && user.isPremium && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
            </svg>
            Premium
          </span>
        )}
      </div>
      
      <div className="flex flex-col space-y-6">
        {isRecording && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-gray-700 font-medium">Recording your whisper...</span>
              </div>
              <span className="text-indigo-600 font-bold bg-white px-3 py-1 rounded-full shadow-sm">
                {formatTime(recordingTime)}
              </span>
            </div>
            <div className="h-10 bg-white rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 flex items-center justify-end pr-2"
                style={{ width: `${Math.min(100, (audioLevel / 255) * 100)}%` }}
              >
                {audioLevel > 50 && (
                  <div className="text-white text-xs font-bold">
                    {Math.round((audioLevel / 255) * 100)}%
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {user && user.isPremium 
                ? "Premium users can record up to 5 minutes" 
                : "Free users can record up to 1 minute"}
            </p>
          </div>
        )}
        
        <div className="flex justify-center">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isUploading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-full flex items-center shadow-lg transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-4 px-8 rounded-full flex items-center shadow-lg transform transition-all duration-300 hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              Stop Recording
            </button>
          )}
        </div>
        
        {audioURL && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 animate-fadeIn">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">Your Whisper is Ready!</h3>
            </div>
            
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={playAudio}
                className="bg-white hover:bg-indigo-50 text-indigo-600 font-bold py-3 px-6 rounded-full flex items-center transition-colors border border-indigo-200 shadow-sm hover:shadow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Preview Audio
              </button>
              
              <button
                onClick={uploadAudio}
                disabled={isUploading}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-full flex items-center transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading Whisper...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                    </svg>
                    Share Your Whisper
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            <div className="flex">
              <svg className="h-6 w-6 text-red-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {uploadSuccess && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
            <div className="flex">
              <svg className="h-6 w-6 text-green-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Whisper uploaded successfully!</span>
            </div>
          </div>
        )}
        
        {!location && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Location Required</h3>
                <div className="mt-1 text-sm text-yellow-700">
                  Waiting for location access. Whispers are tied to your current location so others nearby can discover them.
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!isRecording && !audioURL && (
          <div className="space-y-4">
            <div>
              <label htmlFor="category" className={`block text-sm font-medium ${themeClasses.text} mb-1`}>
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-3 py-2 border ${themeClasses.inputBorder} rounded-md shadow-sm ${themeClasses.selectBg} ${themeClasses.selectText} ${themeClasses.inputFocus} focus:outline-none`}
              >
                <option value="general">General</option>
                <option value="story">Story</option>
                <option value="music">Music</option>
                <option value="information">Information</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="title" className={`block text-sm font-medium ${themeClasses.text} mb-1`}>
                Title (optional)
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your whisper a title"
                className={`w-full px-3 py-2 border ${themeClasses.inputBorder} rounded-md shadow-sm ${themeClasses.inputBg} ${themeClasses.inputText} ${themeClasses.inputPlaceholder} ${themeClasses.inputFocus} focus:outline-none`}
              />
            </div>
            
            <div>
              <label htmlFor="description" className={`block text-sm font-medium ${themeClasses.text} mb-1`}>
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a short description"
                rows="3"
                className={`w-full px-3 py-2 border ${themeClasses.inputBorder} rounded-md shadow-sm ${themeClasses.inputBg} ${themeClasses.inputText} ${themeClasses.inputPlaceholder} ${themeClasses.inputFocus} focus:outline-none`}
              ></textarea>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <input
                  id="anonymous"
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className={`h-4 w-4 ${themeClasses.inputBorder} rounded ${themeClasses.inputFocus}`}
                />
                <label htmlFor="anonymous" className={`ml-2 block text-sm ${themeClasses.text}`}>
                  Post anonymously
                </label>
              </div>
              
              <div className="flex items-center">
                <label htmlFor="expiration" className={`block text-sm ${themeClasses.text} mr-2`}>
                  Expires in:
                </label>
                <select
                  id="expiration"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value))}
                  className={`px-2 py-1 border ${themeClasses.inputBorder} rounded-md shadow-sm ${themeClasses.selectBg} ${themeClasses.selectText} ${themeClasses.inputFocus} focus:outline-none text-sm`}
                  disabled={!user || !user.isPremium}
                >
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  {user && user.isPremium && (
                    <>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Update the initDB function
const initDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('whispermap-audio', 1);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create audio store if it doesn't exist
      if (!db.objectStoreNames.contains('audio')) {
        const audioStore = db.createObjectStore('audio', { keyPath: 'id' });
        audioStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('Created audio store in IndexedDB');
      }
    };
  });
}; 