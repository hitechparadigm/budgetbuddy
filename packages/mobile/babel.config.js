module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
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
          },
        },
      ],
      // No react-native-reanimated/plugin entry: since SDK 54, babel-preset-expo
      // adds the react-native-worklets plugin that Reanimated 4 needs.
    ],
  };
};
