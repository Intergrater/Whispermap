/**
 * WhisperMap Setup Script
 * 
 * This script ensures all required directories exist and creates placeholder files
 * for sound effects if they don't exist.
 */

const fs = require('fs');
const path = require('path');

// Define required directories
const directories = [
  'data',
  'uploads',
  'public/sounds',
  'public/images'
];

// Define placeholder sound files
const soundFiles = [
  'public/sounds/record-start.mp3',
  'public/sounds/record-stop.mp3',
  'public/sounds/success.mp3',
  'public/sounds/error.mp3',
  'public/sounds/location.mp3',
  'public/sounds/premium.mp3'
];

// Create a minimal valid MP3 file (1-byte silent MP3)
const silentMp3 = Buffer.from([0xFF, 0xE0, 0x00, 0x00]);

// Create directories if they don't exist
console.log('Setting up WhisperMap directories...');
directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Create placeholder sound files if they don't exist
console.log('Setting up placeholder sound files...');
soundFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    console.log(`Creating placeholder sound file: ${file}`);
    fs.writeFileSync(filePath, silentMp3);
  }
});

// Create a simple favicon if it doesn't exist
const faviconPath = path.join(__dirname, '..', 'public/images/favicon.ico');
if (!fs.existsSync(faviconPath) || fs.statSync(faviconPath).size === 0) {
  console.log('Creating placeholder favicon');
  // Simple 16x16 ICO file header
  const faviconData = Buffer.from([
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10,
    0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x68, 0x04,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ]);
  fs.writeFileSync(faviconPath, faviconData);
}

console.log('WhisperMap setup complete!'); 