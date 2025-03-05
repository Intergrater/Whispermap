import formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';

// Disable the Next.js body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// In-memory storage for whispers (will reset each deployment)
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
  
  // Handle OPTIONS request (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');
    return res.status(200).end();
  }
  
  // Handle GET requests
  if (req.method === 'GET') {
    console.log('GET /api/whispers - Processing request');
    
    // Filter out expired whispers
    const currentDate = new Date();
    const activeWhispers = whispers.filter(whisper => {
      // If whisper has an expiration date, check if it's expired
      if (whisper.expirationDate) {
        const expirationDate = new Date(whisper.expirationDate);
        return expirationDate > currentDate;
      }
      // If no expiration date, assume it's valid for 7 days from timestamp
      if (whisper.timestamp) {
        const timestamp = new Date(whisper.timestamp);
        const defaultExpiration = new Date(timestamp);
        defaultExpiration.setDate(defaultExpiration.getDate() + 7);
        return defaultExpiration > currentDate;
      }
      // If no timestamp either, keep it (shouldn't happen)
      return true;
    });
    
    // Check if location and radius parameters are provided
    const { latitude, longitude, radius } = req.query;
    
    if (latitude && longitude && radius) {
      // Filter whispers by distance
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const searchRadius = parseFloat(radius);
      
      console.log(`Filtering whispers near [${lat}, ${lng}] with radius ${searchRadius}m`);
      
      // Filter whispers by distance
      const filteredWhispers = activeWhispers.filter(whisper => {
        if (whisper.location && whisper.location.lat && whisper.location.lng) {
          // Calculate distance between points
          const distance = calculateDistance(
            lat, 
            lng, 
            whisper.location.lat, 
            whisper.location.lng
          );
          
          return distance <= searchRadius;
        }
        return false;
      });
      
      console.log(`Returning ${filteredWhispers.length} whispers within ${searchRadius}m`);
      return res.status(200).json(filteredWhispers);
    }
    
    console.log('GET /api/whispers - Returning all active whispers');
    return res.status(200).json(activeWhispers);
  }
  
  // Handle POST requests
  if (req.method === 'POST') {
    console.log('POST /api/whispers - Processing new whisper upload');
    
    try {
      // Create a formidable form instance
      const form = new formidable.IncomingForm({
        multiples: false,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        uploadDir: '/tmp', // Writable directory in Vercel
      });
      
      return new Promise((resolve) => {
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
            
            // Check location data
            if (!fields.latitude || !fields.longitude) {
              console.error('Missing location data in the request');
              res.status(400).json({ error: 'Location data is required' });
              return resolve();
            }
            
            // Generate a unique ID for the new whisper
            const fileId = uuidv4();
            
            // Convert the uploaded file to base64 instead of writing to filesystem
            const fs = require('fs');
            const audioData = fs.readFileSync(files.audio.filepath);
            const mimeType = files.audio.mimetype || 'audio/wav';
            const base64Audio = Buffer.from(audioData).toString('base64');
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
              expirationDate: fields.expirationDate || (() => {
                // Default expiration is 7 days from now
                const date = new Date();
                date.setDate(date.getDate() + 7);
                return date.toISOString();
              })(),
              isAnonymous: fields.isAnonymous === 'true',
              userId: req.headers['user-id'] || null,
              radius: parseFloat(fields.radius) || 100,
            };
            
            console.log('Created new whisper with ID:', fileId);
            
            // Save to the in-memory array
            whispers.unshift(newWhisper);
            
            // Return success
            res.status(201).json(newWhisper);
            return resolve();
          } catch (fileError) {
            console.error('Error processing audio file:', fileError);
            res.status(500).json({ error: 'Failed to process audio file: ' + fileError.message });
            return resolve();
          }
        });
      });
    } catch (formError) {
      console.error('Error creating form parser:', formError);
      res.status(500).json({ error: 'Server error: Could not process form data' });
      return;
    }
  }
  
  // Fallback: method not allowed
  console.log(`Unsupported method: ${req.method}`);
  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}

// Calculate distance between two points in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
} 