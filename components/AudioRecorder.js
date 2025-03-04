import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';

export default function AudioRecorder({ location, onWhisperUploaded }) {
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
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  
  // Set isAnonymous based on user preferences when user data is available
  useEffect(() => {
    if (user && user.defaultAnonymous) {
      setIsAnonymous(user.defaultAnonymous);
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
  
  const uploadAudio = async (retryCount = 0) => {
    if (!audioURL || !location) {
      setError('No audio recorded or location not available');
      return;
    }
    
    try {
      console.log('Starting audio upload process...');
      setIsUploading(true);
      setError('');
      
      // Get the audio blob from the URL
      console.log('Fetching audio blob from URL...');
      const audioBlob = await fetch(audioURL).then(r => r.blob());
      console.log('Audio blob size:', audioBlob.size, 'bytes', 'Type:', audioBlob.type);
      
      // Check if the file is too large for Vercel (4.5MB limit for hobby plans)
      if (audioBlob.size > 4.5 * 1024 * 1024) {
        setError('Audio file is too large. Please record a shorter message.');
        setIsUploading(false);
        return;
      }
      
      // Create a new FormData instance
      const formData = new FormData();
      
      // Append the audio file with a specific filename and type
      formData.append('audio', new File([audioBlob], 'recording.wav', { type: 'audio/wav' }));
      
      // Append other data
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('category', category);
      formData.append('title', title || 'Untitled Whisper');
      formData.append('description', description || '');
      formData.append('timestamp', new Date().toISOString());
      formData.append('isAnonymous', isAnonymous.toString());
      
      // Add user ID to headers if available and not anonymous
      const headers = {};
      
      if (user && !isAnonymous) {
        headers['user-id'] = user.id;
        console.log('Adding user ID to headers:', user.id);
      }
      
      console.log('Request details:', {
        url: '/api/whispers',
        method: 'POST',
        formDataEntries: [...formData.entries()].map(entry => {
          // Don't log the actual file content, just its metadata
          if (entry[0] === 'audio' && entry[1] instanceof File) {
            return [entry[0], {
              name: entry[1].name,
              type: entry[1].type,
              size: entry[1].size
            }];
          }
          return entry;
        })
      });
      
      // Make the fetch request with proper Content-Type header omitted
      // This allows the browser to set the correct multipart/form-data boundary
      const response = await fetch('/api/whispers', {
        method: 'POST',
        headers,
        body: formData,
      });
      
      console.log('Response status:', response.status, 'Status text:', response.statusText);
      
      if (!response.ok) {
        let errorMessage = `Error uploading audio: Server responded with ${response.status}`;
        let responseText = '';
        
        try {
          responseText = await response.text();
          console.log('Error response text:', responseText);
          
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              if (errorData && errorData.error) {
                errorMessage = `Error uploading audio: ${errorData.error}`;
              }
            } catch (jsonError) {
              console.error('Error parsing JSON from error response:', jsonError);
            }
          }
        } catch (textError) {
          console.error('Error getting text from error response:', textError);
        }
        
        // If we get a 405 error, try the fallback endpoint
        if (response.status === 405) {
          console.error('405 Method Not Allowed error. Trying fallback endpoint...');
          
          try {
            console.log('Attempting upload to fallback endpoint: /api/upload-whisper');
            
            const fallbackResponse = await fetch('/api/upload-whisper', {
              method: 'POST',
              headers,
              body: formData,
            });
            
            console.log('Fallback response status:', fallbackResponse.status);
            
            if (!fallbackResponse.ok) {
              const fallbackText = await fallbackResponse.text();
              console.error('Fallback endpoint error:', fallbackText);
              throw new Error(`Fallback upload failed: ${fallbackResponse.status}`);
            }
            
            const data = await fallbackResponse.json();
            console.log('Whisper uploaded successfully via fallback:', data);
            
            // Reset state
            setAudioURL('');
            setUploadSuccess(true);
            setTitle('');
            setDescription('');
            setCategory('general');
            
            // Call the onWhisperUploaded callback if provided
            if (onWhisperUploaded && typeof onWhisperUploaded === 'function') {
              onWhisperUploaded(data);
            }
            
            // Clear success message after 3 seconds
            setTimeout(() => {
              setUploadSuccess(false);
            }, 3000);
          } catch (fallbackError) {
            console.error('Error uploading to fallback endpoint:', fallbackError);
            throw fallbackError;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Whisper uploaded successfully:', data);
      
      // Reset state
      setAudioURL('');
      setUploadSuccess(true);
      setTitle('');
      setDescription('');
      setCategory('general');
      
      // Call the onWhisperUploaded callback if provided
      if (onWhisperUploaded && typeof onWhisperUploaded === 'function') {
        onWhisperUploaded(data);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (err) {
      setError('Error uploading audio: ' + err.message);
      console.error('Error uploading audio:', err);
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
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100 animate-fadeIn">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Title <span className="text-gray-500 text-sm font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Give your whisper a title"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none transition-colors bg-white"
                >
                  <option value="general">General</option>
                  <option value="story">Story</option>
                  <option value="music">Music</option>
                  <option value="guide">Guide</option>
                  <option value="history">History</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Description <span className="text-gray-500 text-sm font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Add a short description about your whisper"
                rows="4"
              ></textarea>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <div>
              <p className="font-medium text-gray-800">Post Anonymously</p>
              <p className="text-sm text-gray-600">Your whisper won't be linked to your profile</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={isAnonymous}
                onChange={() => setIsAnonymous(!isAnonymous)}
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:shadow-sm after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
} 