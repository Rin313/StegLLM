// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  build: {
    inlineStylesheets: `always`,//内联css
  },
  devToolbar: {
    enabled: false
  },
  vite: {
    plugins: [tailwindcss()],
  },
  site: 'https://Rin313.github.io',
  base: '/StegLLM',
  // outDir: '../StegLLM/data/dist',
});
//   This information helps us improve Astro.
//   Run "astro telemetry disable" to opt-out.
//   https://astro.build/telemetry