/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lint nao bloqueia o build de producao (rode `npm run lint` separadamente).
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
