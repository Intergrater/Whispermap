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
  
  // Get current theme from localStorage for styling
  const [currentTheme, setCurrentTheme] = useState('default');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
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
          textLight: 'text-gray-400',
          borderColor: 'border-gray-700',
          tabActive: 'border-cyan-500 text-cyan-400',
          tabInactive: 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600',
          inputBg: 'bg-gray-700',
          inputBorder: 'border-gray-600',
          inputFocus: 'focus:ring-cyan-500 focus:border-cyan-500',
          buttonPrimary: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700',
          buttonSecondary: 'bg-gray-700 text-gray-300 hover:bg-gray-600',
          sectionBg: 'bg-gray-800/50',
          highlightBg: 'bg-gradient-to-r from-gray-800 to-gray-900'
        };
      case 'sunset':
        return {
          cardBg: 'bg-white',
          textColor: 'text-gray-800',
          textMuted: 'text-gray-600',
          textLight: 'text-gray-500',
          borderColor: 'border-gray-200',
          tabActive: 'border-orange-500 text-orange-600',
          tabInactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          inputBg: 'bg-white',
          inputBorder: 'border-gray-300',
          inputFocus: 'focus:ring-orange-500 focus:border-orange-500',
          buttonPrimary: 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700',
          buttonSecondary: 'bg-white text-gray-700 hover:bg-gray-100',
          sectionBg: 'bg-orange-50',
          highlightBg: 'bg-gradient-to-r from-orange-50 to-yellow-50'
        };
      case 'ocean':
        return {
          cardBg: 'bg-white',
          textColor: 'text-gray-800',
          textMuted: 'text-gray-600',
          textLight: 'text-gray-500',
          borderColor: 'border-gray-200',
          tabActive: 'border-blue-500 text-blue-600',
          tabInactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          inputBg: 'bg-white',
          inputBorder: 'border-gray-300',
          inputFocus: 'focus:ring-blue-500 focus:border-blue-500',
          buttonPrimary: 'bg-gradient-to-r from-blue-500 to-teal-600 hover:from-blue-600 hover:to-teal-700',
          buttonSecondary: 'bg-white text-gray-700 hover:bg-gray-100',
          sectionBg: 'bg-blue-50',
          highlightBg: 'bg-gradient-to-r from-blue-50 to-cyan-50'
        };
      default: // default theme
        return {
          cardBg: 'bg-white',
          textColor: 'text-gray-800',
          textMuted: 'text-gray-600',
          textLight: 'text-gray-500',
          borderColor: 'border-gray-200',
          tabActive: 'border-indigo-500 text-indigo-600',
          tabInactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          inputBg: 'bg-white',
          inputBorder: 'border-gray-300',
          inputFocus: 'focus:ring-indigo-500 focus:border-indigo-500',
          buttonPrimary: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700',
          buttonSecondary: 'bg-white text-gray-700 hover:bg-gray-100',
          sectionBg: 'bg-indigo-50',
          highlightBg: 'bg-gradient-to-r from-indigo-50 to-purple-50'
        };
    }
  };
  
  const themeClasses = getThemeClasses();

  const handleLogout = () => {
    console.log('Logging out user...');
    if (onLogout) {
      onLogout();
    }
  };

  const handleUpgradeToPremium = () => {
    setUpgrading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      try {
        // Create a complete updated user object with premium status
        const updatedUser = {
          ...user,
          isPremium: true,
          premiumSince: new Date().toISOString()
        };
        
        console.log('Upgrading user to premium:', updatedUser);
        
        // Update user in context
        updateUser(updatedUser);
        
        // Also update localStorage directly to ensure it's saved
        if (typeof window !== 'undefined') {
          localStorage.setItem('whispermap_user', JSON.stringify(updatedUser));
          console.log('User premium status saved to localStorage');
        }
        
        // Show success message
        alert('Congratulations! You are now a premium user.');
        
        // Refresh the page
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error upgrading to premium:', error);
        alert('Failed to upgrade to premium. Please try again.');
      } finally {
        setUpgrading(false);
      }
    }, 2000);
  };

  // Fetch user's whispers
  useEffect(() => {
    async function fetchUserWhispers() {
      if (!user || !user.id) {
        console.log('No user ID available to fetch whispers');
        return;
      }
      
      try {
        console.log(`Fetching whispers for user ${user.id}`);
        
        // First try to get user whispers from localStorage
        const allWhispers = JSON.parse(localStorage.getItem('whispers') || '[]');
        const localUserWhispers = allWhispers.filter(
          whisper => whisper.userId === user.id && whisper.isAnonymous === false
        );
        
        console.log(`Found ${localUserWhispers.length} whispers in localStorage for user ${user.id}`);
        
        // Set whispers from localStorage first for immediate display
        if (localUserWhispers.length > 0) {
          setUserWhispers(localUserWhispers);
        }
        
        // Then try to fetch from API for complete list
        const response = await fetch(`/api/whispers/user/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`Fetched ${data.length} whispers from API for user ${user.id}`);
          
          // Only update if we got whispers from the API
          if (data.length > 0) {
            setUserWhispers(data);
          }
        } else {
          console.error('Error response from API:', response.status);
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
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt={displayName || user?.name || 'User'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            {isEditing && (
              <button 
                onClick={() => fileInputRef.current.click()}
                className={`absolute bottom-0 right-0 p-1.5 rounded-full ${themeClasses.buttonPrimary} text-white`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleProfileImageChange}
            />
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
                <h2 className={`text-2xl font-bold ${themeClasses.textColor}`}>{displayName || user.name}</h2>
                <p className={themeClasses.textMuted}>{user.email}</p>
                {bio && <p className={themeClasses.textColor + " mt-2"}>{bio}</p>}
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
              className={`mt-4 md:mt-0 px-4 py-2 rounded-md transition-colors flex items-center self-start ${themeClasses.buttonSecondary}`}
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
                className={`px-4 py-2 rounded-md transition-colors ${themeClasses.buttonPrimary} text-white`}
              >
                Save
              </button>
              <button
                onClick={cancelEditing}
                className={`px-4 py-2 rounded-md transition-colors ${themeClasses.buttonSecondary}`}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      
      {isEditing && (
        <div className={`mb-6 p-4 rounded-lg ${themeClasses.sectionBg}`}>
          <h3 className={`text-lg font-bold mb-3 ${themeClasses.textColor}`}>Theme Preferences</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div 
              onClick={() => setTheme('cyberpunk')}
              className={`cursor-pointer rounded-lg p-3 flex flex-col items-center ${
                theme === 'cyberpunk' ? 'ring-2 ring-cyan-500 bg-gray-900' : `${themeClasses.cardBg} hover:bg-gray-700`
              }`}
            >
              <div className="w-full h-12 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-md mb-2"></div>
              <span className={`text-sm font-medium ${theme === 'cyberpunk' ? 'text-cyan-400' : themeClasses.textColor}`}>Cyberpunk</span>
            </div>
            
            <div 
              onClick={() => setTheme('default')}
              className={`cursor-pointer rounded-lg p-3 flex flex-col items-center ${
                theme === 'default' ? 'ring-2 ring-indigo-500 bg-indigo-50' : `${themeClasses.cardBg} hover:bg-gray-700`
              }`}
            >
              <div className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md mb-2"></div>
              <span className={`text-sm font-medium ${themeClasses.textColor}`}>Default</span>
            </div>
            
            <div 
              onClick={() => setTheme('sunset')}
              className={`cursor-pointer rounded-lg p-3 flex flex-col items-center ${
                theme === 'sunset' ? 'ring-2 ring-orange-500 bg-orange-50' : `${themeClasses.cardBg} hover:bg-gray-700`
              }`}
            >
              <div className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-md mb-2"></div>
              <span className={`text-sm font-medium ${themeClasses.textColor}`}>Sunset</span>
            </div>
            
            <div 
              onClick={() => setTheme('ocean')}
              className={`cursor-pointer rounded-lg p-3 flex flex-col items-center ${
                theme === 'ocean' ? 'ring-2 ring-blue-500 bg-blue-50' : `${themeClasses.cardBg} hover:bg-gray-700`
              }`}
            >
              <div className="w-full h-12 bg-gradient-to-r from-blue-500 to-teal-600 rounded-md mb-2"></div>
              <span className={`text-sm font-medium ${themeClasses.textColor}`}>Ocean</span>
            </div>
          </div>
          <p className={`text-sm ${themeClasses.textLight} mt-2`}>
            Select a theme to customize the appearance of your WhisperMap experience.
          </p>
        </div>
      )}
      
      <div className={`border-t ${themeClasses.borderColor} pt-6 mb-6`}>
        <h3 className={`text-lg font-bold mb-4 ${themeClasses.textColor}`}>Account Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className={themeClasses.textMuted + " text-sm"}>Member Since</p>
            <p className={themeClasses.textColor}>{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className={themeClasses.textMuted + " text-sm"}>Account Type</p>
            <p className={themeClasses.textColor}>{user.isPremium ? 'Premium' : 'Free'}</p>
          </div>
        </div>
      </div>
      
      {!user.isPremium && (
        <div className={`rounded-lg p-6 mb-6 ${themeClasses.highlightBg}`}>
          <h3 className={`text-lg font-bold mb-2 ${themeClasses.textColor}`}>Upgrade to Premium</h3>
          <p className={`${themeClasses.textMuted} mb-4`}>
            Get access to exclusive features:
          </p>
          <ul className={`list-disc pl-5 mb-4 ${themeClasses.textMuted}`}>
            <li>Unlimited whisper recordings</li>
            <li>Extended recording duration (up to 5 minutes)</li>
            <li>Custom whisper themes and colors</li>
            <li>Priority support</li>
          </ul>
          <button
            onClick={handleUpgradeToPremium}
            disabled={upgrading}
            className={`${themeClasses.buttonPrimary} text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300`}
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
        <div className={`border-b ${themeClasses.borderColor}`}>
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? themeClasses.tabActive
                  : themeClasses.tabInactive
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('whispers')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'whispers'
                  ? themeClasses.tabActive
                  : themeClasses.tabInactive
              }`}
            >
              My Whispers
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? themeClasses.tabActive
                  : themeClasses.tabInactive
              }`}
            >
              Settings
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div className="profile-content">
          <h3 className={`text-lg font-bold mb-4 ${themeClasses.textColor}`}>Your Profile</h3>
          <div className="space-y-4">
            <div>
              <p className={themeClasses.textMuted}>Username</p>
              <p className={`font-medium ${themeClasses.textColor}`}>{user?.username || displayName || 'Not set'}</p>
            </div>
            <div>
              <p className={themeClasses.textMuted}>Email</p>
              <p className={`font-medium ${themeClasses.textColor}`}>{user?.email || 'Not set'}</p>
            </div>
            <div>
              <p className={themeClasses.textMuted}>Bio</p>
              <p className={`font-medium ${themeClasses.textColor}`}>{bio || 'No bio added yet'}</p>
            </div>
            <div>
              <p className={themeClasses.textMuted}>Member since</p>
              <p className={`font-medium ${themeClasses.textColor}`}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}</p>
            </div>
          </div>
        </div>
      ) : activeTab === 'whispers' ? (
        // Whispers content
        <div>
          <h3 className={`text-lg font-bold mb-4 ${themeClasses.textColor}`}>Your Whispers</h3>
          {userWhispers.length > 0 ? (
            <WhisperList whispers={userWhispers} />
          ) : (
            <p className={themeClasses.textLight}>You haven't created any whispers yet.</p>
          )}
        </div>
      ) : (
        // Settings content
        <div>
          <h3 className={`text-lg font-bold mb-4 ${themeClasses.textColor}`}>Account Settings</h3>
          <div className="space-y-6">
            <div>
              <h4 className={`font-medium mb-2 ${themeClasses.textColor}`}>Theme Settings</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div 
                  onClick={() => setTheme('cyberpunk')}
                  className={`cursor-pointer rounded-lg p-3 flex flex-col items-center ${
                    theme === 'cyberpunk' ? 'ring-2 ring-cyan-500 bg-gray-900' : `${themeClasses.cardBg} hover:bg-gray-700`
                  }`}
                >
                  <div className="w-full h-12 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-md mb-2"></div>
                  <span className={`text-sm font-medium ${theme === 'cyberpunk' ? 'text-cyan-400' : themeClasses.textColor}`}>Cyberpunk</span>
                </div>
                
                <div 
                  onClick={() => setTheme('default')}
                  className={`cursor-pointer rounded-lg p-3 flex flex-col items-center ${
                    theme === 'default' ? 'ring-2 ring-indigo-500 bg-indigo-50' : `${themeClasses.cardBg} hover:bg-gray-700`
                  }`}
                >
                  <div className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md mb-2"></div>
                  <span className={`text-sm font-medium ${themeClasses.textColor}`}>Default</span>
                </div>
                
                <div 
                  onClick={() => setTheme('sunset')}
                  className={`cursor-pointer rounded-lg p-3 flex flex-col items-center ${
                    theme === 'sunset' ? 'ring-2 ring-orange-500 bg-orange-50' : `${themeClasses.cardBg} hover:bg-gray-700`
                  }`}
                >
                  <div className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-md mb-2"></div>
                  <span className={`text-sm font-medium ${themeClasses.textColor}`}>Sunset</span>
                </div>
                
                <div 
                  onClick={() => setTheme('ocean')}
                  className={`cursor-pointer rounded-lg p-3 flex flex-col items-center ${
                    theme === 'ocean' ? 'ring-2 ring-blue-500 bg-blue-50' : `${themeClasses.cardBg} hover:bg-gray-700`
                  }`}
                >
                  <div className="w-full h-12 bg-gradient-to-r from-blue-500 to-teal-600 rounded-md mb-2"></div>
                  <span className={`text-sm font-medium ${themeClasses.textColor}`}>Ocean</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Select a theme to customize the appearance of your WhisperMap experience.
              </p>
            </div>
            
            <div>
              <h4 className={`font-medium mb-2 ${themeClasses.textColor}`}>Privacy Settings</h4>
              <div className={`flex items-center justify-between p-3 ${themeClasses.sectionBg} rounded-lg`}>
                <div>
                  <p className={`font-medium ${themeClasses.textColor}`}>Default to Anonymous Whispers</p>
                  <p className={`text-sm ${themeClasses.textMuted}`}>Your whispers won't be linked to your profile by default</p>
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
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${currentTheme === 'cyberpunk' ? 'peer-checked:bg-cyan-600' : 'peer-checked:bg-indigo-600'}`}></div>
                </label>
              </div>
            </div>
            
            <div>
              <h4 className={`font-medium mb-2 ${themeClasses.textColor}`}>Notification Settings</h4>
              <div className="space-y-2">
                <div className={`flex items-center justify-between p-3 ${themeClasses.sectionBg} rounded-lg`}>
                  <div>
                    <p className={`font-medium ${themeClasses.textColor}`}>Email Notifications</p>
                    <p className={`text-sm ${themeClasses.textMuted}`}>Receive updates about your whispers</p>
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
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${currentTheme === 'cyberpunk' ? 'peer-checked:bg-cyan-600' : 'peer-checked:bg-indigo-600'}`}></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Account Actions</h4>
              <div className="space-y-2">
                <div className="mt-6">
                  <button
                    onClick={handleLogout}
                    className={`w-full flex justify-center items-center px-4 py-2 rounded-md ${themeClasses.buttonSecondary}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 