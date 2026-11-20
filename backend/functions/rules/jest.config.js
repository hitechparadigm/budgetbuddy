/**
 * Jest config for the rules Lambda.
 *
 * `/opt/nodejs/utils` is the Lambda layer path, which does not exist locally,
 * so it is mapped to the mock in __mocks__/utils.js. Same approach as
 * backend/functions/accounts.
 */
module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^/opt/nodejs/utils$': '<rootDir>/__mocks__/utils.js',
  },
  collectCoverageFrom: ['*.js', '!*.test.js', '!jest.config.js'],
  coverageReporters: ['text', 'lcov'],
};
