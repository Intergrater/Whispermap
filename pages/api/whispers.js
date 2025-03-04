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
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory at:', uploadsDir);
  }
} catch (error) {
  console.error('Error creating uploads directory:', error);
}

export default async function handler(req, res) {
  console.log(`API Request: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request (CORS preflight)');
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
      // Create a new formidable form instance with more permissive options
      const form = new formidable.IncomingForm({
        multiples: false,
        keepExtensions: true,
        maxFileSize: 20 * 1024 * 1024, // 20MB
        uploadDir: uploadsDir,
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
            
            // Generate a unique ID and filename
            const fileId = uuidv4();
            const fileExt = path.extname(audioFile.originalFilename || '.wav');
            const fileName = `${fileId}${fileExt}`;
            const filePath = path.join(uploadsDir, fileName);
            
            console.log('Saving file to:', filePath);
            
            try {
              // First attempt: Try to copy the file using fs.copyFile
              try {
                await fs.promises.copyFile(audioFile.filepath, filePath);
                console.log('File copied successfully using fs.copyFile');
              } catch (copyError) {
                console.warn('Error using fs.copyFile, falling back to read/write:', copyError.message);
                
                // Second attempt: Try to copy using readFile/writeFile
                const data = fs.readFileSync(audioFile.filepath);
                fs.writeFileSync(filePath, data);
                console.log('File copied successfully using readFile/writeFile');
              }
              
              // Try to clean up the temp file, but don't fail if it doesn't work
              try {
                fs.unlinkSync(audioFile.filepath);
                console.log('Temp file cleaned up successfully');
              } catch (unlinkError) {
                console.warn('Could not delete temp file:', unlinkError.message);
              }
              
              console.log('File saved successfully at:', filePath);
              console.log('File is accessible:', fs.existsSync(filePath) ? 'Yes' : 'No');
              
              // Verify the file was saved correctly
              if (!fs.existsSync(filePath)) {
                throw new Error('File was not saved correctly');
              }
            } catch (fileError) {
              console.error('Error saving file:', fileError);
              res.status(500).json({ error: 'Failed to save audio file: ' + fileError.message });
              return resolve();
            }
            
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