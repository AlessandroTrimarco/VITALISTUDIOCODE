import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.fal.run' },
      { protocol: 'https', hostname: '**.fal.ai' },
      { protocol: 'https', hostname: 'replicate.delivery' },
      { protocol: 'https', hostname: '**.cdn.bfl.ai' },
      { protocol: 'https', hostname: '**.lumalabs.ai' },
    ],
  },
}

export default nextConfig
