// This file redirects to the /api/whispers/index.js endpoint
export default function handler(req, res) {
  // Redirect to the correct endpoint
  res.redirect(307, '/api/whispers/index');
} 