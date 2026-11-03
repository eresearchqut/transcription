const tsPreset = require("ts-jest/jest-preset");
const dynalitePreset = require("jest-dynalite/jest-preset");

module.exports = {
  ...tsPreset,
  ...dynalitePreset,
  // test/integration needs a running local stack, so it is not part of
  // `pnpm test`. Run it with `pnpm test:integration`.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/test/integration/"],
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
