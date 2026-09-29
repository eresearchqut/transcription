const tsPreset = require("ts-jest/jest-preset");

/**
 * Integration suite: runs against a local stack that is already up, rather
 * than the mocked AWS SDK the unit suite uses.
 *
 * Separate from jest.config.js because the unit preset starts jest-dynalite,
 * which would shadow the emulator's DynamoDB with an in-process one.
 */
module.exports = {
  ...tsPreset,
  testMatch: ["<rootDir>/test/integration/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true }],
  },
};
