module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'prettier',
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        // Prevent syntax errors that caused our 502 issues
        'no-unexpected-multiline': 'error',
        'no-unreachable': 'error',
        'valid-typeof': 'error',
        'no-undef': 'error',
        'no-unused-vars': 'warn',

        // Optional chaining and nullish coalescing validation
        'no-unsafe-optional-chaining': 'error',

        // Consistent spacing to prevent "? ." syntax errors
        'space-infix-ops': 'error',
        'keyword-spacing': 'error',
        'space-before-blocks': 'error',
        'no-multi-spaces': 'error',

        // Prevent common JavaScript mistakes
        'no-console': 'off', // Allow console in Lambda functions
        'prefer-const': 'error',
        'no-var': 'error',
        'eqeqeq': 'error',
        'no-implicit-globals': 'error',

        // Function and object consistency
        'func-style': ['error', 'declaration', {
            'allowArrowFunctions': true
        }],
        'object-shorthand': 'error',
    },
    overrides: [{
            // Specific rules for Lambda functions
            files: ['backend/functions/*/index.js'],
            env: {
                node: true,
                es2021: true,
            },
            rules: {
                'no-console': 'off', // Console logging is needed in Lambda
                'no-unused-vars': ['error', {
                    'argsIgnorePattern': '^_'
                }],
                // Ensure proper async/await usage
                'require-await': 'error',
                'no-return-await': 'error',
            }
        },
        {
            // TypeScript files
            files: ['**/*.ts', '**/*.tsx'],
            parser: '@typescript-eslint/parser',
            plugins: ['@typescript-eslint'],
            extends: [
                'eslint:recommended',
                '@typescript-eslint/recommended',
                'prettier',
            ],
            rules: {
                '@typescript-eslint/no-unused-vars': ['error', {
                    'argsIgnorePattern': '^_'
                }],
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/no-explicit-any': 'warn',
            }
        }
    ]
};