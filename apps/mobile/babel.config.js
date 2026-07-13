module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // react-native-worklets (used by reanimated v4) must be the LAST plugin.
    plugins: ['react-native-worklets/plugin'],
  };
};
