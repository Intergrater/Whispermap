import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// In-memory storage for whispers
export let whispers = [];

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory at:', uploadsDir);
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle GET request
  if (req.method === 'GET') {
    console.log('GET /api/whispers - Returning', whispers.length, 'whispers');
    return res.status(200).json(whispers);
  }
  
  // Handle POST request
  if (req.method === 'POST') {
    console.log('POST /api/whispers - Processing new whisper upload');
    
    // Create a new formidable form instance
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    return new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Error parsing form:', err);
          res.status(500).json({ error: 'Error parsing form data' });
          return resolve();
        }
        
        try {
          console.log('Form fields:', fields);
          console.log('Files received:', Object.keys(files));
          
          // Check if audio file exists
          if (!files.audio) {
            console.error('No audio file provided');
            res.status(400).json({ error: 'No audio file provided' });
            return resolve();
          }
          
          const audioFile = files.audio;
          
          // Check location data
          if (!fields.latitude || !fields.longitude) {
            console.error('Missing location data');
            res.status(400).json({ error: 'Location data is required' });
            return resolve();
          }
          
          // Generate a unique ID and filename
          const fileId = uuidv4();
          const fileExt = path.extname(audioFile.originalFilename || '.wav');
          const fileName = `${fileId}${fileExt}`;
          const filePath = path.join(uploadsDir, fileName);
          
          console.log('Saving file to:', filePath);
          
          // Ensure the uploads directory exists
          if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
          }
          
          // Copy the file to the uploads directory
          const data = fs.readFileSync(audioFile.filepath);
          fs.writeFileSync(filePath, data);
          
          // Clean up the temp file
          fs.unlinkSync(audioFile.filepath);
          
          console.log('File saved successfully');
          
          // Create the whisper object
          const newWhisper = {
            id: fileId,
            audioUrl: `/uploads/${fileName}`,
            location: {
              lat: parseFloat(fields.latitude),
              lng: parseFloat(fields.longitude),
            },
            category: fields.category || 'general',
            title: fields.title || 'Untitled Whisper',
            description: fields.description || '',
            timestamp: fields.timestamp || new Date().toISOString(),
            isAnonymous: fields.isAnonymous === 'true',
            userId: fields.isAnonymous === 'true' ? 'anonymous' : (req.headers['user-id'] || 'anonymous'),
          };
          
          console.log('Created new whisper:', newWhisper);
          
          // Add to whispers array
          whispers.unshift(newWhisper);
          
          // Return success response
          res.status(201).json(newWhisper);
          return resolve();
        } catch (error) {
          console.error('Error processing whisper:', error);
          res.status(500).json({ error: 'Failed to process whisper: ' + error.message });
          return resolve();
        }
      });
    });
  }
  
  // Handle unsupported methods
  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
} 