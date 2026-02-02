module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js", "**/*.pbt.test.js"],
  moduleNameMapper: {
    "^/opt/nodejs/utils$": "<rootDir>/__mocks__/opt/nodejs/utils.js",
    "^/opt/nodejs/shared$": "<rootDir>/__mocks__/opt/nodejs/shared.js",
  },
  collectCoverageFrom: ["index.js"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
