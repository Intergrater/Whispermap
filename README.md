# WhisperMap

Share audio messages in the world around you.

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your API keys
4. Start the server: `npm start`

## Development

- Run in development mode: `npm run dev`
- Build for production: `npm run build`

## Deployment

This app is configured for deployment on Vercel.

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

## Environment Variables

Required environment variables:
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
- `STRIPE_PUBLIC_KEY`: Your Stripe public key
- `STRIPE_SECRET_KEY`: Your Stripe secret key

## License

MIT 