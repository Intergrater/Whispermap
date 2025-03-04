import React from 'react'
import Head from 'next/head'

export default function Home() {
  return (
    <div>
      <Head>
        <title>WhisperMap</title>
        <meta name="description" content="Location-based audio sharing" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Welcome to WhisperMap</h1>
        <p className="mb-4">Share audio messages tied to specific locations.</p>
        
        {/* Your original app content here */}
      </main>
    </div>
  )
} 