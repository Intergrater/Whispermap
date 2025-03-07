# WhisperMap

WhisperMap is a location-based audio sharing application that allows users to leave voice messages (whispers) at specific locations for others to discover.

## Features

- Record and share audio whispers tied to specific locations
- Discover whispers left by others nearby
- Set expiration dates for whispers
- Premium features for enhanced experience

## New Security Features

- Email verification for new accounts
- Strong password requirements
- Prevention of duplicate accounts with the same email

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/whispermap.git
   cd whispermap
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up Firebase:
   - Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Enable Email/Password authentication in the Firebase console
   - Create a web app in your Firebase project
   - Copy the Firebase configuration

4. Create a `.env.local` file in the root directory with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

5. Run the development server:
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

1. Create a backup branch before deployment:
   ```
   git branch backup-before-auth
   ```

2. Commit your changes:
   ```
   git add .
   git commit -m "Secure login and signup with email verification and strong passwords"
   git push origin main
   ```

3. Deploy to Vercel:
   - Connect your GitHub repository to Vercel
   - Add the environment variables from your `.env.local` file to the Vercel project
   - Deploy the project

## Testing

1. Test user registration:
   - Try to sign up with a new email
   - Verify that password strength validation works
   - Check your email for the verification link
   - Verify that you can't log in until your email is verified

2. Test duplicate email prevention:
   - Try to sign up with an email that's already registered
   - Verify that you get an error message

3. Test login with unverified email:
   - Try to log in with an unverified email
   - Verify that you get an error message and an option to resend the verification email

4. Test login with verified email:
   - Verify your email using the verification link
   - Log in with your verified email
   - Verify that you can access the app

## License

MIT 