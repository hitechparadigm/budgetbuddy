module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js"],
  // No setup files to avoid AWS SDK mocking conflicts
  verbose: true,
};
