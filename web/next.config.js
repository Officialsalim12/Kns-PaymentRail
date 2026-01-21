/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  transpilePackages: ['@supabase/supabase-js', '@supabase/ssr'],
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js', '@supabase/ssr'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // Fix for Supabase ESM wrapper.mjs
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules\/@supabase/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    })
    
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/@supabase\/supabase-js\/dist\/module/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    })
    
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.js'],
    }
    
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    
    return config
  },
}

module.exports = nextConfig

