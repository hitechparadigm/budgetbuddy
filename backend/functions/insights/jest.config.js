module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js', '**/*.pbt.test.js'],
  collectCoverageFrom: [
    '*.js',
    '!jest.config.js',
    '!*.test.js',
    '!*.pbt.test.js',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  moduleNameMapper: {
    '^/opt/nodejs/utils$': '<rootDir>/__mocks__/utils.js',
    '^/opt/nodejs/entitlements$': '<rootDir>/__mocks__/entitlements.js',
  },
  verbose: true,
};
