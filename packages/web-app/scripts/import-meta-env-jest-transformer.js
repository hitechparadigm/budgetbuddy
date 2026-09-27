/**
 * Jest transformer wrapper that rewrites `import.meta.env` references to a
 * global shim before handing the source off to ts-jest.
 *
 * Vite's `import.meta.env` is ESM-only syntax that Node's CommonJS loader
 * (which Jest uses to execute compiled test files) cannot run - ts-jest
 * compiles it as-is because the project's tsconfig.json sets
 * `module: "ESNext"`, so the emitted code keeps `import.meta` and Node
 * throws "Cannot use 'import.meta' outside a module" at require() time.
 *
 * This is a source-text rewrite (not an AST transform) applied before
 * ts-jest sees the file, so it only affects the Jest test run - production
 * Vite builds are untouched.
 *
 * Also overrides `esModuleInterop`/`allowSyntheticDefaultImports` to `true`
 * for this Jest-only compile - the project's real tsconfig.json omits them
 * (Vite handles default-import interop itself at bundle time), but ts-jest's
 * CommonJS output needs them for `import React from 'react'`-style imports
 * to resolve the default export correctly.
 */

const { TsJestTransformer } = require('ts-jest');
const tsJestTransformer = new TsJestTransformer({
  tsconfig: {
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
  },
});

module.exports = {
  process(sourceText, sourcePath, options) {
    const rewritten = sourceText.replace(
      /import\.meta\.env/g,
      'globalThis.__viteEnv',
    );
    return tsJestTransformer.process(rewritten, sourcePath, options);
  },
  getCacheKey(sourceText, sourcePath, options) {
    return tsJestTransformer.getCacheKey(sourceText, sourcePath, options);
  },
};