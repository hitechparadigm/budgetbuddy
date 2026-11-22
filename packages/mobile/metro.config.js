const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// @budget-buddy/shared is linked via file:../shared and resolved in
// node_modules as a symlink (npm) / junction (Windows). Several screens
// import deep subpaths like `@budget-buddy/shared/src/utils/currency`
// (not just the package root) to reach exports the package's index.ts
// does not re-export. Metro only follows symlinks into directories it is
// explicitly told to watch - an empty watchFolders makes those files
// invisible to the resolver even though the symlink itself exists, which
// only surfaces as a hard failure during a real release bundle (e.g. on
// EAS Build's Linux containers), not in local Metro dev server runs that
// happen to warm a stale cache first.
const sharedPackageRoot = path.resolve(__dirname, '../shared');

const config = getDefaultConfig(__dirname);

config.watchFolders = [sharedPackageRoot];
// Resolve only from this package's node_modules (packages/mobile is not an
// npm workspace member), so shared's own node_modules never leak in.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
// expo-sqlite's web worker imports wa-sqlite.wasm (expo-sqlite docs, web setup).
config.resolver.assetExts.push('wasm');

module.exports = config;
