module.exports = {
    root: true,
    env: {
        node: true,
        es2022: true,
    },
    extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        'prettier',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
        'prettier/prettier': 'error',
        '@typescript-eslint/no-unused-vars': ['error', {
            argsIgnorePattern: '^_'
        }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': 'warn',
    },
    overrides: [{
            files: ['**/*.test.ts', '**/*.test.js'],
            env: {
                jest: true,
            },
        },
        {
            files: ['infrastructure/**/*.ts'],
            rules: {
                'no-console': 'off', // Allow console.log in CDK code
            },
        },
    ],
    ignorePatterns: [
        'node_modules/',
        'dist/',
        'build/',
        'cdk.out/',
        '*.d.ts',
    ],
};