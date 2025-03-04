// Load environment variables from .env file
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not found, using default environment variables');
}

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb');
const compression = require('compression');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 9000;
const DATA_DIR = process.env.DATA_DIR || './data';
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';
const DEFAULT_RADIUS = parseInt(process.env.DEFAULT_RADIUS || '100', 10);
const DEFAULT_EXPIRATION_HOURS = parseInt(process.env.DEFAULT_EXPIRATION_HOURS || '24', 10);
const VERBOSE_LOGGING = process.env.VERBOSE_LOGGING === 'true';

// Enable compression for all responses
app.use(compression());

// Middleware for detailed request logging
app.use((req, res, next) => {
    if (VERBOSE_LOGGING) {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} - ${req.method} ${req.url}`);
    }
    next();
});

// CORS configuration
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create data and uploads directories if they don't exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
}

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`Created uploads directory: ${UPLOADS_DIR}`);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    }
});

// Create database instances
const isVercel = false;
const db = isVercel 
  ? new Datastore() // In-memory database for Vercel
  : new Datastore({ filename: path.join(DATA_DIR, 'whispers.db'), autoload: true });

// Create indexes for faster geospatial queries
db.ensureIndex({ fieldName: 'latitude' });
db.ensureIndex({ fieldName: 'longitude' });
db.ensureIndex({ fieldName: 'timestamp' });

// Serve static files with improved error handling
app.use('/', express.static(path.join(__dirname, '..'), {
    setHeaders: (res, filePath) => {
        // Set appropriate headers for audio files
        if (path.extname(filePath) === '.mp3') {
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Accept-Ranges', 'bytes');
        }
    },
    fallthrough: true // Continue to the next middleware if the file is not found
}));

// Handle static file errors
app.use((err, req, res, next) => {
    if (err) {
        console.error('Static file error:', err.message);
        return res.status(500).send('Error serving file');
    }
    next();
});

// Calculate distance between two points in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Clean up expired whispers
function cleanupExpiredWhispers() {
    console.log('Running cleanup of expired whispers');
    
    db.find({}, (err, whispers) => {
        if (err) {
            console.error('Error finding whispers for cleanup:', err);
            return;
        }
        
        const now = Date.now();
        let cleanupCount = 0;
        
        whispers.forEach(whisper => {
            const expirationTime = whisper.timestamp + (whisper.expirationHours || DEFAULT_EXPIRATION_HOURS) * 60 * 60 * 1000;
            
            if (now > expirationTime) {
                // Remove from database
                db.remove({ _id: whisper._id }, {}, (err) => {
                    if (err) {
                        console.error(`Error removing expired whisper ${whisper._id}:`, err);
                        return;
                    }
                    
                    // Delete the audio file
                    if (whisper.audioFile) {
                        const filePath = path.join(UPLOADS_DIR, whisper.audioFile);
                        if (fs.existsSync(filePath)) {
                            fs.unlink(filePath, (err) => {
                                if (err) {
                                    console.error(`Error deleting audio file for whisper ${whisper._id}:`, err);
                                }
                            });
                        }
                    }
                    
                    cleanupCount++;
                });
            }
        });
        
        console.log(`Cleaned up ${cleanupCount} expired whispers`);
    });
}

// API Routes

// Get nearby whispers
app.get('/api/whispers', (req, res) => {
  const { latitude, longitude, radius } = req.query;
  
  if (!latitude || !longitude) {
    console.log('Error: Missing coordinates in request');
    return res.status(400).json({ error: 'Missing coordinates' });
  }
  
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const searchRadius = parseFloat(radius) || 100;
  
  console.log(`Searching for whispers near [${lat}, ${lng}] with radius ${searchRadius}m`);
  
  // Convert meters to approximate degrees (very rough approximation)
  const degreeRadius = searchRadius / 111000; // 1 degree is roughly 111km
  
  // Calculate time 24 hours ago
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  // Find whispers within the specified radius and less than 24 hours old
  db.find({
    latitude: { $gt: lat - degreeRadius, $lt: lat + degreeRadius },
    longitude: { $gt: lng - degreeRadius, $lt: lng + degreeRadius },
    timestamp: { $gt: oneDayAgo }
  }, (err, whispers) => {
    if (err) {
      console.log('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Filter whispers by actual distance
    const filteredWhispers = whispers.filter(whisper => {
      const distance = calculateDistance(lat, lng, whisper.latitude, whisper.longitude);
      return distance <= searchRadius;
    });
    
    console.log(`Found ${filteredWhispers.length} whispers within ${searchRadius}m`);
    res.json(filteredWhispers);
  });
});

// Upload a new whisper
app.post('/api/whispers', upload.single('audio'), (req, res) => {
    console.log('Received whisper upload request');
    console.log('Request body:', req.body);
    console.log('File:', req.file ? `Received file: ${req.file.filename}` : 'No file received');
    
    if (!req.file) {
        console.log('Error: No audio file uploaded');
        return res.status(400).json({ error: 'No audio file uploaded' });
    }
    
    const { latitude, longitude, type, radius, expirationHours } = req.body;
    
    if (!latitude || !longitude) {
        // Delete the uploaded file if coordinates are missing
        console.log('Error: Missing coordinates');
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Missing coordinates' });
    }
    
    const whisper = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: Date.now(),
        audioFile: req.file.filename,
        type: type || 'public',
        radius: parseFloat(radius) || DEFAULT_RADIUS,
        expirationHours: parseFloat(expirationHours) || DEFAULT_EXPIRATION_HOURS
    };
    
    db.insert(whisper, (err, newWhisper) => {
        if (err) {
            console.log('Database error:', err);
            // Delete the uploaded file if database insert fails
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`Whisper saved with ID: ${newWhisper._id}`);
        res.status(201).json(newWhisper);
    });
});

// Get a specific whisper's audio file
app.get('/api/whispers/:id/audio', (req, res) => {
    const whisperId = req.params.id;
    console.log(`Audio request for whisper ID: ${whisperId}`);
    
    // Add cache-control headers to prevent caching
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    
    db.findOne({ _id: whisperId }, (err, whisper) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!whisper) {
            console.log(`Whisper not found: ${whisperId}`);
            return res.status(404).json({ error: 'Whisper not found' });
        }
        
        const filePath = path.join(UPLOADS_DIR, whisper.audioFile);
        console.log(`Audio file path: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`Audio file not found: ${filePath}`);
            return res.status(404).json({ error: 'Audio file not found' });
        }
        
        console.log(`Sending audio file: ${filePath}`);
        
        // Get file stats for content-length and last-modified
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const lastModified = stat.mtime.toUTCString();
        
        // Set appropriate headers for audio streaming
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': fileSize,
            'Accept-Ranges': 'bytes',
            'Last-Modified': lastModified
        });
        
        // Handle range requests for better streaming
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            console.log(`Range request: ${start}-${end}/${fileSize}`);
            
            res.status(206);
            res.set({
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': chunksize
            });
            
            const stream = fs.createReadStream(filePath, { start, end });
            stream.pipe(res);
        } else {
            // Use absolute path for sendFile
            const absolutePath = path.resolve(filePath);
            console.log(`Absolute path: ${absolutePath}`);
            res.sendFile(absolutePath);
        }
    });
});

// Payment API Routes

// Record a payment
app.post('/api/payments', (req, res) => {
    const { userId, plan, amount, currency, paymentId } = req.body;
    
    if (!userId || !plan || !amount || !currency || !paymentId) {
        return res.status(400).json({ error: 'Missing required payment information' });
    }
    
    const payment = {
        userId,
        plan,
        amount: parseFloat(amount),
        currency,
        paymentId,
        timestamp: Date.now(),
        status: 'completed'
    };
    
    db.insert(payment, (err, newPayment) => {
        if (err) {
            console.error('Error saving payment:', err);
            return res.status(500).json({ error: 'Failed to save payment record' });
        }
        
        // Update user's premium status
        db.update(
            { _id: userId },
            { $set: { isPremium: true, premiumSince: Date.now() } },
            {},
            (updateErr) => {
                if (updateErr) {
                    console.error('Error updating user premium status:', updateErr);
                }
            }
        );
        
        console.log(`Payment recorded: ${newPayment._id} for user ${userId}`);
        res.status(201).json(newPayment);
    });
});

// Get payment history for a user
app.get('/api/payments/:userId', (req, res) => {
    const userId = req.params.userId;
    
    db.find({ userId }).sort({ timestamp: -1 }).exec((err, payments) => {
        if (err) {
            console.error('Error fetching payments:', err);
            return res.status(500).json({ error: 'Failed to fetch payment history' });
        }
        
        res.json(payments);
    });
});

// Run cleanup every hour
setInterval(cleanupExpiredWhispers, 60 * 60 * 1000);

// Serve index.html for all routes (SPA support)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404s
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`WhisperMap server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  
  // Get network IP for access from other devices
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIp = '';
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
    if (localIp) break;
  }
  
  if (localIp) {
    console.log(`Network access: http://${localIp}:${PORT}`);
  }
}); 