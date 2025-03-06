import React, { useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useUser } from '../contexts/UserContext';
import { useRouter } from 'next/router';

// Dynamically import Auth component
const Auth = dynamic(() => import('../components/Auth'), { ssr: false });

export default function Login() {
  const { user } = useUser();
  const router = useRouter();
  
  // If user is already logged in, redirect to profile
  useEffect(() => {
    if (user) {
      router.push('/profile');
    }
  }, [user, router]);

  return (
    <div>
      <Head>
        <title>Sign In - WhisperMap</title>
        <meta name="description" content="Sign in to your WhisperMap account" />
      </Head>

      <div className="max-w-4xl mx-auto py-8">
        <Auth />
      </div>
    </div>
  );
} 