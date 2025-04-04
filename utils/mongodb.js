import { MongoClient } from 'mongodb';

// MongoDB connection URI and database name
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'whispermap';

// Cache the database connection
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    console.log('Connecting to MongoDB...');
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }
    
    if (!MONGODB_DB) {
      throw new Error('MONGODB_DB is not defined');
    }

    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = client.db(MONGODB_DB);

    // Test the connection
    await db.command({ ping: 1 });
    console.log('Successfully connected to MongoDB');

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
} 