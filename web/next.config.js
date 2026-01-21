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
    
    // Fix for Supabase ESM wrapper.mjs - ensure proper module resolution
    // The issue is that wrapper.mjs imports from '../module/index.js' which has no default export
    // We need to tell webpack to handle this correctly
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules\/@supabase/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    })
    
    // Handle .js files in the module directory
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/@supabase\/supabase-js\/dist\/module/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    })
    
    // Configure module resolution to handle the import correctly
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.js'],
    }
    
    // Use a webpack alias to redirect the problematic import
    // This makes webpack use the main (CJS) build instead of ESM for internal resolution
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    
    return config
  },
}

module.exports = nextConfig

