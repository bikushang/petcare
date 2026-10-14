/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // The Express API runs on port 3001 during local development. Keep the
    // browser on the same origin so login and other API calls do not hit
    // Next.js's built-in 404 handler for /api routes.
    if (process.env.NODE_ENV !== 'development') return [];

    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
