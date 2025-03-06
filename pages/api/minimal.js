// Minimal API route for testing Vercel deployment
export default function handler(req, res) {
  res.status(200).json({
    success: true,
    message: 'Minimal API is working',
    timestamp: new Date().toISOString()
  });
} 