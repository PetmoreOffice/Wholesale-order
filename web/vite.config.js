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
});
