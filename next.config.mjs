/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'coverartarchive.org',
      },
      {
        protocol: 'https',
        hostname: '*.archive.org',
      },
      {
        protocol: 'https',
        hostname: '*.ca.archive.org',
      },
      {
        protocol: 'https',
        hostname: '*.us.archive.org',
      },
      {
        protocol: 'https',
        hostname: 'is*.mzstatic.com',
      },
    ],
  },
};

export default nextConfig;
