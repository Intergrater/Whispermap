import React, { useState } from 'react';

export default function WhisperList({ whispers }) {
  const [playingId, setPlayingId] = useState(null);
  const [filter, setFilter] = useState('all');
  
  const playAudio = (whisper) => {
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
      
      // Check if the URL is a data URI or a regular URL
      if (whisper.audioUrl.startsWith('data:')) {
        // It's a data URI, use it directly
        audio.src = whisper.audioUrl;
      } else {
        // It's a regular URL, use it as is
        audio.src = whisper.audioUrl;
      }
      
      document.body.appendChild(audio);
      
      audio.addEventListener('ended', () => {
        setPlayingId(null);
      });
    }
    
    // Play the audio
    audio.play();
    setPlayingId(whisper.id);
  };
  
  // Filter the whispers
  const filteredWhispers = filter === 'all' 
    ? whispers 
    : whispers.filter(whisper => whisper.category === filter);
  
  if (!whispers || whispers.length === 0) {
    return (
      <div className="rounded-xl overflow-hidden">
        <div className="text-center py-12 bg-gradient-to-br from-indigo-50 to-purple-50 px-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-sm max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No whispers found nearby</h3>
            <p className="text-gray-600 mb-4">
              Be the first to leave a voice message in this area!
            </p>
            <p className="text-gray-500 text-sm">
              Record your first whisper to get started.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === 'all' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Whispers
            </button>
            <button
              onClick={() => setFilter('story')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === 'story' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Stories
            </button>
            <button
              onClick={() => setFilter('tip')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === 'tip' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Tips
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredWhispers.map((whisper) => (
          <div 
            key={whisper.id} 
            className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${
              playingId === whisper.id 
                ? 'ring-2 ring-indigo-500 transform scale-[1.02]' 
                : 'hover:shadow-md'
            }`}
          >
            <div className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    playingId === whisper.id 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
                      : 'bg-gradient-to-r from-indigo-100 to-purple-100'
                  }`}>
                    {playingId === whisper.id ? (
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full animate-ping bg-white opacity-30"></div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(whisper.timestamp).toLocaleString()}
                    </p>
                    {whisper.category && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {whisper.category}
                      </span>
                    )}
                    {whisper.isAnonymous && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Anonymous
                      </span>
                    )}
                  </div>
                  {whisper.title && (
                    <p className="text-sm font-medium text-gray-800 mt-1">{whisper.title}</p>
                  )}
                  {whisper.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{whisper.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {whisper.location.lat.toFixed(6)}, {whisper.location.lng.toFixed(6)}
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => playAudio(whisper)}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                      playingId === whisper.id 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                        : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    {playingId === whisper.id ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Playing
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Play
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            {playingId === whisper.id && (
              <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 