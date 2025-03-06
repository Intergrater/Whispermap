import { createRouter } from 'next-connect';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

// In-memory whispers storage (replace with a database in production)
let whispers = [];

const router = createRouter();

// GET all whispers
router.get(async (req, res) => {
  res.status(200).json(whispers);
});

// POST a new whisper
router.post(async (req, res) => {
  const form = new formidable.IncomingForm({
    uploadDir: '/tmp', // Use /tmp for Vercel compatibility
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });
  
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing form data' });
    }
    
    try {
      const { latitude, longitude, category, timestamp } = fields;
      const audioFile = files.audio;
      
      if (!audioFile) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      
      // Generate unique ID
      const fileId = uuidv4();
      
      // Convert audio to base64 instead of saving to filesystem
      const audioData = fs.readFileSync(audioFile.filepath);
      const base64Audio = Buffer.from(audioData).toString('base64');
      const mimeType = audioFile.mimetype || 'audio/wav';
      const dataUrl = `data:${mimeType};base64,${base64Audio}`;
      
      // Create whisper object
      const whisper = {
        id: fileId,
        audioUrl: dataUrl, // Store as data URL instead of file path
        location: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
        },
        category: category || 'general',
        timestamp: timestamp || new Date().toISOString(),
        userId: req.headers['user-id'] || 'anonymous',
      };
      
      // Add to whispers array
      whispers.unshift(whisper);
      
      res.status(201).json(whisper);
    } catch (error) {
      console.error('Error saving whisper:', error);
      res.status(500).json({ error: 'Error saving whisper' });
    }
  });
});

export default router.handler(); 