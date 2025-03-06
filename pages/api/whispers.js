import formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Disable the Next.js body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// File path for persistent storage
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'whispers.json');

// Initialize whispers array from file or create empty array
export let whispers = [];

// Load whispers from file if it exists
try {
  // Ensure the data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Check if the whispers file exists
  if (fs.existsSync(DATA_FILE_PATH)) {
    const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    whispers = JSON.parse(data);
    console.log(`Loaded ${whispers.length} whispers from file`);
  } else {
    // Create empty file if it doesn't exist
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify([]));
    console.log('Created empty whispers file');
  }
} catch (error) {
  console.error('Error loading whispers from file:', error);
  // Continue with empty array if there's an error
  whispers = [];
}

// Function to save whispers to file
function saveWhispersToFile() {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(whispers, null, 2));
    console.log(`Saved ${whispers.length} whispers to file`);
  } catch (error) {
    console.error('Error saving whispers to file:', error);
  }
}

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
    console.log('Current date for expiration check:', currentDate.toISOString());
    
    const activeWhispers = whispers.filter(whisper => {
      // If whisper has an expiration date, check if it's expired
      if (whisper.expirationDate) {
        const expirationDate = new Date(whisper.expirationDate);
        const isActive = expirationDate > currentDate;
        console.log(`Whisper ${whisper.id} expiration: ${expirationDate.toISOString()}, isActive: ${isActive}`);
        return isActive;
      }
      // If no expiration date, assume it's valid for 7 days from timestamp
      if (whisper.timestamp) {
        const timestamp = new Date(whisper.timestamp);
        const defaultExpiration = new Date(timestamp);
        defaultExpiration.setDate(defaultExpiration.getDate() + 7);
        const isActive = defaultExpiration > currentDate;
        console.log(`Whisper ${whisper.id} default expiration: ${defaultExpiration.toISOString()}, isActive: ${isActive}`);
        return isActive;
      }
      // If no timestamp either, keep it (shouldn't happen)
      console.log(`Whisper ${whisper.id} has no expiration or timestamp, keeping it`);
      return true;
    });
    
    // If we filtered out any expired whispers, update the main array and save to file
    if (activeWhispers.length < whispers.length) {
      console.log(`Removing ${whispers.length - activeWhispers.length} expired whispers`);
      whispers = activeWhispers;
      saveWhispersToFile();
    }
    
    console.log(`Filtered ${whispers.length} whispers to ${activeWhispers.length} active whispers`);
    
    // Check if location and radius parameters are provided
    const { latitude, longitude, radius } = req.query;
    
    if (latitude && longitude && radius) {
      // Filter whispers by distance
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const searchRadius = parseFloat(radius);
      
      console.log(`Filtering whispers near [${lat}, ${lng}] with radius ${searchRadius}m`);
      
      // Filter whispers by distance with detailed logging
      const filteredWhispers = activeWhispers.filter(whisper => {
        if (whisper.location && whisper.location.lat && whisper.location.lng) {
          // Calculate distance between points
          const distance = calculateDistance(
            lat, 
            lng, 
            whisper.location.lat, 
            whisper.location.lng
          );
          
          // Log each whisper's distance for debugging
          const isInRange = distance <= searchRadius;
          console.log(`Whisper ${whisper.id} distance: ${distance.toFixed(2)}m, radius: ${searchRadius}m, in range: ${isInRange}`);
          
          // If the whisper has its own radius property, use the larger of the two
          if (whisper.radius) {
            const whisperRadius = parseFloat(whisper.radius);
            const effectiveRadius = Math.max(searchRadius, whisperRadius);
            const isInEffectiveRange = distance <= effectiveRadius;
            
            console.log(`Whisper ${whisper.id} has custom radius: ${whisperRadius}m, effective radius: ${effectiveRadius}m, in effective range: ${isInEffectiveRange}`);
            
            return isInEffectiveRange;
          }
          
          return isInRange;
        }
        return false;
      });
      
      console.log(`Returning ${filteredWhispers.length} whispers within range`);
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
            const audioData = fs.readFileSync(files.audio.filepath);
            const mimeType = files.audio.mimetype || 'audio/wav';
            const base64Audio = Buffer.from(audioData).toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64Audio}`;
            
            // Parse expiration days from the form data or use default
            let expirationDays = 7; // Default to 7 days
            if (fields.expirationDate) {
              // If an explicit expiration date is provided, use it directly
              const expirationDate = new Date(fields.expirationDate);
              console.log(`Using provided expiration date: ${expirationDate.toISOString()}`);
            } else if (fields.expirationDays) {
              // If expiration days is provided, calculate from current date
              expirationDays = parseInt(fields.expirationDays, 10) || 7;
              console.log(`Using provided expiration days: ${expirationDays}`);
            }
            
            // Calculate expiration date
            const expirationDate = fields.expirationDate ? new Date(fields.expirationDate) : new Date();
            if (!fields.expirationDate) {
              expirationDate.setDate(expirationDate.getDate() + expirationDays);
            }
            console.log(`Setting whisper expiration to: ${expirationDate.toISOString()}`);
            
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
              expirationDate: expirationDate.toISOString(),
              isAnonymous: fields.isAnonymous === 'true',
              userId: req.headers['user-id'] || null,
              radius: parseFloat(fields.radius) || 100,
            };
            
            console.log('Created new whisper with ID:', fileId);
            
            // Save to the in-memory array
            whispers.unshift(newWhisper);
            
            // Save to file for persistence
            saveWhispersToFile();
            
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