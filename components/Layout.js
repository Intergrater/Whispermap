import React, { useState } from 'react';
import Link from 'next/link';
import { useUser } from '../contexts/UserContext';

export default function Layout({ children }) {
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-gray-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
            <a className="text-xl font-bold flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              WhisperMap
            </a>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/">
              <a className="hover:text-blue-300 transition-colors">Home</a>
            </Link>
            <Link href="/about">
              <a className="hover:text-blue-300 transition-colors">About</a>
            </Link>
            {user ? (
              <div className="flex items-center space-x-4">
                {user.isPremium && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
                    Premium
                  </span>
                )}
                <Link href="/profile">
                  <a className="flex items-center hover:text-blue-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {user.name}
                  </a>
                </Link>
              </div>
            ) : (
              <Link href="/login">
                <a className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors">
                  Sign In
                </a>
              </Link>
            )}
          </nav>
          
          <button 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-700">
            <Link href="/">
              <a className="block py-2 hover:text-blue-300 transition-colors">Home</a>
            </Link>
            <Link href="/about">
              <a className="block py-2 hover:text-blue-300 transition-colors">About</a>
            </Link>
            {user ? (
              <Link href="/profile">
                <a className="block py-2 hover:text-blue-300 transition-colors">Profile</a>
              </Link>
            ) : (
              <Link href="/login">
                <a className="block py-2 hover:text-blue-300 transition-colors">Sign In</a>
              </Link>
            )}
          </div>
        )}
      </header>
      
      <main className="flex-grow p-4">
        {children}
      </main>
      
      <footer className="bg-gray-800 text-white p-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">WhisperMap</h3>
              <p className="text-gray-300">Share audio messages tied to specific locations.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Links</h3>
              <ul className="space-y-2">
                <li><Link href="/"><a className="text-gray-300 hover:text-white">Home</a></Link></li>
                <li><Link href="/about"><a className="text-gray-300 hover:text-white">About</a></Link></li>
                <li><Link href="/privacy"><a className="text-gray-300 hover:text-white">Privacy Policy</a></Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Contact</h3>
              <p className="text-gray-300">info@whispermap.com</p>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-300">
            <p>© {new Date().getFullYear()} WhisperMap. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 