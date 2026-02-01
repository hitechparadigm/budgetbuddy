module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^/opt/nodejs/utils$": "<rootDir>/__mocks__/opt/nodejs/utils.js",
    "^/opt/nodejs/shared$": "<rootDir>/__mocks__/opt/nodejs/shared.js",
  },
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: ["index.js"],
};
