import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// BASE_PATH lets the same build work at a domain root (Vercel) or under
// /<repo-name>/ (GitHub Pages project sites). Set by the deploy workflow.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  // MapLibre's worker is an ES module (see src/map/maplibre.ts).
  worker: { format: 'es' },
  build: {
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    environment: 'node',
  },
});
