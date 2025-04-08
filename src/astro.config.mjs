// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false
  },
  build: {
    inlineStylesheets: `always`,//内联css
  },
  vite: {
    plugins: [tailwindcss()],
  },
  outDir: '../StegLLM/data/dist'
});
//   This information helps us improve Astro.
//   Run "astro telemetry disable" to opt-out.
//   https://astro.build/telemetry