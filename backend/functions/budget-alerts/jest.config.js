module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  // The common layer and the SDK v3 Lambda client exist only inside the Lambda
  // runtime (/opt/nodejs and the Node 20 bundled SDK), so map them to local stubs.
  moduleNameMapper: {
    '^/opt/nodejs/utils$': '<rootDir>/__mocks__/opt/nodejs/utils.js',
    '^@aws-sdk/client-lambda$': '<rootDir>/__mocks__/@aws-sdk/client-lambda.js',
  },
};
