const express = require('express');
const next = require('next');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.prepare().then(() => {
  const server = express();
  
  // Middleware
  server.use(cors());
  server.use(compression());
  server.use(bodyParser.json());
  
  // Serve static files from public directory
  server.use(express.static(path.join(process.cwd(), 'public')));
  
  // Your API routes
  server.use('/api', require('./server/routes'));
  
  // Let Next.js handle all other routes
  server.all('*', (req, res) => {
    return handle(req, res);
  });
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}); 