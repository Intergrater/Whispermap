/**
 * WhisperMap Build Script
 * This script minifies CSS and JavaScript files for production
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');
const imageminSvgo = require('imagemin-svgo');
const imageminWebp = require('imagemin-webp');

// Directories
const PUBLIC_DIR = path.join(__dirname, 'public');
const DIST_DIR = path.join(__dirname, 'dist');
const CSS_DIR = path.join(PUBLIC_DIR, 'css');
const JS_DIR = path.join(PUBLIC_DIR, 'js');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');
const SOUNDS_DIR = path.join(PUBLIC_DIR, 'sounds');

// Create dist directory if it doesn't exist
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR);
  fs.mkdirSync(path.join(DIST_DIR, 'public'));
  fs.mkdirSync(path.join(DIST_DIR, 'public', 'css'));
  fs.mkdirSync(path.join(DIST_DIR, 'public', 'js'));
  fs.mkdirSync(path.join(DIST_DIR, 'public', 'images'));
  fs.mkdirSync(path.join(DIST_DIR, 'public', 'sounds'));
  fs.mkdirSync(path.join(DIST_DIR, 'server'));
}

// Minify JavaScript files
async function minifyJavaScript() {
  console.log('Minifying JavaScript files...');
  
  const jsFiles = fs.readdirSync(JS_DIR).filter(file => file.endsWith('.js'));
  
  for (const file of jsFiles) {
    const filePath = path.join(JS_DIR, file);
    const code = fs.readFileSync(filePath, 'utf8');
    
    try {
      const minified = await minify(code, {
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        mangle: true
      });
      
      fs.writeFileSync(path.join(DIST_DIR, 'public', 'js', file), minified.code);
      console.log(`✓ Minified ${file}`);
    } catch (error) {
      console.error(`Error minifying ${file}:`, error);
    }
  }
}

// Minify CSS files
function minifyCSS() {
  console.log('Minifying CSS files...');
  
  const cssFiles = fs.readdirSync(CSS_DIR).filter(file => file.endsWith('.css'));
  
  for (const file of cssFiles) {
    const filePath = path.join(CSS_DIR, file);
    const css = fs.readFileSync(filePath, 'utf8');
    
    try {
      const minified = new CleanCSS({
        level: 2,
        compatibility: 'ie11'
      }).minify(css);
      
      fs.writeFileSync(path.join(DIST_DIR, 'public', 'css', file), minified.styles);
      console.log(`✓ Minified ${file}`);
    } catch (error) {
      console.error(`Error minifying ${file}:`, error);
    }
  }
}

// Optimize images
async function optimizeImages() {
  console.log('Optimizing images...');
  
  try {
    const files = await imagemin([`${IMAGES_DIR}/*.{jpg,png,svg}`], {
      destination: path.join(DIST_DIR, 'public', 'images'),
      plugins: [
        imageminJpegtran(),
        imageminPngquant({
          quality: [0.6, 0.8]
        }),
        imageminSvgo({
          plugins: [{
            name: 'removeViewBox',
            active: false
          }]
        })
      ]
    });
    
    console.log(`✓ Optimized ${files.length} images`);
    
    // Convert images to WebP format
    await imagemin([`${IMAGES_DIR}/*.{jpg,png}`], {
      destination: path.join(DIST_DIR, 'public', 'images'),
      plugins: [
        imageminWebp({quality: 75})
      ]
    });
    
    console.log('✓ Created WebP versions of images');
  } catch (error) {
    console.error('Error optimizing images:', error);
  }
}

// Copy HTML files
function copyHTMLFiles() {
  console.log('Copying HTML files...');
  
  try {
    fs.copyFileSync(
      path.join(__dirname, 'index.html'),
      path.join(DIST_DIR, 'index.html')
    );
    console.log('✓ Copied index.html');
    
    // Copy manifest.json
    fs.copyFileSync(
      path.join(__dirname, 'manifest.json'),
      path.join(DIST_DIR, 'manifest.json')
    );
    console.log('✓ Copied manifest.json');
  } catch (error) {
    console.error('Error copying HTML files:', error);
  }
}

// Copy server files
function copyServerFiles() {
  console.log('Copying server files...');
  
  try {
    const serverFiles = fs.readdirSync(path.join(__dirname, 'server')).filter(file => file.endsWith('.js'));
    
    for (const file of serverFiles) {
      fs.copyFileSync(
        path.join(__dirname, 'server', file),
        path.join(DIST_DIR, 'server', file)
      );
      console.log(`✓ Copied ${file}`);
    }
  } catch (error) {
    console.error('Error copying server files:', error);
  }
}

// Copy sound files
function copySoundFiles() {
  console.log('Copying sound files...');
  
  try {
    const soundFiles = fs.readdirSync(SOUNDS_DIR);
    
    for (const file of soundFiles) {
      fs.copyFileSync(
        path.join(SOUNDS_DIR, file),
        path.join(DIST_DIR, 'public', 'sounds', file)
      );
      console.log(`✓ Copied ${file}`);
    }
  } catch (error) {
    console.error('Error copying sound files:', error);
  }
}

// Create package.json for production
function createPackageJSON() {
  console.log('Creating production package.json...');
  
  try {
    const packageJSON = require('./package.json');
    
    // Remove development dependencies
    delete packageJSON.devDependencies;
    
    // Add start script
    packageJSON.scripts = {
      start: 'node server/server.js'
    };
    
    fs.writeFileSync(
      path.join(DIST_DIR, 'package.json'),
      JSON.stringify(packageJSON, null, 2)
    );
    console.log('✓ Created production package.json');
  } catch (error) {
    console.error('Error creating production package.json:', error);
  }
}

// Run build process
async function build() {
  console.log('Starting build process...');
  
  try {
    await minifyJavaScript();
    minifyCSS();
    await optimizeImages();
    copyHTMLFiles();
    copyServerFiles();
    copySoundFiles();
    createPackageJSON();
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
  }
}

// Run the build
build(); 