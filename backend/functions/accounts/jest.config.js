module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js", "**/*.pbt.test.js"],
  collectCoverageFrom: [
    "*.js",
    "!jest.config.js",
    "!*.test.js",
    "!*.pbt.test.js",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    "^/opt/nodejs/utils$": "<rootDir>/__mocks__/utils.js",
    "^/opt/nodejs/shared$": "<rootDir>/__mocks__/shared.js",
  },
  setupFilesAfterEnv: [],
  verbose: true,
};
