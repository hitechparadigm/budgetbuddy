const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable workspace detection to avoid JSON parsing issues
config.watchFolders = [];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure we're not trying to resolve outside the mobile package
config.projectRoot = __dirname;

module.exports = config;
