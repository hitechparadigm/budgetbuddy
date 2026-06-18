module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-unexpected-multiline": "error",
    "no-unreachable": "error",
    "valid-typeof": "error",
    "no-undef": "error",
    "no-unused-vars": "warn",
    "no-unsafe-optional-chaining": "error",
    "space-infix-ops": "error",
    "keyword-spacing": "error",
    "space-before-blocks": "error",
    "no-multi-spaces": "error",
    "no-console": "off",
    "prefer-const": "error",
    "no-var": "error",
    eqeqeq: "error",
    "object-shorthand": "error",
  },
  overrides: [
    {
      files: ["backend/functions/*/index.js"],
      env: {
        node: true,
        es2021: true,
      },
      rules: {
        "no-console": "off",
        "no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
        // Prevent import ordering bugs - variables must be defined before use
        "no-use-before-define": [
          "error",
          {
            functions: false, // Function hoisting is OK
            classes: true,
            variables: true, // Variables must be defined before use
          },
        ],
        // Warn about large files that should be refactored
        "max-lines": [
          "warn",
          {
            max: 500,
            skipBlankLines: true,
            skipComments: true,
          },
        ],
        // Warn about large functions
        "max-lines-per-function": [
          "warn",
          {
            max: 100,
            skipBlankLines: true,
            skipComments: true,
          },
        ],
      },
    },
  ],
};
