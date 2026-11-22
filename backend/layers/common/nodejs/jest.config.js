module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js', '**/*.pbt.test.js'],
  // Layer modules require each other by their Lambda path (/opt/nodejs/<name>).
  moduleNameMapper: {
    '^/opt/nodejs/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    '*.js',
    '!jest.config.js',
    '!*.test.js',
    '!*.pbt.test.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  verbose: true,
};
