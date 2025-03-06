import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useUser } from '../contexts/UserContext';

// Dynamically import UserProfile component
const UserProfile = dynamic(() => import('../components/UserProfile'), { ssr: false });

export default function Profile() {
  const { user, loading, logout } = useUser();
  const router = useRouter();
  
  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>Your Profile - WhisperMap</title>
        <meta name="description" content="Manage your WhisperMap profile" />
      </Head>

      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        <UserProfile user={user} onLogout={logout} />
      </div>
    </div>
  );
} 