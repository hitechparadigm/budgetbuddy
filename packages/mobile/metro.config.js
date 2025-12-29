const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for TypeScript path mapping
config.resolver.alias = {
  '@': './src',
  '@/components': './src/components',
  '@/screens': './src/screens',
  '@/navigation': './src/navigation',
  '@/services': './src/services',
  '@/hooks': './src/hooks',
  '@/utils': './src/utils',
  '@/types': './src/types',
  '@/store': './src/store',
  '@/test': './src/test',
  '@/constants': './src/constants',
};

module.exports = config;
