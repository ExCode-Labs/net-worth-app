// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // Reanimated shared values are mutated via `sharedValue.value = ...`,
      // which is the documented API. The React Compiler immutability rule
      // mis-flags this pattern, so disable it for this Reanimated-based app.
      "react-hooks/immutability": "off",
    },
  },
  {
    ignores: ["dist/*"],
  }
]);
