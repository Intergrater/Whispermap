const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: './public/uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
});

// Make sure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// In-memory storage for whispers (replace with a database in production)
let whispers = [];

// GET endpoint to retrieve whispers
router.get('/whispers', (req, res) => {
  res.status(200).json(whispers);
});

// POST endpoint to create a new whisper
router.post('/whispers', upload.single('audio'), (req, res) => {
  try {
    const { file, body } = req;
    
    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    if (!body.location) {
      return res.status(400).json({ error: 'No location provided' });
    }
    
    const location = JSON.parse(body.location);
    
    const newWhisper = {
      id: Date.now().toString(),
      audioUrl: `/uploads/${file.filename}`,
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

module.exports = router; 