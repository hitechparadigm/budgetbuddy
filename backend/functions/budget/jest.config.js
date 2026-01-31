module.exports = {
  testEnvironment: "node",
  coveragePathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper: {
    "^/opt/nodejs/(.*)$": "<rootDir>/__mocks__/opt/nodejs/$1",
  },
};
