import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// BASE_PATH lets the build work under a sub-path (e.g. a GitHub Pages project site at
// /<repo-name>/). Cloudflare Pages serves the site at the root, so it is normally unset.
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
