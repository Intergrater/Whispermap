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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// In-memory whispers storage (replace with a database in production)
let whispers = [];

const router = createRouter();

// GET all whispers
router.get(async (req, res) => {
  res.status(200).json(whispers);
});

// POST a new whisper
router.post(async (req, res) => {
  const form = new formidable.IncomingForm();
  
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
      
      // Generate unique filename
      const fileId = uuidv4();
      const fileExt = path.extname(audioFile.originalFilename || '.wav');
      const fileName = `${fileId}${fileExt}`;
      const filePath = path.join(uploadsDir, fileName);
      
      // Save the file
      await fs.promises.copyFile(audioFile.filepath, filePath);
      
      // Create whisper object
      const whisper = {
        id: fileId,
        audioUrl: `/uploads/${fileName}`,
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