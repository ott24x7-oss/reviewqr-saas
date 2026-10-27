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
      "react-hooks/immutability": "off",
      // Keep import resolution, but skip the case-check that enumerates parent directories outside this worktree on Windows.
      "import/no-unresolved": ["error", { caseSensitive: false }]
    }
  }
]);
