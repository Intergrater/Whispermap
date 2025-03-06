// Test script for the whispers API endpoint
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

async function testWhisperApi() {
  try {
    console.log('Starting whisper API test...');
    
    // Create a test audio file if it doesn't exist
    const testDir = path.join(process.cwd(), 'test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testAudioPath = path.join(testDir, 'test-audio.wav');
    
    // If test file doesn't exist, create a simple one
    if (!fs.existsSync(testAudioPath)) {
      console.log('Creating test audio file...');
      // Create a simple WAV file (this is just a placeholder, not a real audio file)
      const header = Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xAC\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00', 'binary');
      fs.writeFileSync(testAudioPath, header);
    }
    
    // Create form data
    const form = new FormData();
    form.append('audio', fs.createReadStream(testAudioPath));
    form.append('latitude', '37.7749');
    form.append('longitude', '-122.4194');
    form.append('category', 'test');
    form.append('title', 'Test Whisper');
    form.append('description', 'This is a test whisper');
    form.append('timestamp', new Date().toISOString());
    form.append('isAnonymous', 'false');
    
    console.log('Sending test request to API...');
    
    // Send the request
    const response = await fetch('http://localhost:3000/api/whispers', {
      method: 'POST',
      body: form,
    });
    
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Whisper created:', data);
    } else {
      const text = await response.text();
      console.error('Error response:', text);
      try {
        const errorData = JSON.parse(text);
        console.error('Error details:', errorData);
      } catch (e) {
        console.error('Could not parse error response as JSON');
      }
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testWhisperApi();

// Instructions to run this test:
// 1. Make sure your Next.js server is running (npm run dev)
// 2. Install dependencies: npm install node-fetch@2 form-data
// 3. Run this script: node test-whisper-api.js 