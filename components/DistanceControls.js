import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';

export default function DistanceControls({ 
  detectionRange, 
  setDetectionRange, 
  whisperRange, 
  setWhisperRange 
}) {
  const { user } = useUser();
  const [isPremium, setIsPremium] = useState(false);
  
  // Set premium status based on user data
  useEffect(() => {
    if (user && user.isPremium) {
      setIsPremium(true);
    } else {
      setIsPremium(false);
      
      // If user is not premium and ranges are set higher than allowed, reset them
      if (detectionRange > 2000) {
        setDetectionRange(2000);
      }
      if (whisperRange > 1000) {
        setWhisperRange(1000);
      }
    }
  }, [user, detectionRange, whisperRange, setDetectionRange, setWhisperRange]);
  
  // Format distance for display
  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${meters}m`;
  };

  // Handle detection range change with premium check
  const handleDetectionRangeChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isPremium && value > 2000) {
      // Show premium upgrade prompt
      alert("Upgrade to premium to access detection ranges beyond 2km!");
      setDetectionRange(2000);
    } else {
      setDetectionRange(value);
    }
  };

  // Handle whisper range change with premium check
  const handleWhisperRangeChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isPremium && value > 1000) {
      // Show premium upgrade prompt
      alert("Upgrade to premium to access whisper ranges beyond 1km!");
      setWhisperRange(1000);
    } else {
      setWhisperRange(value);
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
        Distance Settings
      </h2>
      
      <div className="space-y-8">
        {/* Detection Range Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="detection-range" className="font-medium text-gray-700">
              How far you can detect
            </label>
            <span className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full text-sm">
              {formatDistance(detectionRange)}
            </span>
          </div>
          
          <div className="relative">
            <input
              id="detection-range"
              type="range"
              min="100"
              max="5000"
              step="100"
              value={detectionRange}
              onChange={handleDetectionRangeChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            
            {!isPremium && (
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-0 right-0 bottom-0 bg-gray-300 opacity-50 rounded-r-lg" style={{ width: 'calc(60%)' }}></div>
                <div className="absolute top-0 right-0 bottom-0 border-l-2 border-amber-500" style={{ left: '40%' }}></div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>100m</span>
            <span className={!isPremium ? "text-gray-400" : ""}>5km</span>
          </div>
          
          {!isPremium && (
            <div className="flex items-center mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
              <span className="text-amber-600 mr-1">✨</span>
              <p className="text-xs text-amber-700">
                Premium users can detect up to 5km. <button className="font-bold underline">Upgrade now!</button>
              </p>
            </div>
          )}
        </div>
        
        {/* Whisper Range Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="whisper-range" className="font-medium text-gray-700">
              How far your whispers can be detected
            </label>
            <span className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full text-sm">
              {formatDistance(whisperRange)}
            </span>
          </div>
          
          <div className="relative">
            <input
              id="whisper-range"
              type="range"
              min="100"
              max="3000"
              step="100"
              value={whisperRange}
              onChange={handleWhisperRangeChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            
            {!isPremium && (
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-0 right-0 bottom-0 bg-gray-300 opacity-50 rounded-r-lg" style={{ width: 'calc(66.7%)' }}></div>
                <div className="absolute top-0 right-0 bottom-0 border-l-2 border-amber-500" style={{ left: '33.3%' }}></div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>100m</span>
            <span className={!isPremium ? "text-gray-400" : ""}>3km</span>
          </div>
          
          {!isPremium && (
            <div className="flex items-center mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
              <span className="text-amber-600 mr-1">✨</span>
              <p className="text-xs text-amber-700">
                Premium users can share whispers up to 3km. <button className="font-bold underline">Upgrade now!</button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 