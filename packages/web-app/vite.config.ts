import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
});
