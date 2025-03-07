const fs = require('fs');
const path = require('path');

// Create the images directory if it doesn't exist
const imagesDir = path.join(__dirname, '../public/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log('Created images directory');
}

// Generate a simple SVG icon with the letter "W" for WhisperMap
function generateSVGIcon(size, color = '#1a1a2e', textColor = '#ffffff') {
  const fontSize = Math.floor(size * 0.6);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.2}" ry="${size * 0.2}" />
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central">W</text>
    <circle cx="${size * 0.7}" cy="${size * 0.3}" r="${size * 0.1}" fill="#4b7bec" />
  </svg>`;
}

// Convert SVG to PNG using a data URL in a canvas (Node.js doesn't have built-in SVG to PNG conversion)
// This is a placeholder - in a real app, you'd use a proper image processing library
function savePlaceholderPNG(filename, size) {
  const svgContent = generateSVGIcon(size);
  fs.writeFileSync(path.join(imagesDir, filename.replace('.png', '.svg')), svgContent);
  console.log(`Generated ${filename.replace('.png', '.svg')}`);
}

// Generate icons in different sizes
const iconSizes = [192, 512];
iconSizes.forEach(size => {
  savePlaceholderPNG(`icon-${size}x${size}.png`, size);
});

// Generate a simple screenshot placeholder
const screenshotSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#1a1a2e" />
  <rect x="40" y="40" width="1200" height="640" fill="#2d2d42" rx="20" ry="20" />
  <text x="640" y="200" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="#ffffff" text-anchor="middle">WhisperMap</text>
  <text x="640" y="280" font-family="Arial, sans-serif" font-size="30" fill="#cccccc" text-anchor="middle">Share audio messages in the world around you</text>
  <circle cx="640" cy="400" r="100" fill="#4b7bec" />
  <rect x="600" y="380" width="80" height="40" fill="#ffffff" rx="5" ry="5" />
</svg>`;

fs.writeFileSync(path.join(imagesDir, 'screenshot1.svg'), screenshotSVG);
console.log('Generated screenshot1.svg');

console.log('Icon generation complete!');
console.log('Note: These are SVG placeholders. For production, convert them to PNG format.'); 