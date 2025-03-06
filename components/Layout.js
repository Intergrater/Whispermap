import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '../contexts/UserContext';

export default function Layout({ children }) {
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState('default');

  // Add scroll effect for header
  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      const handleScroll = () => {
        setScrolled(window.scrollY > 10);
      };
      
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  // Apply theme from user preferences
  useEffect(() => {
    if (user && user.theme) {
      setTheme(user.theme);
    } else {
      setTheme('default');
    }
  }, [user]);
  
  // Get theme-specific gradient classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'sunset':
        return {
          headerGradient: scrolled ? 'bg-white/80' : 'bg-transparent',
          buttonGradient: 'from-orange-500 to-red-600',
          textGradient: 'from-orange-600 to-red-600',
          bgGradient: 'from-orange-50 via-yellow-50 to-red-50',
          blob1: 'bg-orange-300',
          blob2: 'bg-yellow-300',
          blob3: 'bg-red-300',
          logoGradient: 'from-orange-600 to-red-600'
        };
      case 'ocean':
        return {
          headerGradient: scrolled ? 'bg-white/80' : 'bg-transparent',
          buttonGradient: 'from-blue-500 to-teal-600',
          textGradient: 'from-blue-600 to-teal-600',
          bgGradient: 'from-blue-50 via-cyan-50 to-teal-50',
          blob1: 'bg-blue-300',
          blob2: 'bg-cyan-300',
          blob3: 'bg-teal-300',
          logoGradient: 'from-blue-600 to-teal-600'
        };
      default: // default theme
        return {
          headerGradient: scrolled ? 'bg-white/80' : 'bg-transparent',
          buttonGradient: 'from-indigo-500 to-purple-600',
          textGradient: 'from-indigo-600 to-purple-600',
          bgGradient: 'from-indigo-50 via-purple-50 to-blue-50',
          blob1: 'bg-purple-300',
          blob2: 'bg-yellow-300',
          blob3: 'bg-pink-300',
          logoGradient: 'from-indigo-600 to-purple-600'
        };
    }
  };
  
  const themeClasses = getThemeClasses();

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br ${themeClasses.bgGradient}`}>
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-20 left-10 w-64 h-64 ${themeClasses.blob1} rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob`}></div>
        <div className={`absolute top-40 right-10 w-72 h-72 ${themeClasses.blob2} rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000`}></div>
        <div className={`absolute bottom-20 left-1/3 w-80 h-80 ${themeClasses.blob3} rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000`}></div>
      </div>

      <header className={`sticky top-0 z-50 transition-all duration-300 ${themeClasses.headerGradient} backdrop-blur-md ${scrolled ? 'shadow-lg' : ''}`}>
        <div className="container mx-auto flex justify-between items-center p-4">
          <Link href="/">
            <a className="text-xl font-bold flex items-center group">
              <div className={`relative w-8 h-8 mr-2 rounded-full bg-gradient-to-r ${themeClasses.buttonGradient} flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform`}>
                <img src="/images/logo.svg" alt="WhisperMap Logo" className="h-5 w-5 text-white" />
                <div className={`absolute inset-0 bg-gradient-to-r ${themeClasses.buttonGradient} opacity-75 animate-pulse`}></div>
              </div>
              <span className={`bg-gradient-to-r ${themeClasses.textGradient} bg-clip-text text-transparent font-extrabold`}>
                WhisperMap
              </span>
            </a>
          </Link>

          {/* Mobile menu button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <a className="text-gray-700 hover:text-gray-900 font-medium">Home</a>
            </Link>
            <Link href="/about">
              <a className="text-gray-700 hover:text-gray-900 font-medium">About</a>
            </Link>
            {user ? (
              <div className="relative group">
                <button className={`flex items-center space-x-1 bg-gradient-to-r ${themeClasses.buttonGradient} text-white px-4 py-2 rounded-full hover:shadow-md transition-all`}>
                  <span>{user.displayName || user.name}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-20 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 origin-top-right invisible group-hover:visible">
                  <div className="py-1">
                    <Link href="/profile">
                      <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
                    </Link>
                    <Link href="/settings">
                      <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
                    </Link>
                    <button 
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('whispermap_user');
                          window.location.href = '/';
                        }
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link href="/login">
                <a className={`bg-gradient-to-r ${themeClasses.buttonGradient} text-white px-4 py-2 rounded-full hover:shadow-md transition-all`}>
                  Sign In
                </a>
              </Link>
            )}
          </nav>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden transition-all duration-300 overflow-hidden ${mobileMenuOpen ? 'max-h-60' : 'max-h-0'}`}>
          <div className="px-4 pt-2 pb-3 space-y-1 bg-white/90 backdrop-blur-md shadow-lg">
            <Link href="/">
              <a className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">
                Home
              </a>
            </Link>
            <Link href="/about">
              <a className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">
                About
              </a>
            </Link>
            {user ? (
              <>
                <Link href="/profile">
                  <a className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">
                    Profile
                  </a>
                </Link>
                <Link href="/settings">
                  <a className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">
                    Settings
                  </a>
                </Link>
                <button 
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('whispermap_user');
                      window.location.href = '/';
                    }
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login">
                <a className={`block px-3 py-2 rounded-md text-base font-medium bg-gradient-to-r ${themeClasses.buttonGradient} text-white`}>
                  Sign In
                </a>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className={`text-xl font-bold bg-gradient-to-r ${themeClasses.textGradient} bg-clip-text text-transparent`}>
                WhisperMap
              </h3>
              <p className="text-indigo-200">Share audio messages tied to specific locations.</p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-500 hover:text-gray-700">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700">
                Terms of Service
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} WhisperMap. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
} 