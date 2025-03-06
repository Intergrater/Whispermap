import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { validatePassword } from '../utils/passwordUtils';

export default function Auth({ onAuthStateChange }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(null);
  const [emailError, setEmailError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const router = useRouter();

  // Validate password as user types
  useEffect(() => {
    if (!isLogin && password) {
      setPasswordValidation(validatePassword(password));
    } else {
      setPasswordValidation(null);
    }
  }, [password, isLogin]);

  // Check if email is already in use when user finishes typing
  const checkEmailExists = async (email) => {
    if (!email || isLogin) return;
    
    try {
      const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.isEmailInUse) {
        setEmailError('This email is already registered. Please log in or use a different email.');
      } else {
        setEmailError('');
      }
    } catch (error) {
      console.error('Error checking email:', error);
    }
  };

  // Debounce email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email && !isLogin) {
        checkEmailExists(email);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [email, isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Handle login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if email is verified
        if (!user.emailVerified) {
          setError('Please verify your email before logging in. Check your inbox for a verification link.');
          // Offer to resend verification email
          setVerificationSent(true);
          setLoading(false);
          return;
        }
        
        // Successful login
        if (onAuthStateChange) {
          onAuthStateChange(user);
        }
        
        setLoading(false);
        router.push('/profile');
      } else {
        // Handle registration
        // Validate password strength
        if (!passwordValidation?.isValid) {
          setError('Please use a stronger password. ' + (passwordValidation?.detailedFeedback || ''));
          setLoading(false);
          return;
        }
        
        // Check if email is already in use
        if (emailError) {
          setError(emailError);
          setLoading(false);
          return;
        }
        
        // Create new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update user profile with name
        await updateProfile(user, { displayName: name });
        
        // Send email verification
        await sendEmailVerification(user);
        setVerificationSent(true);
        
        // Show success message
        setError('');
        setLoading(false);
        
        // Redirect to verification page or show verification message
        if (onAuthStateChange) {
          onAuthStateChange(user);
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      
      // Handle specific Firebase auth errors
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password. Please try again.');
          break;
        case 'auth/email-already-in-use':
          setError('This email is already registered. Please log in or use a different email.');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Please use a stronger password.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address. Please check and try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed login attempts. Please try again later or reset your password.');
          break;
        default:
          setError(err.message || 'An error occurred during authentication. Please try again.');
      }
      
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      if (!auth.currentUser) {
        // Try to sign in first to get the current user
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      await sendEmailVerification(auth.currentUser);
      setError('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError('Failed to send verification email. Please try again.');
      console.error('Error sending verification email:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isLogin ? 'Sign In to WhisperMap' : 'Create an Account'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
          
          {verificationSent && !isLogin && (
            <button 
              onClick={resendVerificationEmail}
              className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Resend verification email
            </button>
          )}
        </div>
      )}
      
      {verificationSent && !error && !isLogin && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
          <p>Verification email sent! Please check your inbox to verify your account.</p>
          <button 
            onClick={resendVerificationEmail}
            className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Resend verification email
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="John Doe"
              required
            />
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              emailError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="you@example.com"
            required
          />
          {emailError && (
            <p className="mt-1 text-sm text-red-600">{emailError}</p>
          )}
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              passwordValidation && !passwordValidation.isValid && !isLogin
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
            placeholder="••••••••"
            required
          />
          
          {!isLogin && passwordValidation && (
            <div className="mt-2">
              <div className="flex items-center mb-1">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      passwordValidation.strength <= 1
                        ? 'bg-red-500'
                        : passwordValidation.strength === 2
                        ? 'bg-yellow-500'
                        : passwordValidation.strength === 3
                        ? 'bg-yellow-400'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordValidation.strength / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {passwordValidation.strengthText}
                </span>
              </div>
              
              {passwordValidation.detailedFeedback && (
                <p className="text-sm text-gray-600">{passwordValidation.detailedFeedback}</p>
              )}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading || (!isLogin && emailError)}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 px-4 rounded-md hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            isLogin ? 'Sign In' : 'Create Account'
          )}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setEmailError('');
            setVerificationSent(false);
            setPasswordValidation(null);
          }}
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
} 