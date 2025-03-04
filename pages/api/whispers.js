import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

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

// In-memory storage for whispers (will reset on each deployment)
// For production, use a database like MongoDB, Firebase, or Supabase
export let whispers = [];

export default async function handler(req, res) {
  console.log('Whispers API called with method:', req.method);
  console.log('Request headers:', req.headers);
  
  // Handle GET request
  if (req.method === 'GET') {
    console.log('Handling GET request, returning whispers array with', whispers.length, 'items');
    return res.status(200).json(whispers);
  }
  
  // Handle POST request
  if (req.method === 'POST') {
    console.log('Processing POST request to /api/whispers');
    
    try {
      const form = new formidable.IncomingForm({
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
      });
      
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Error parsing form data:', err);
          return res.status(500).json({ error: 'Error parsing form data: ' + err.message });
        }
        
        try {
          console.log('Form fields received:', Object.keys(fields));
          console.log('Form files received:', Object.keys(files));
          
          const { latitude, longitude, category, timestamp, title, description, isAnonymous } = fields;
          const audioFile = files.audio;
          
          if (!audioFile) {
            console.error('No audio file provided in the request');
            return res.status(400).json({ error: 'No audio file provided' });
          }
          
          console.log('Audio file details:', {
            name: audioFile.originalFilename,
            size: audioFile.size,
            path: audioFile.filepath,
            type: audioFile.mimetype
          });
          
          if (!latitude || !longitude) {
            console.error('No location provided in the request');
            return res.status(400).json({ error: 'No location provided' });
          }
          
          // Ensure uploads directory exists
          if (!fs.existsSync(uploadsDir)) {
            console.log('Creating uploads directory:', uploadsDir);
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          // Generate unique filename
          const fileId = uuidv4();
          const fileExt = path.extname(audioFile.originalFilename || '.wav');
          const fileName = `${fileId}${fileExt}`;
          const filePath = path.join(uploadsDir, fileName);
          
          console.log('Saving file to:', filePath);
          
          // Save the file
          await fs.promises.copyFile(audioFile.filepath, filePath);
          console.log('File saved successfully');
          
          // Create whisper object
          const newWhisper = {
            id: fileId,
            audioUrl: `/uploads/${fileName}`,
            location: {
              lat: parseFloat(latitude),
              lng: parseFloat(longitude),
            },
            category: category || 'general',
            title: title || 'Untitled Whisper',
            description: description || '',
            timestamp: timestamp || new Date().toISOString(),
            isAnonymous: isAnonymous === 'true',
            userId: isAnonymous === 'true' ? 'anonymous' : (req.headers['user-id'] || 'anonymous'),
          };
          
          console.log('Created new whisper:', newWhisper);
          
          // Add to whispers array
          whispers.unshift(newWhisper);
          
          return res.status(201).json(newWhisper);
        } catch (error) {
          console.error('Error creating whisper:', error);
          return res.status(500).json({ error: 'Failed to create whisper: ' + error.message });
        }
      });
    } catch (formError) {
      console.error('Error initializing form parser:', formError);
      return res.status(500).json({ error: 'Server error processing form: ' + formError.message });
    }
  } else {
    // Handle unsupported methods
    console.log('Unsupported method:', req.method);
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 