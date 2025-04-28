// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: {
    enabled: false
  },
  site: 'https://Rin313.github.io',
  base: '/StegLLM',
  // outDir: '../StegLLM/data/dist'
  // build: {
  //   inlineStylesheets: `always`,//内联css
  // },
});
//   This information helps us improve Astro.
//   Run "astro telemetry disable" to opt-out.
//   https://astro.build/telemetry