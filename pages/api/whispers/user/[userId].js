import { whispers } from '../../whispers';

export default function handler(req, res) {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  // Filter whispers by user ID and non-anonymous
  const userWhispers = whispers.filter(whisper => 
    whisper.userId === userId && whisper.isAnonymous === false
  );
  
  console.log(`Found ${userWhispers.length} whispers for user ${userId}`);
  
  return res.status(200).json(userWhispers);
} 