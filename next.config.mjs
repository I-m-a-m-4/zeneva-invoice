/** @type {import('next').NextConfig} */
const isTauri = process.env.IS_TAURI === 'true';

const nextConfig = {
  ...(isTauri ? { output: 'export' } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: isTauri,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'zeneva.space',
      }
    ],
  },
};

export default nextConfig;
