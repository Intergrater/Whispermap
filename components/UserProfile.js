import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import WhisperList from './WhisperList';
import { useUser } from '../contexts/UserContext';

export default function UserProfile({ user, onLogout }) {
  const [upgrading, setUpgrading] = useState(false);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [userWhispers, setUserWhispers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [theme, setTheme] = useState(user?.theme || 'default');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { updateUser } = useUser();

  const handleLogout = () => {
    console.log('Logging out user...');
    
    // Clear user from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('whispermap_user');
      // Clear any other user-related data
      localStorage.removeItem('whispermap_settings');
    }
    
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
      if (typeof window !== 'undefined') {
        const updatedUser = { ...user, isPremium: true };
        localStorage.setItem('whispermap_user', JSON.stringify(updatedUser));
      }
      
      // Refresh the page
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
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

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const saveProfileChanges = () => {
    console.log('Saving profile changes...');
    
    // Create a complete updated user object with all properties
    const updatedUser = {
      ...user,
      displayName,
      profileImage,
      bio,
      theme,
      defaultAnonymous: user?.defaultAnonymous || false
    };
    
    console.log('Updated user data:', updatedUser);
    
    try {
      // Update user in context
      updateUser(updatedUser);
      
      // Also update localStorage directly to ensure it's saved
      if (typeof window !== 'undefined') {
        localStorage.setItem('whispermap_user', JSON.stringify(updatedUser));
        console.log('User data saved to localStorage');
      }
      
      // Exit edit mode
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile changes:', error);
    }
  };

  const cancelEditing = () => {
    // Reset form values to current user values
    setDisplayName(user?.displayName || user?.name || '');
    setProfileImage(user?.profileImage || null);
    setBio(user?.bio || '');
    setTheme(user?.theme || 'default');
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex flex-col md:flex-row md:items-center mb-6">
        <div className="relative mb-4 md:mb-0 md:mr-6">
          {isEditing ? (
            <div className="relative">
              <div 
                className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center cursor-pointer"
                onClick={triggerFileInput}
              >
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleProfileImageChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
          )}
        </div>
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="2"
                ></textarea>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold">{displayName || user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
              {bio && <p className="text-gray-700 mt-2">{bio}</p>}
              {user.isPremium && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-yellow-600 text-white mt-1">
                  Premium Member
                </span>
              )}
            </div>
          )}
        </div>
        {!isEditing ? (
          <button
            onClick={() => {
              console.log('Entering edit mode...');
              setIsEditing(true);
            }}
            className="mt-4 md:mt-0 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors flex items-center self-start"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2 mt-4 md:mt-0 self-start">
            <button
              onClick={saveProfileChanges}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={cancelEditing}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      
      {isEditing && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-bold mb-3">Theme Preferences</h3>
          <div className="grid grid-cols-3 gap-3">
            <div 
              className={`p-3 rounded-lg cursor-pointer transition-all ${theme === 'default' ? 'ring-2 ring-indigo-500' : 'hover:bg-gray-100'}`}
              onClick={() => {
                console.log('Setting theme to default');
                setTheme('default');
              }}
            >
              <div className="h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md mb-2"></div>
              <p className="text-sm font-medium text-center">Default</p>
            </div>
            <div 
              className={`p-3 rounded-lg cursor-pointer transition-all ${theme === 'sunset' ? 'ring-2 ring-indigo-500' : 'hover:bg-gray-100'}`}
              onClick={() => {
                console.log('Setting theme to sunset');
                setTheme('sunset');
              }}
            >
              <div className="h-8 bg-gradient-to-r from-orange-500 to-pink-600 rounded-md mb-2"></div>
              <p className="text-sm font-medium text-center">Sunset</p>
            </div>
            <div 
              className={`p-3 rounded-lg cursor-pointer transition-all ${theme === 'ocean' ? 'ring-2 ring-indigo-500' : 'hover:bg-gray-100'}`}
              onClick={() => {
                console.log('Setting theme to ocean');
                setTheme('ocean');
              }}
            >
              <div className="h-8 bg-gradient-to-r from-blue-500 to-teal-400 rounded-md mb-2"></div>
              <p className="text-sm font-medium text-center">Ocean</p>
            </div>
          </div>
        </div>
      )}
      
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
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div className="profile-content">
          <h3 className="text-lg font-bold mb-4">Your Profile</h3>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600">Username</p>
              <p className="font-medium">{user?.username || displayName || 'Not set'}</p>
            </div>
            <div>
              <p className="text-gray-600">Email</p>
              <p className="font-medium">{user?.email || 'Not set'}</p>
            </div>
            <div>
              <p className="text-gray-600">Bio</p>
              <p className="font-medium">{bio || 'No bio added yet'}</p>
            </div>
            <div>
              <p className="text-gray-600">Member since</p>
              <p className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}</p>
            </div>
          </div>
        </div>
      ) : activeTab === 'whispers' ? (
        // Whispers content
        <div>
          <h3 className="text-lg font-bold mb-4">Your Whispers</h3>
          {userWhispers.length > 0 ? (
            <WhisperList whispers={userWhispers} />
          ) : (
            <p className="text-gray-500">You haven't created any whispers yet.</p>
          )}
        </div>
      ) : (
        // Settings content
        <div>
          <h3 className="text-lg font-bold mb-4">Account Settings</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Privacy Settings</h4>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Default to Anonymous Whispers</p>
                  <p className="text-sm text-gray-600">Your whispers won't be linked to your profile by default</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={user?.defaultAnonymous || false}
                    onChange={() => {
                      const updatedUser = {
                        ...user,
                        defaultAnonymous: !user?.defaultAnonymous
                      };
                      // Update in context
                      updateUser(updatedUser);
                      // Also update directly in localStorage to ensure it's saved
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('whispermap_user', JSON.stringify(updatedUser));
                      }
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Notification Settings</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive updates about your whispers</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={user?.emailNotifications !== false}
                      onChange={() => {
                        const updatedUser = {
                          ...user,
                          emailNotifications: !user?.emailNotifications
                        };
                        // Update in context
                        updateUser(updatedUser);
                        // Also update directly in localStorage to ensure it's saved
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('whispermap_user', JSON.stringify(updatedUser));
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Account Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center items-center px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 