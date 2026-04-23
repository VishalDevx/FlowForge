const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@flowforge/contracts'],
  webpack: (config) => {
    config.resolve.falias = {
      ...config.resolve.falias,
      '@flowforge/contracts': require('path').resolve(__dirname, '../../packages/contracts/src'),
    };
    return config;
  },
};

module.exports = nextConfig;