import { createRouter } from 'next-connect';
import formidable from 'formidable';
import { connectToDatabase } from '../../../utils/mongodb';
import { v4 as uuidv4 } from 'uuid';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
};

const router = createRouter();

// GET all whispers with pagination and filtering
router.get(async (req, res) => {
  try {
    console.log('Fetching whispers with query:', req.query);
    
    const { latitude, longitude, radius = 1000, page = 1, limit = 20 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Convert radius to meters (input is in meters)
    const radiusInMeters = parseFloat(radius);
    
    // Create geospatial query
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radiusInMeters
        }
      }
    };
    
    // Get total count for pagination
    const total = await db.collection('whispers').countDocuments(query);
    
    // Fetch whispers with pagination
    const whispers = await db.collection('whispers')
      .find(query)
      .project({
        _id: 1,
        location: 1,
        timestamp: 1,
        category: 1,
        title: 1,
        description: 1,
        userId: 1,
        userName: 1,
        userProfileImage: 1,
        audioUrl: 1,
        clientAudioId: 1,
        serverAudioId: 1,
        isAnonymous: 1,
        expirationDate: 1
      })
      .sort({ timestamp: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .toArray();
    
    console.log(`Found ${whispers.length} whispers out of ${total} total`);
    
    return res.status(200).json({
      whispers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching whispers:', error);
    return res.status(500).json({ error: 'Error fetching whispers', details: error.message });
  }
});

// POST a new whisper
router.post(async (req, res) => {
  try {
    console.log('Processing new whisper upload');
    
    const form = new formidable.IncomingForm({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });
    
    console.log('Parsed form data:', { fields, files });
    
    const {
      latitude,
      longitude,
      category = 'general',
      title = '',
      description = '',
      clientAudioId,
      serverAudioId,
      isAnonymous = 'false',
      expirationDays = '7'
    } = fields;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(expirationDays));
    
    // Create whisper document
    const whisper = {
      _id: uuidv4(),
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      timestamp: new Date(),
      category,
      title,
      description,
      isAnonymous: isAnonymous === 'true',
      expirationDate,
      clientAudioId,
      serverAudioId,
      audioUrl: serverAudioId ? `server:${serverAudioId}` : clientAudioId ? `client:${clientAudioId}` : null
    };
    
    // Add user info if not anonymous
    if (!whisper.isAnonymous && req.headers['user-id']) {
      whisper.userId = req.headers['user-id'];
      whisper.userName = req.headers['user-name'] || 'Anonymous';
      whisper.userProfileImage = req.headers['user-profile-image'] || null;
    }
    
    // Insert whisper into database
    await db.collection('whispers').insertOne(whisper);
    
    console.log('Whisper created successfully:', whisper._id);
    
    return res.status(201).json({
      success: true,
      whisper: {
        ...whisper,
        _id: whisper._id.toString()
      }
    });
  } catch (error) {
    console.error('Error creating whisper:', error);
    return res.status(500).json({ error: 'Error creating whisper', details: error.message });
  }
});

export default router.handler(); 