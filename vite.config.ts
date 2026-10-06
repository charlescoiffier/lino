import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages sert le site sous /<nom-du-dépôt>/ ; le workflow définit BASE_PATH.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
