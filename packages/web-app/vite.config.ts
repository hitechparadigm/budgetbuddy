import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    define: {
      // Vite leaves an UNSET env var as `{}.VITE_X`, which Rollup cannot fold. Defining
      // the flag as a literal lets the build drop the disabled Google sign-in branch, so
      // no @react-oauth/google chunk (or accounts.google.com reference) ships while off.
      'import.meta.env.VITE_ENABLE_GOOGLE_SIGNIN': JSON.stringify(
        env.VITE_ENABLE_GOOGLE_SIGNIN ?? '',
      ),
    },
    build: {
      outDir: 'dist',
      // Chunk size warning threshold raised — recharts lazy chunk is intentionally large
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks — split frequently-used libraries into stable hashed files
            // so users don't re-download them when only app code changes
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-lucide': ['lucide-react'],
            // AI generation page is visited once per user lifetime — split it
            'page-ai-budget': [
              './src/pages/AIBudgetGenerationPage.tsx',
            ],
          },
        },
      },
    },
  };
});
