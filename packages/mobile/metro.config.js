const path = require('path');

// @budget-buddy/shared is linked via file:../shared and resolved in
// node_modules as a symlink (npm) / junction (Windows). Several screens
// import deep subpaths like `@budget-buddy/shared/src/utils/currency`
// (not just the package root) to reach exports the package's index.ts
// does not re-export. Metro only follows symlinks into directories it is
// explicitly told to watch - an empty watchFolders (as this file
// previously had) makes those files invisible to the resolver even
// though the symlink itself exists, which only surfaces as a hard
// failure during a real release bundle (e.g. on EAS Build's Linux
// containers), not in local Metro dev server runs that happen to warm a
// stale cache first.
const sharedPackageRoot = path.resolve(__dirname, '../shared');

// Custom Metro config that bypasses workspace auto-detection, but still
// explicitly watches the one real monorepo dependency this app has.
module.exports = {
  projectRoot: __dirname,
  watchFolders: [sharedPackageRoot],

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