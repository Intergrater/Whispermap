import formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// In-memory storage for whispers
export let whispers = [];

export default async function handler(req, res) {
  console.log('API Request received:', {
    method: req.method,
    url: req.url,
    headers: req.headers
  });
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    // Respond to CORS preflight requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
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
    
    try {
      // Create a new formidable form instance with temporary directory set to /tmp
      const form = new formidable.IncomingForm({
        multiples: false,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        uploadDir: '/tmp' // Use /tmp directory which is writable in Vercel
      });
      
      return new Promise((resolve, reject) => {
        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error('Error parsing form:', err);
            res.status(500).json({ error: 'Error parsing form data: ' + err.message });
            return resolve();
          }
          
          try {
            console.log('Form fields received:', Object.keys(fields));
            console.log('Files received:', Object.keys(files));
            
            // Check if audio file exists
            if (!files.audio) {
              console.error('No audio file provided in the request');
              res.status(400).json({ error: 'No audio file provided' });
              return resolve();
            }
            
            const audioFile = files.audio;
            console.log('Audio file details:', {
              name: audioFile.originalFilename,
              size: audioFile.size,
              type: audioFile.mimetype,
              path: audioFile.filepath
            });
            
            // Check location data
            if (!fields.latitude || !fields.longitude) {
              console.error('Missing location data in the request');
              res.status(400).json({ error: 'Location data is required' });
              return resolve();
            }
            
            // Generate a unique ID
            const fileId = uuidv4();
            
            try {
              // Read the file into a base64 string instead of saving it
              const fs = require('fs');
              const audioData = fs.readFileSync(audioFile.filepath);
              const base64Audio = Buffer.from(audioData).toString('base64');
              const mimeType = audioFile.mimetype || 'audio/wav';
              const dataUrl = `data:${mimeType};base64,${base64Audio}`;
              
              // Create the whisper object with the data URL
              const newWhisper = {
                id: fileId,
                audioUrl: dataUrl, // Use data URL instead of file path
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
              res.status(201).json(newWhisper);
              return resolve();
            } catch (fileError) {
              console.error('Error processing audio file:', fileError);
              res.status(500).json({ error: 'Failed to process audio file: ' + fileError.message });
              return resolve();
            }
          } catch (error) {
            console.error('Error processing whisper:', error);
            res.status(500).json({ error: 'Failed to process whisper: ' + error.message });
            return resolve();
          }
        });
      });
    } catch (formError) {
      console.error('Error creating form parser:', formError);
      res.status(500).json({ error: 'Server error: Could not process form data' });
    }
    
    return;
  }
  
  // Handle unsupported methods
  console.log(`Unsupported method: ${req.method}`);
  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
} 