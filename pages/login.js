import React from 'react';
import Head from 'next/head';
import Auth from '../components/Auth';
import { useUser } from '../contexts/UserContext';
import { useRouter } from 'next/router';

export default function Login() {
  const { login, user } = useUser();
  const router = useRouter();
  
  // If user is already logged in, redirect to profile
  React.useEffect(() => {
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
        <Auth onAuthStateChange={login} />
      </div>
    </div>
  );
} 