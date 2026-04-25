import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'demo'),
  resolve: {
    alias: {
      // Let the demo import the TS source directly, no build step needed
      '@catalyst/gaze-engine': resolve(__dirname, 'src/index.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
