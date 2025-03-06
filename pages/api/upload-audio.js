import formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// In-memory storage for whispers (will reset on deployment)
export let whispers = [];

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  console.log('Processing audio upload...');
  
  try {
    // Parse the form data
    const form = new formidable.IncomingForm({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        return res.status(500).json({ error: 'Error parsing form data' });
      }
      
      try {
        console.log('Fields received:', Object.keys(fields));
        console.log('Files received:', Object.keys(files));
        
        // Check if audio file exists
        if (!files.audio) {
          console.error('No audio file provided');
          return res.status(400).json({ error: 'No audio file provided' });
        }
        
        // Check location data
        if (!fields.latitude || !fields.longitude) {
          console.error('Missing location data');
          return res.status(400).json({ error: 'Location data is required' });
        }
        
        // Generate a unique ID
        const fileId = uuidv4();
        
        // Instead of saving the file, we'll use a data URL
        // This is a temporary solution until we set up proper storage
        const fs = require('fs');
        const audioData = fs.readFileSync(files.audio.filepath);
        const base64Audio = Buffer.from(audioData).toString('base64');
        const mimeType = files.audio.mimetype || 'audio/wav';
        const dataUrl = `data:${mimeType};base64,${base64Audio}`;
        
        // Create the whisper object
        const newWhisper = {
          id: fileId,
          audioUrl: dataUrl,
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
        
        console.log('Created new whisper with ID:', fileId);
        
        // Add to whispers array
        whispers.unshift(newWhisper);
        
        // Return success response
        return res.status(201).json(newWhisper);
      } catch (error) {
        console.error('Error processing whisper:', error);
        return res.status(500).json({ error: 'Failed to process whisper: ' + error.message });
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
} 