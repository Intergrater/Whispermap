import { whispers } from '../../whispers';

export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  console.log('Fetching whispers for user ID:', id);
  console.log('Total whispers available:', whispers.length);

  // Filter whispers by user ID and exclude anonymous whispers
  const userWhispers = whispers.filter(whisper =>
    whisper.userId === id && !whisper.isAnonymous
  );

  console.log('Found whispers for user:', userWhispers.length);

  return res.status(200).json(userWhispers);
} 