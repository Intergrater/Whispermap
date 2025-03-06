import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signOut,
  sendEmailVerification as firebaseSendEmailVerification
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Transform Firebase user to our app's user format
        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          emailVerified: firebaseUser.emailVerified,
          isPremium: false, // This would come from your premium status check
          createdAt: firebaseUser.metadata.creationTime
        };
        
        // Check if we have additional user data in localStorage
        if (typeof window !== 'undefined') {
          const storedUserData = localStorage.getItem(`user_data_${firebaseUser.uid}`);
          if (storedUserData) {
            // Merge Firebase user with stored user data
            const parsedUserData = JSON.parse(storedUserData);
            Object.assign(userData, parsedUserData);
          }
        }
        
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Clean up subscription
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateUser = (userData) => {
    if (!user) return;
    
    // Update local user state
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    
    // Store additional user data in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`user_data_${user.id}`, JSON.stringify(updatedUser));
    }
  };
  
  const sendEmailVerification = async () => {
    if (!auth.currentUser) return;
    
    try {
      await firebaseSendEmailVerification(auth.currentUser);
      return { success: true };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      logout, 
      updateUser,
      sendEmailVerification,
      isEmailVerified: user?.emailVerified || false
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
} 