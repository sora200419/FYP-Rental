import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        // No pathname restriction — allows any Cloudinary image URL
      },
    ],
  },
};

export default nextConfig;
