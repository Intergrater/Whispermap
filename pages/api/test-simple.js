// Simple test endpoint for Vercel deployment
export default function handler(req, res) {
  // Return a success response
  return res.status(200).json({
    success: true,
    message: 'Simple test API is working',
    timestamp: new Date().toISOString()
  });
} 