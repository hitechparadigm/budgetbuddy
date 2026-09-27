// Global shim for import.meta.env, rewritten by
// scripts/import-meta-env-jest-transformer.js to globalThis.__viteEnv.
// Provides an empty object so every `import.meta.env.VITE_*` access in
// test-rendered source resolves to `undefined` (matching Vite's behavior
// when an env var isn't set) instead of throwing.
(globalThis as any).__viteEnv = {};