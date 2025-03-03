const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WhisperMap API is running' });
});

// Sample whispers endpoint
app.get('/api/whispers', (req, res) => {
  // Return sample data for now
  res.json({
    whispers: [
      {
        id: 'sample1',
        location: { lat: 40.7128, lng: -74.0060 },
        audioUrl: 'public/sounds/notification.mp3',
        createdAt: new Date().toISOString(),
        user: 'Sample User'
      }
    ]
  });
});

// Catch-all route to serve the main HTML file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Only start the server if running directly (not in Vercel)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`WhisperMap server running on port ${port}`);
    console.log(`Local access: http://localhost:${port}`);
  });
}

// Export for Vercel
module.exports = app; 