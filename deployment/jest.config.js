const tsPreset = require("ts-jest/jest-preset");

module.exports = {
  ...tsPreset,
  // Prefer TypeScript sources over any stale compiled .js siblings that `tsc`
  // may have emitted into lib/ (those are gitignored build artifacts).
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "mjs",
    "cjs",
    "jsx",
    "json",
    "node",
  ],
  // Only pick up TypeScript tests; `tsc` output (gitignored .js siblings) must
  // not be collected.
  testMatch: ["<rootDir>/test/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true }],
  },
};
