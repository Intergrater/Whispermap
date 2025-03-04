export default function handler(req, res) {
  console.log('Test API called with method:', req.method);
  
  // Return information about the request
  res.status(200).json({
    message: 'API test endpoint is working',
    method: req.method,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
} 