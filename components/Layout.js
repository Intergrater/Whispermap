import React from 'react'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">WhisperMap</h1>
        {/* Add your navigation here */}
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>© {new Date().getFullYear()} WhisperMap</p>
      </footer>
    </div>
  )
} 