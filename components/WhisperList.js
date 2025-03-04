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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Whispers</h2>
        <div className="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <p className="text-gray-500">No whispers found nearby.</p>
          <p className="text-gray-400 mt-2">Record your first whisper to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Recent Whispers</h2>
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">
          Filter by Category
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'all' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('story')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'story' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Stories
          </button>
          {/* Add more filter buttons */}
        </div>
      </div>
      <ul className="divide-y divide-gray-200">
        {filteredWhispers.map((whisper) => (
          <li key={whisper.id} className="py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className={`rounded-full p-2 ${playingId === whisper.id ? 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse' : 'bg-indigo-100'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${playingId === whisper.id ? 'text-white' : 'text-indigo-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {new Date(whisper.timestamp).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {whisper.location.lat.toFixed(6)}, {whisper.location.lng.toFixed(6)}
                </p>
              </div>
              <div>
                <button
                  onClick={() => playAudio(whisper)}
                  className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md ${
                    playingId === whisper.id 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' 
                      : 'text-white bg-indigo-600 hover:bg-indigo-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300`}
                >
                  {playingId === whisper.id ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Playing...
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
          </li>
        ))}
      </ul>
    </div>
  );
} 