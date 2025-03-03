# WhisperMap Deployment Guide

This guide provides detailed instructions for deploying WhisperMap to various platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Deployment](#local-deployment)
3. [Web Hosting](#web-hosting)
   - [Render](#render)
   - [Heroku](#heroku)
   - [DigitalOcean](#digitalocean)
   - [Netlify](#netlify)
4. [Mobile App Stores](#mobile-app-stores)
   - [Converting to a Native App](#converting-to-a-native-app)
   - [Google Play Store](#google-play-store)
   - [Apple App Store](#apple-app-store)
5. [Domain Setup](#domain-setup)
6. [SSL/HTTPS Configuration](#sslhttps-configuration)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying WhisperMap, ensure you have:

- Node.js (v14 or higher) installed
- npm (v6 or higher) installed
- Git installed (optional but recommended)
- A GitHub, GitLab, or Bitbucket account (for some hosting options)

## Local Deployment

For local testing or development:

1. Clone or download the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`
4. Start the server:
   ```bash
   npm start
   ```
5. Access the app at `http://localhost:9000`

## Web Hosting

### Render

[Render](https://render.com/) offers a free tier and is easy to set up:

1. Create a Render account
2. Click "New Web Service"
3. Connect your GitHub/GitLab repository or upload your code
4. Configure the service:
   - Name: `whispermap`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Set environment variables in the Render dashboard
6. Click "Create Web Service"

### Heroku

[Heroku](https://www.heroku.com/) is a popular platform for Node.js apps:

1. Create a Heroku account
2. Install the Heroku CLI:
   ```bash
   npm install -g heroku
   ```
3. Login to Heroku:
   ```bash
   heroku login
   ```
4. Create a new Heroku app:
   ```bash
   heroku create whispermap
   ```
5. Add a Procfile to your project:
   ```
   web: node server/server.js
   ```
6. Set environment variables:
   ```bash
   heroku config:set PORT=9000
   ```
7. Deploy your app:
   ```bash
   git push heroku main
   ```

### DigitalOcean

For more control and scalability, [DigitalOcean](https://www.digitalocean.com/) is a good option:

1. Create a DigitalOcean account
2. Create a new Droplet (Ubuntu 20.04 recommended)
3. SSH into your Droplet
4. Install Node.js and npm:
   ```bash
   curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
5. Clone your repository:
   ```bash
   git clone https://github.com/yourusername/whispermap.git
   ```
6. Install dependencies:
   ```bash
   cd whispermap
   npm install
   ```
7. Set up PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server/server.js --name whispermap
   pm2 startup
   pm2 save
   ```
8. Set up Nginx as a reverse proxy:
   ```bash
   sudo apt-get install nginx
   ```
9. Configure Nginx:
   ```
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:9000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
10. Set up SSL with Certbot (Let's Encrypt)

### Netlify

For static site hosting with serverless functions:

1. Create a Netlify account
2. Click "New site from Git"
3. Connect your repository
4. Configure build settings:
   - Build command: `npm run build` (if you have one)
   - Publish directory: `.` (root directory)
5. Set up environment variables
6. Deploy

## Mobile App Stores

### Converting to a Native App

To convert WhisperMap to a native app for app stores:

#### Using Capacitor (Recommended)

1. Install Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init WhisperMap com.yourname.whispermap
   ```

2. Add platforms:
   ```bash
   npm install @capacitor/android @capacitor/ios
   npx cap add android
   npx cap add ios
   ```

3. Build your web app:
   ```bash
   npm run build  # If you have a build script
   ```

4. Copy web assets:
   ```bash
   npx cap copy
   ```

5. Open native IDEs:
   ```bash
   npx cap open android  # Opens Android Studio
   npx cap open ios      # Opens Xcode (Mac only)
   ```

#### Using Cordova (Alternative)

1. Install Cordova:
   ```bash
   npm install -g cordova
   cordova create whispermap-app com.yourname.whispermap WhisperMap
   ```

2. Add platforms:
   ```bash
   cd whispermap-app
   cordova platform add android
   cordova platform add ios  # Mac only
   ```

3. Copy your web app files to the `www` folder

4. Build the app:
   ```bash
   cordova build android
   cordova build ios  # Mac only
   ```

### Google Play Store

To publish on Google Play Store:

1. Create a [Google Play Developer account](https://play.google.com/console/signup) ($25 one-time fee)
2. Generate a signed APK or Android App Bundle:
   - In Android Studio: Build > Generate Signed Bundle/APK
3. Create a new app in the Google Play Console
4. Fill in all required information:
   - App details
   - Store listing
   - Content rating
   - Pricing & distribution
5. Upload your APK/AAB
6. Submit for review

### Apple App Store

To publish on Apple App Store:

1. Create an [Apple Developer account](https://developer.apple.com/programs/) ($99/year)
2. Prepare your app in Xcode:
   - Set up app icons and splash screens
   - Configure app capabilities
3. Create an App Store Connect entry
4. Archive and upload your app from Xcode
5. Fill in all required information:
   - App information
   - Pricing
   - App Review information
6. Submit for review

## Domain Setup

To use a custom domain:

1. Purchase a domain from a registrar (Namecheap, GoDaddy, Google Domains, etc.)
2. Configure DNS settings to point to your hosting provider
   - For most providers, create an A record pointing to your server's IP
   - For Netlify/Vercel/etc., use their DNS instructions
3. Configure your hosting provider to use your custom domain
4. Set up SSL/HTTPS (see below)

## SSL/HTTPS Configuration

HTTPS is required for:
- Geolocation API
- MediaRecorder API
- PWA installation

Options for SSL:

1. **Let's Encrypt** (free, recommended):
   ```bash
   sudo apt-get install certbot
   sudo certbot --nginx -d yourdomain.com
   ```

2. **Hosting provider SSL**:
   - Most providers offer free SSL certificates
   - Enable in your hosting dashboard

3. **Cloudflare** (free):
   - Sign up for Cloudflare
   - Add your domain
   - Enable Flexible/Full/Strict SSL

## Troubleshooting

### Common Issues

1. **"RangeNotSatisfiableError" for sound files**
   - Solution: Run the setup script to create valid sound files:
     ```bash
     node scripts/setup.js
     ```

2. **Geolocation not working**
   - Ensure you're using HTTPS
   - Check browser permissions
   - Try the "Retry Location" button

3. **Microphone access denied**
   - Ensure you're using HTTPS
   - Check browser permissions
   - Try a different browser

4. **Service worker not registering**
   - Ensure your app is served over HTTPS
   - Check browser console for errors

5. **App not installing as PWA**
   - Ensure manifest.json is properly configured
   - Verify service worker is registered
   - Make sure you're using HTTPS

For more help, please open an issue on the GitHub repository. 