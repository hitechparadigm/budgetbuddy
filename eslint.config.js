// ESLint 9 flat config format
// Migration from .eslintrc.js

const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        // Node.js globals
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        Buffer: "readonly",
        global: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
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
  },
  {
    files: ["backend/functions/*/index.js"],
    rules: {
      "no-console": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
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
  {
    // Wave 3 design 9.4: DynamoDB keys are built only by the layer's keys.js.
    // "warn" from phase 0; becomes "error" in phase 11.
    files: ["backend/**/*.js"],
    ignores: [
      "backend/layers/common/nodejs/keys.js",
      "backend/**/*.test.js",
      "backend/**/__tests__/**",
      "backend/**/node_modules/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Literal[value=/^(BUDGET|USER|PERIOD|TOTAL|TRANSACTION|TXN|FAMILY|PLAN|MEMBER|ACCOUNT|GOAL|BILL)#/]",
          message:
            "Build DynamoDB keys with /opt/nodejs/keys (backend/layers/common/nodejs/keys.js), not string literals.",
        },
        {
          selector:
            "TemplateLiteral > TemplateElement:first-child[value.raw=/^(BUDGET|USER|PERIOD|TOTAL|TRANSACTION|TXN|FAMILY|PLAN|MEMBER|ACCOUNT|GOAL|BILL)#/]",
          message:
            "Build DynamoDB keys with /opt/nodejs/keys (backend/layers/common/nodejs/keys.js), not template literals.",
        },
      ],
    },
  },
];
