// Test script to verify audio endpoint
const http = require('http');
const fs = require('fs');

// Get whisper ID from command line or use a default
const whisperId = process.argv[2] || 'R33NHUhrHti97bkS'; // Replace with a known whisper ID

console.log(`Testing audio endpoint for whisper ID: ${whisperId}`);

// Make a request to the audio endpoint
const options = {
    hostname: 'localhost',
    port: 9000,
    path: `/api/whispers/${whisperId}/audio`,
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    // Check if we got a successful response
    if (res.statusCode === 200) {
        console.log('Audio endpoint is working correctly!');
        
        // Save the audio to a file for verification
        const outputFile = fs.createWriteStream(`test-audio-${whisperId}.mp3`);
        res.pipe(outputFile);
        
        outputFile.on('finish', () => {
            console.log(`Audio saved to test-audio-${whisperId}.mp3`);
        });
    } else {
        console.log('Audio endpoint returned an error');
        
        // Log the response body
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Response body:', data);
        });
    }
});

req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
});

req.end(); 