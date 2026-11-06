import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
// The order workflow lives beside api/ and web/ so both enforce and explain the same rules.
const sharedDirectory = path.resolve(currentDirectory, '../shared');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': sharedDirectory,
      '@': path.resolve(currentDirectory, './src'),
    },
  },
  server: {
    fs: { allow: [currentDirectory, sharedDirectory] },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries change far less often than the app: in their own files they stay cached
        // in the browser across releases, so an update downloads only the app code again.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) return 'vendor-firebase';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
});
