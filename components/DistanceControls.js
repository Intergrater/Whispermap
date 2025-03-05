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
          
          <input
            id="detection-range"
            type="range"
            min="100"
            max={isPremium ? "5000" : "2000"}
            step="100"
            value={detectionRange}
            onChange={(e) => setDetectionRange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>100m</span>
            <span>{isPremium ? '5km' : '2km'}</span>
          </div>
          
          {!isPremium && (
            <p className="text-xs text-gray-500 mt-2">
              <span className="text-amber-600">✨</span> Premium users can detect up to 5km
            </p>
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
          
          <input
            id="whisper-range"
            type="range"
            min="100"
            max={isPremium ? "3000" : "1000"}
            step="100"
            value={whisperRange}
            onChange={(e) => setWhisperRange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>100m</span>
            <span>{isPremium ? '3km' : '1km'}</span>
          </div>
          
          {!isPremium && (
            <p className="text-xs text-gray-500 mt-2">
              <span className="text-amber-600">✨</span> Premium users can share whispers up to 3km
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 