const tsPreset = require("ts-jest/jest-preset");
const dynalitePreset = require("jest-dynalite/jest-preset");

module.exports = {
  ...tsPreset,
  ...dynalitePreset,
  // Prefer TypeScript sources over any stale compiled .js siblings that `tsc`
  // may have emitted into src/ (those are gitignored build artifacts).
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
  // Transpile-only: source types are checked by `tsc` (`src/**/*.ts`); this
  // avoids false-positive type errors in tests caused by multiple transitive
  // @smithy/types versions resolved across the AWS SDK clients.
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true }],
  },
};
