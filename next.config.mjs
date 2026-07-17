/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pg", "bcryptjs"],
};

export default nextConfig;
