import multer from 'multer';
import { createRouter } from 'next-connect';
import path from 'path';
import fs from 'fs';

// In-memory storage for whispers (will reset on each deployment)
// For production, use a database like MongoDB, Firebase, or Supabase
let whispers = [];

// Configure multer for memory storage (for Vercel)
const upload = multer({
  storage: multer.memoryStorage()
});

// Create API router
const apiRoute = createRouter();

// Middleware to handle file uploads
apiRoute.use(upload.single('audio'));

// GET endpoint to retrieve whispers
apiRoute.get((req, res) => {
  res.status(200).json(whispers);
});

// POST endpoint to create a new whisper
apiRoute.post((req, res) => {
  try {
    const { file, body } = req;
    
    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    if (!body.location) {
      return res.status(400).json({ error: 'No location provided' });
    }
    
    const location = JSON.parse(body.location);
    
    // For Vercel, we'll use a data URI instead of saving to disk
    const audioDataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    
    const newWhisper = {
      id: Date.now().toString(),
      audioUrl: audioDataUri, // Use data URI instead of file path
      location,
      timestamp: body.timestamp || new Date().toISOString(),
    };
    
    whispers.push(newWhisper);
    
    res.status(201).json(newWhisper);
  } catch (error) {
    console.error('Error creating whisper:', error);
    res.status(500).json({ error: 'Failed to create whisper' });
  }
});

// Export the handler
export default apiRoute.handler();

// Configure Next.js to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}; 