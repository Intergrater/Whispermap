export default function handler(req, res) {
  console.log('Test API called with method:', req.method);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, user-id');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle all methods
  return res.status(200).json({
    success: true,
    method: req.method,
    message: `Received ${req.method} request successfully`,
    timestamp: new Date().toISOString()
  });
} 