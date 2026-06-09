import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  build: {
    inlineStylesheets: `always`,//内联css
    format: 'directory',
    //assets默认为_astro，目前不能设置为空
  },
  devToolbar: {
    enabled: false
  },
  vite: {
    plugins: [tailwindcss()],
  },
  site: 'https://Rin313.github.io',
  base: process.env.GITHUB_ACTIONS ? '/StegLLM/' : '',
  outDir: process.env.GITHUB_ACTIONS ? 'dist' : './StegLLM/data/dist'
});