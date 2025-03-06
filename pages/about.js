import React from 'react';
import Head from 'next/head';

export default function About() {
  return (
    <div>
      <Head>
        <title>About WhisperMap</title>
        <meta name="description" content="Learn about WhisperMap - Location-based audio sharing" />
      </Head>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">About WhisperMap</h1>
        
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="mb-4">
            WhisperMap is a location-based audio sharing platform that allows users to leave audio messages tied to specific locations. 
            Our mission is to create a new way for people to connect with places and share experiences through sound.
          </p>
          <p className="mb-4">
            Whether you're sharing historical information about a landmark, leaving a personal memory at a meaningful location, 
            or creating an audio guide for others to discover, WhisperMap provides a unique way to connect through audio.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="bg-blue-100 rounded-full p-4 inline-block mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Your Location</h3>
              <p className="text-gray-600">Allow location access to place your whisper at your current spot.</p>
            </div>
            
            <div className="text-center p-4">
              <div className="bg-blue-100 rounded-full p-4 inline-block mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Record a Whisper</h3>
              <p className="text-gray-600">Record your audio message using your device's microphone.</p>
            </div>
            
            <div className="text-center p-4">
              <div className="bg-blue-100 rounded-full p-4 inline-block mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Share & Discover</h3>
              <p className="text-gray-600">Upload your whisper and discover others left by users nearby.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 