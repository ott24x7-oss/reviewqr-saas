const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"]
  },
  {
    // Reanimated shared values are updated by writing `.value`. That is the library API.
    rules: {
      "react-hooks/immutability": "off"
    }
  }
]);
