import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import WhisperList from './WhisperList';

export default function UserProfile({ user, onLogout }) {
  const [upgrading, setUpgrading] = useState(false);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [userWhispers, setUserWhispers] = useState([]);

  const handleLogout = () => {
    // Clear user from localStorage
    localStorage.removeItem('whispermap_user');
    
    // Notify parent component
    if (onLogout) {
      onLogout();
    }
    
    // Redirect to home
    router.push('/');
  };

  const handleUpgradeToPremium = () => {
    setUpgrading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      // Update user in localStorage
      const updatedUser = { ...user, isPremium: true };
      localStorage.setItem('whispermap_user', JSON.stringify(updatedUser));
      
      // Refresh the page
      window.location.reload();
    }, 2000);
  };

  // Fetch user's whispers
  useEffect(() => {
    async function fetchUserWhispers() {
      try {
        const response = await fetch(`/api/whispers/user/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setUserWhispers(data);
        }
      } catch (error) {
        console.error('Error fetching user whispers:', error);
      }
    }
    
    if (user) {
      fetchUserWhispers();
    }
  }, [user]);

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex items-center mb-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full p-2 mr-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <p className="text-gray-600">{user.email}</p>
          {user.isPremium && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-yellow-600 text-white mt-1">
              Premium Member
            </span>
          )}
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-6 mb-6">
        <h3 className="text-lg font-bold mb-4">Account Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Member Since</p>
            <p>{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Account Type</p>
            <p>{user.isPremium ? 'Premium' : 'Free'}</p>
          </div>
        </div>
      </div>
      
      {!user.isPremium && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold mb-2">Upgrade to Premium</h3>
          <p className="text-gray-700 mb-4">
            Get access to exclusive features:
          </p>
          <ul className="list-disc pl-5 mb-4 text-gray-700">
            <li>Unlimited whisper recordings</li>
            <li>Extended recording duration (up to 5 minutes)</li>
            <li>Custom whisper themes and colors</li>
            <li>Priority support</li>
          </ul>
          <button
            onClick={handleUpgradeToPremium}
            disabled={upgrading}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-2 px-4 rounded-md hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300"
          >
            {upgrading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Upgrade for $4.99/month'
            )}
          </button>
        </div>
      )}
      
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('whispers')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'whispers'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Whispers
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'profile' ? (
        // Profile content
      ) : (
        // Whispers content
        <div>
          <h3 className="text-lg font-bold mb-4">Your Whispers</h3>
          {userWhispers.length > 0 ? (
            <WhisperList whispers={userWhispers} />
          ) : (
            <p className="text-gray-500">You haven't created any whispers yet.</p>
          )}
        </div>
      )}
      
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="text-red-600 hover:text-red-800 font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
} 