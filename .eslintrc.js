module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unexpected-multiline': 'error',
    'no-unreachable': 'error',
    'valid-typeof': 'error',
    'no-undef': 'error',
    'no-unused-vars': 'warn',
    'no-unsafe-optional-chaining': 'error',
    'space-infix-ops': 'error',
    'keyword-spacing': 'error',
    'space-before-blocks': 'error',
    'no-multi-spaces': 'error',
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': 'error',
    'object-shorthand': 'error',
  },
  overrides: [{
    files: ['backend/functions/*/index.js'],
    env: {
      node: true,
      es2021: true,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', {
        'argsIgnorePattern': '^_'
      }],
    }
  }]
};
