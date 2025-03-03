/**
 * WhisperMap Configuration
 * Loads environment variables and provides configuration for the application
 */

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Configuration object
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  
  // API Keys
  keys: {
    stripe: {
      public: process.env.STRIPE_PUBLIC_KEY,
      secret: process.env.STRIPE_SECRET_KEY,
    },
    mapbox: process.env.MAPBOX_API_KEY,
    analytics: process.env.ANALYTICS_KEY,
  },
  
  // Database configuration
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  
  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY,
  },
  
  // Storage configuration
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    bucket: process.env.CLOUD_STORAGE_BUCKET,
  },
  
  // Feature flags and settings
  features: {
    enablePremium: process.env.ENABLE_PREMIUM_FEATURES === 'true',
    defaultWhisperRadius: parseInt(process.env.DEFAULT_WHISPER_RADIUS || 100, 10),
    maxRecordingTime: parseInt(process.env.MAX_RECORDING_TIME || 60, 10),
  },
};

module.exports = config; 