import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base matches the GitHub Pages project path (gcomstock.github.io/bobyard/);
// dev server stays at /
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/bobyard/' : '/',
}));
