import { createRouter } from 'next-connect';

const router = createRouter();

// In-memory storage for follows (replace with a database in production)
const follows = [];

router.post(async (req, res) => {
  const { userId, followId } = req.body;
  
  if (!userId || !followId) {
    return res.status(400).json({ error: 'Both userId and followId are required' });
  }
  
  // Check if already following
  const alreadyFollowing = follows.some(
    follow => follow.userId === userId && follow.followId === followId
  );
  
  if (alreadyFollowing) {
    return res.status(400).json({ error: 'Already following this user' });
  }
  
  // Add follow relationship
  follows.push({ userId, followId, timestamp: new Date().toISOString() });
  
  res.status(200).json({ success: true });
});

router.delete(async (req, res) => {
  const { userId, followId } = req.body;
  
  if (!userId || !followId) {
    return res.status(400).json({ error: 'Both userId and followId are required' });
  }
  
  // Remove follow relationship
  const index = follows.findIndex(
    follow => follow.userId === userId && follow.followId === followId
  );
  
  if (index === -1) {
    return res.status(400).json({ error: 'Not following this user' });
  }
  
  follows.splice(index, 1);
  
  res.status(200).json({ success: true });
});

export default router.handler();

export const config = {
  api: {
    bodyParser: true,
  },
}; 