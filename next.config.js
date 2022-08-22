/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  // https://github.com/vercel/next.js/issues/34177#issuecomment-1034970384
  // swcMinify: true,
  webpack: (config) => {
    config.experiments = {
      layers: true,
      topLevelAwait: true
    }
    return config
  }
}

module.exports = nextConfig
