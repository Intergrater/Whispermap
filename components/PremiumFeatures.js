import React from 'react';
import { useRouter } from 'next/router';

export default function PremiumFeatures({ user }) {
  const router = useRouter();
  
  const handleUpgradeClick = () => {
    if (user) {
      router.push('/profile');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-md p-8 mb-8">
      <div className="flex items-center mb-6">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-2 mr-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold">Premium Features</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-indigo-600 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-bold mb-1">Extended Recording Time</h3>
          <p className="text-gray-600 text-sm">Record whispers up to 5 minutes (vs. 1 minute for free users)</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-indigo-600 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="font-bold mb-1">Extended Detection Range</h3>
          <p className="text-gray-600 text-sm">Detect whispers up to 5km away (vs. 2km for free users)</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-indigo-600 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </div>
          <h3 className="font-bold mb-1">Extended Whisper Range</h3>
          <p className="text-gray-600 text-sm">Share whispers up to 3km away (vs. 1km for free users)</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-indigo-600 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-bold mb-1">Extended Whisper Lifetime</h3>
          <p className="text-gray-600 text-sm">Whispers last up to 90 days (vs. 7 days for free users)</p>
        </div>
      </div>
      
      {user && user.isPremium ? (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
          <div className="flex">
            <svg className="h-6 w-6 text-green-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>You're already enjoying premium features!</span>
          </div>
        </div>
      ) : (
        <button
          onClick={handleUpgradeClick}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 px-4 rounded-md hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300"
        >
          {user ? 'Upgrade to Premium' : 'Sign Up for Premium'}
        </button>
      )}
    </div>
  );
} 