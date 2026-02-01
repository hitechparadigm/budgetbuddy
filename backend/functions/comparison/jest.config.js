module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^/opt/nodejs/utils$": "<rootDir>/__mocks__/opt/nodejs/utils.js",
    "^/opt/nodejs/shared$": "<rootDir>/__mocks__/opt/nodejs/shared.js",
  },
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: ["index.js"],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
