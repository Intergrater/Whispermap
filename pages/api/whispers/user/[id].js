import { createRouter } from 'next-connect';

// In a real app, you would fetch from a database
// For now, we'll use the same in-memory storage from the main whispers endpoint
import { whispers } from '../../whispers';

const router = createRouter();

router.get(async (req, res) => {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  // Filter whispers by user ID
  const userWhispers = whispers.filter(whisper => whisper.userId === id);
  
  res.status(200).json(userWhispers);
});

export default router.handler(); 