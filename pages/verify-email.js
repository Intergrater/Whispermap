import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUser } from '../contexts/UserContext';
import Link from 'next/link';

export default function VerifyEmail() {
  const { user, sendEmailVerification, isEmailVerified } = useUser();
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();
  
  // If user is verified, redirect to profile
  useEffect(() => {
    if (isEmailVerified) {
      router.push('/profile');
    }
  }, [isEmailVerified, router]);
  
  // Handle countdown for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);
  
  const handleResendVerification = async () => {
    setResendDisabled(true);
    setCountdown(60); // 60 second cooldown
    
    const result = await sendEmailVerification();
    if (!result?.success) {
      // Handle error
      setResendDisabled(false);
      setCountdown(0);
    }
  };
  
  // If no user, redirect to login
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="mb-4">You need to be logged in to verify your email.</p>
          <Link href="/login">
            <a className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
              Go to Login
            </a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>Verify Your Email - WhisperMap</title>
        <meta name="description" content="Verify your email address for WhisperMap" />
      </Head>

      <div className="max-w-4xl mx-auto py-16">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold mb-4">Verify Your Email</h1>
          
          <p className="text-gray-600 mb-6">
            We've sent a verification email to <strong>{user.email}</strong>. 
            Please check your inbox and click the verification link to activate your account.
          </p>
          
          <div className="mb-6">
            <button
              onClick={handleResendVerification}
              disabled={resendDisabled}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendDisabled 
                ? `Resend in ${countdown}s` 
                : 'Resend Verification Email'}
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Already verified? <Link href="/login"><a className="text-indigo-600 hover:text-indigo-800">Sign in</a></Link></p>
          </div>
        </div>
      </div>
    </div>
  );
} 