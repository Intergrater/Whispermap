# WhisperMap

A location-based audio sharing application.

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.local` file with your Google Maps API key:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```
4. Run the development server:
   ```
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- Record audio messages
- Share messages tied to specific locations
- Discover messages left by others nearby
- Interactive map interface

## Technologies

- Next.js
- React
- Express
- Tailwind CSS
- Google Maps API

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