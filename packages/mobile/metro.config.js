const path = require('path');

// Custom Metro config that bypasses all workspace detection
module.exports = {
  projectRoot: __dirname,
  watchFolders: [],

  resolver: {
    platforms: ['ios', 'android', 'native', 'web'],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
    ],
    resolverMainFields: ['react-native', 'browser', 'main'],
    blockList: [
      /.*\/\.git\/.*/,
      /.*\/node_modules\/.*\/node_modules\/.*/,
    ],
    sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx'],
    assetExts: ['glb', 'gltf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'webm', 'wav', 'mp3', 'm4a', 'aac', 'oga', 'ttf', 'otf', 'woff', 'woff2'],
  },

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  },

  serializer: {
    getModulesRunBeforeMainModule: () => [
      require.resolve('react-native/Libraries/Core/InitializeCore'),
    ],
  },

  server: {
    port: 8081,
  },
};
