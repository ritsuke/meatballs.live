/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    domains: ['images.unsplash.com']
  },
  // https://github.com/vercel/next.js/issues/34177#issuecomment-1034970384
  // swcMinify: true,
  webpack: (config) => {
    config.experiments = {
      layers: true,
      topLevelAwait: true
    }
    return config
  },
  async rewrites() {
    return [
      {
        source: '/c/:year/:month/:day/',
        destination: '/_collections/:year/:month/:day/'
      },
      {
        source: '/c/:year/:month/:day/:cid/',
        destination: '/_collections/:year/:month/:day/:cid/'
      }
    ]
  }
}

module.exports = nextConfig
