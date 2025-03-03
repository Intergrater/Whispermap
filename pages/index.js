import React from 'react'
import Head from 'next/head'
// import TestComponent from '../components/TestComponent'

export default function Home() {
  return (
    <div>
      <Head>
        <title>My Next.js App</title>
        <meta name="description" content="My Next.js application" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4 text-red-500">Welcome to My App</h1>
        <p className="mb-4 bg-gray-100 p-2">This is the homepage of my application.</p>
        {/* <TestComponent /> */}
      </main>
    </div>
  )
} 