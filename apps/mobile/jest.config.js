module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@reviewqr/shared$": "<rootDir>/../../packages/shared/src/index.ts"
  }
};
