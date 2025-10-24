module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/backend', '<rootDir>/packages'],
    testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/*.(test|spec).+(ts|tsx|js)',
    ],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    collectCoverageFrom: [
        'backend/**/*.{ts,js}',
        'packages/**/*.{ts,tsx,js,jsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/build/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/packages/shared/src/$1',
    },
};