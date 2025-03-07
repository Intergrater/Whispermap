/**
 * Script to fix RangeNotSatisfiable errors by ensuring sound files exist
 * and are properly accessible.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Define sound files that need to be checked/fixed
const soundFiles = [
  { name: 'location.mp3', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_8cb749d484.mp3?filename=notification-sound-7062.mp3' },
  { name: 'error.mp3', url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=error-126627.mp3' },
  { name: 'record-start.mp3', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d1a8d6dc0f.mp3?filename=click-button-140881.mp3' },
  { name: 'record-stop.mp3', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=interface-124464.mp3' },
  { name: 'success.mp3', url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=success-1-6297.mp3' },
  { name: 'premium.mp3', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8a41b878a.mp3?filename=interface-124464.mp3' }
];

// Ensure directories exist
const soundsDir = path.join(__dirname, '..', 'public', 'sounds');
const uploadsDir = path.join(__dirname, '..', 'uploads');
const dataDir = path.join(__dirname, '..', 'data');
const whisperAudioDir = path.join(__dirname, '..', 'public', 'audio', 'whispers');

// Create directories if they don't exist
[soundsDir, uploadsDir, dataDir, whisperAudioDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Function to download a file
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    // Determine if we need http or https
    const protocol = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(destination);
    
    protocol.get(url, response => {
      // Check if response is successful
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      // Pipe the response to the file
      response.pipe(file);
      
      // Handle file completion
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${destination}`);
        resolve();
      });
    }).on('error', err => {
      // Clean up file on error
      fs.unlink(destination, () => {});
      reject(err);
    });
    
    // Handle file errors
    file.on('error', err => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

// Function to create a sample whisper audio file
function createSampleWhisperFile() {
  return new Promise((resolve, reject) => {
    const sampleWhisperId = 'sample_whisper_' + Date.now();
    const sampleWhisperPath = path.join(whisperAudioDir, `${sampleWhisperId}.mp3`);
    
    // Copy a sound file as a sample whisper
    fs.copyFile(
      path.join(soundsDir, 'success.mp3'),
      sampleWhisperPath,
      err => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`Created sample whisper: ${sampleWhisperPath}`);
        
        // Create a sample whisper data entry
        const whisperData = {
          id: sampleWhisperId,
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: Date.now(),
          radius: 100,
          type: 'public',
          audioFile: `${sampleWhisperId}.mp3`
        };
        
        // Save whisper data
        const whisperDataPath = path.join(dataDir, `${sampleWhisperId}.json`);
        fs.writeFile(
          whisperDataPath,
          JSON.stringify(whisperData, null, 2),
          err => {
            if (err) {
              reject(err);
              return;
            }
            
            console.log(`Created sample whisper data: ${whisperDataPath}`);
            resolve(sampleWhisperId);
          }
        );
      }
    );
  });
}

// Function to check file permissions and fix if needed
function checkAndFixPermissions(filePath) {
  return new Promise((resolve, reject) => {
    fs.access(filePath, fs.constants.R_OK, err => {
      if (err) {
        console.log(`Fixing permissions for: ${filePath}`);
        fs.chmod(filePath, 0o644, chmodErr => {
          if (chmodErr) {
            reject(chmodErr);
            return;
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

// Main function to fix all issues
async function fixAllIssues() {
  try {
    console.log('Starting to fix potential issues...');
    
    // Download sound files if they don't exist or are empty
    for (const sound of soundFiles) {
      const soundPath = path.join(soundsDir, sound.name);
      
      // Check if file exists and has content
      let needsDownload = false;
      
      try {
        const stats = fs.statSync(soundPath);
        if (stats.size === 0) {
          needsDownload = true;
        }
      } catch (err) {
        // File doesn't exist
        needsDownload = true;
      }
      
      if (needsDownload) {
        console.log(`Downloading sound file: ${sound.name}`);
        await downloadFile(sound.url, soundPath);
      }
      
      // Check and fix permissions
      await checkAndFixPermissions(soundPath);
    }
    
    // Create a sample whisper if none exist
    const whisperFiles = fs.readdirSync(whisperAudioDir);
    if (whisperFiles.length === 0) {
      console.log('No whisper files found, creating a sample whisper...');
      await createSampleWhisperFile();
    }
    
    console.log('All issues fixed successfully!');
  } catch (error) {
    console.error('Error fixing issues:', error);
  }
}

// Run the fix
fixAllIssues(); 