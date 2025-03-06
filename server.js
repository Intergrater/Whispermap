const express = require('express');
const next = require('next');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Note: We're not creating an uploads directory anymore
// Audio files are stored as base64 data URLs in memory

app.prepare().then(() => {
  const server = express();
  
  // Middleware
  server.use(cors());
  server.use(compression());
  
  // Serve static files from public directory
  server.use(express.static(path.join(process.cwd(), 'public')));
  
  // IMPORTANT: We're disabling the Express API routes and only using Next.js API routes
  // server.use('/api', require('./server/routes')); - REMOVED
  
  console.log('Server setup: Using Next.js API routes exclusively');
  console.log('API routes will be handled by Next.js from the pages/api directory');
  
  // Let Next.js handle all routes including API routes
  server.all('*', (req, res) => {
    if (req.method === 'POST' && req.url.startsWith('/api/whispers')) {
      console.log(`Server received whisper upload request: ${req.method} ${req.url}`);
    }
    return handle(req, res);
  });
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    console.log(`> API routes are handled by Next.js in pages/api`);
  });
}); 