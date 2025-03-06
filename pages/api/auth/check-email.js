import { auth } from '../../../lib/firebase';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;

  // Validate email parameter
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
  }

  try {
    // Check if the email is already in use
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    
    // If there are sign-in methods, the email is already in use
    const isEmailInUse = signInMethods.length > 0;
    
    return res.status(200).json({ isEmailInUse });
  } catch (error) {
    console.error('Error checking email:', error);
    return res.status(500).json({ error: 'Failed to check email' });
  }
} 