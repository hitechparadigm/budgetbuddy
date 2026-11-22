module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  // Resolve lib/*.ts before any locally compiled (git-ignored) lib/*.js, the
  // same preference cdk.json gives ts-node with --prefer-ts-exts.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
