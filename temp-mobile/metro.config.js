const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Completely isolate this package from workspace detection
config.projectRoot = __dirname;
config.watchFolders = [];

// Override resolver to prevent looking outside this directory
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
  ],
  // Prevent Metro from looking for workspace files
  resolverMainFields: ['react-native', 'browser', 'main'],
  // Block access to parent directories
  blockList: [
    /.*\/\.git\/.*/,
    /.*\/node_modules\/.*\/node_modules\/.*/,
    /.*\/\.\.\/.*/, // Block any parent directory access
  ],
};

// Disable workspace detection entirely
config.transformer = {
  ...config.transformer,
  // Ensure no workspace-related transformations
  enableBabelRCLookup: false,
  enableBabelRuntime: false,
};

// Override Metro's workspace detection
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If it's trying to resolve workspace-related files, block it
  if (moduleName.includes('workspace') || moduleName.includes('yarn.lock') || moduleName.includes('package.json')) {
    if (!moduleName.startsWith('./') && !moduleName.startsWith(__dirname)) {
      return null;
    }
  }

  // Use default resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
