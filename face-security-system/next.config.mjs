/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // face-api.js expects a Node-style environment for a couple of internals
  // when imported on the client; this keeps the client bundle happy.
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, encoding: false };
    return config;
  },
};

export default nextConfig;
