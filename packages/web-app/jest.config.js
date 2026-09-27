module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/*.test.ts?(x)', '**/*.spec.ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@budget-buddy/shared/dist/(.*)$': '<rootDir>/../shared/src/$1',
    '^@budget-buddy/shared$': '<rootDir>/../shared/src',
  },
  // Rewrites `import.meta.env` to `globalThis.__viteEnv` before ts-jest
  // compiles, since Vite's import.meta syntax can't run under Jest's
  // CommonJS loader (see scripts/import-meta-env-jest-transformer.js).
  transform: {
    '^.+\\.tsx?$': '<rootDir>/scripts/import-meta-env-jest-transformer.js',
  },
  setupFiles: ['<rootDir>/scripts/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/main.tsx',
  ],
};