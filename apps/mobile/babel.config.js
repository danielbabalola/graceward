module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // In this pnpm monorepo babel-preset-expo can't auto-detect the hoisted
    // react-native-worklets, so Reanimated worklets are never transformed.
    // Register the plugin explicitly; it must remain the last plugin.
    plugins: ["react-native-worklets/plugin"],
  };
};
