import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // reactCompiler disabled to avoid potential invalid element type issues
  reactCompiler: false,
  experimental: {
    
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'demo.suayb.xyz',
      },
    ],
  },
};

export default nextConfig;
