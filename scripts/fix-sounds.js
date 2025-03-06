const fs = require('fs');
const path = require('path');
const https = require('https');

// Create the sounds directory if it doesn't exist
const soundsDir = path.join(__dirname, '../public/sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
  console.log('Created sounds directory');
}

// Sound files to download
const soundFiles = [
  {
    name: 'record-start.mp3',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=interface-124464.mp3'
  },
  {
    name: 'record-stop.mp3',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8a73e0b0f.mp3?filename=interface-124470.mp3'
  },
  {
    name: 'success.mp3',
    url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c6a882.mp3?filename=success-1-6297.mp3'
  },
  {
    name: 'error.mp3',
    url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=error-126627.mp3'
  },
  {
    name: 'location.mp3',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=interface-124464.mp3'
  },
  {
    name: 'premium.mp3',
    url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_c9b0fde1d3.mp3?filename=success-fanfare-trumpets-6185.mp3'
  }
];

// Download each sound file
let completedDownloads = 0;

soundFiles.forEach(file => {
  const filePath = path.join(soundsDir, file.name);
  const fileStream = fs.createWriteStream(filePath);
  
  https.get(file.url, response => {
    response.pipe(fileStream);
    
    fileStream.on('finish', () => {
      fileStream.close();
      console.log(`Downloaded ${file.name}`);
      completedDownloads++;
      
      if (completedDownloads === soundFiles.length) {
        console.log('All sound files downloaded successfully!');
      }
    });
  }).on('error', err => {
    fs.unlink(filePath, () => {}); // Delete the file if there's an error
    console.error(`Error downloading ${file.name}: ${err.message}`);
  });
});

console.log('Downloading sound files...'); 