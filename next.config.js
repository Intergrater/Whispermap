/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    // This is to handle Leaflet's browser-specific dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      http: false,
      https: false,
      zlib: false,
      stream: false,
      crypto: false,
      buffer: false,
      util: false,
      url: false,
      assert: false,
    };
    
    // Instead of using null-loader which might not be installed,
    // we'll use the ignore-loader pattern
    config.module.rules.push({
      test: /node_modules\/leaflet/,
      resolve: {
        alias: {
          leaflet$: false
        }
      }
    });
    
    return config;
  },
  // Ensure images from Leaflet can be properly loaded
  images: {
    domains: ['a.tile.openstreetmap.org', 'b.tile.openstreetmap.org', 'c.tile.openstreetmap.org'],
    unoptimized: true, // This helps with Leaflet tile images
  },
  // Temporarily disable all API routes except for test-simple
  // This is to help diagnose deployment issues
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/test-simple',
      },
    ];
  },
}

module.exports = nextConfig 