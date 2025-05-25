// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  build: {
    inlineStylesheets: `always`,//内联css
    format: 'directory'
  },
  devToolbar: {
    enabled: false
  },
  vite: {
    plugins: [tailwindcss()],
  },
  site: 'https://Rin313.github.io',
  base: '/StegLLM',
  //outDir: '../StegLLM/data/dist/StegLLM',
});