import formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import { put } from '@vercel/blob';
import { whispers } from './whispers';

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  console.log('POST /api/upload-whisper - Processing fallback upload');
  
  try {
    // Create a new formidable form instance
    const form = new formidable.IncomingForm({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 20 * 1024 * 1024, // 20MB
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
          
          // Check location data
          if (!fields.latitude || !fields.longitude) {
            console.error('Missing location data in the request');
            res.status(400).json({ error: 'Location data is required' });
            return resolve();
          }
          
          // Generate a unique ID and filename
          const fileId = uuidv4();
          const fileExt = audioFile.originalFilename ? 
            audioFile.originalFilename.split('.').pop() : 'wav';
          const fileName = `${fileId}.${fileExt}`;
          
          try {
            // Read the file into a buffer
            const fs = require('fs');
            const fileBuffer = fs.readFileSync(audioFile.filepath);
            
            // Upload to Vercel Blob Storage
            console.log('Uploading to Vercel Blob Storage...');
            const blob = await put(fileName, fileBuffer, {
              access: 'public',
              contentType: audioFile.mimetype || 'audio/wav',
            });
            
            console.log('File uploaded successfully to:', blob.url);
            
            // Create the whisper object
            const newWhisper = {
              id: fileId,
              audioUrl: blob.url, // Use the Blob Storage URL
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
          } catch (uploadError) {
            console.error('Error uploading file to Blob Storage:', uploadError);
            res.status(500).json({ error: 'Failed to upload audio file: ' + uploadError.message });
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
} 