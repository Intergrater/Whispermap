import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Map from '../components/Map'  // Your map component
import AudioRecorder from '../components/AudioRecorder'  // Your audio recorder component
import WhisperList from '../components/WhisperList'  // Component to list audio messages

export default function Home() {
  const [whispers, setWhispers] = useState([])
  const [location, setLocation] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Fetch whispers from your API
  useEffect(() => {
    async function fetchWhispers() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/whispers')
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`)
        }
        const data = await response.json()
        setWhispers(data)
        setError('')
      } catch (error) {
        console.error('Error fetching whispers:', error)
        setError('Failed to load whispers. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchWhispers()
    
    // Set up polling to refresh whispers every 30 seconds
    const intervalId = setInterval(fetchWhispers, 30000)
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [])
  
  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setError('')
        },
        error => {
          console.error('Error getting location:', error)
          setError('Unable to access your location. Please enable location services and refresh the page.')
        }
      )
    } else {
      setError('Geolocation is not supported by your browser.')
    }
  }, [])

  // Function to handle new whisper upload
  const handleNewWhisper = (newWhisper) => {
    setWhispers(prevWhispers => [newWhisper, ...prevWhispers])
  }

  return (
    <div>
      <Head>
        <title>WhisperMap</title>
        <meta name="description" content="Location-based audio sharing" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to WhisperMap</h1>
          <p className="text-xl text-gray-600">Share audio messages tied to specific locations.</p>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Explore Whispers</h2>
            {location ? (
              <Map location={location} whispers={whispers} />
            ) : (
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-600">Waiting for location access...</p>
                <p className="text-gray-500 mt-2 text-sm">
                  Please allow location access to see whispers on the map.
                  You can still record and listen to whispers without location.
                </p>
              </div>
            )}
          </div>
          
          <div>
            <AudioRecorder location={location} onWhisperUploaded={handleNewWhisper} />
            
            {isLoading ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                <p>Loading whispers...</p>
              </div>
            ) : (
              <WhisperList whispers={whispers} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 