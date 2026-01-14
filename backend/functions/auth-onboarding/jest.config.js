module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: ["index.js", "utils/**/*.js", "!**/*.test.js"],
  moduleNameMapper: {
    "^/opt/nodejs/shared/(.*)$": "<rootDir>/__mocks__/shared/$1.js",
  },
};
