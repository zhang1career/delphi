module.exports = function (api) {
  api.cache.using(
    () =>
      `${process.env.RUN_ENV ?? ""}|${process.env.API_CONFIG_PUBLIC_URL ?? ""}|${process.env.API_CONFIG_PUBLIC_KEY ?? ""}|${process.env.API_CONFIG_ACCESS_KEY ?? ""}`,
  );
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "nativewind/babel",
      "react-native-reanimated/plugin",
    ],
  };
};
