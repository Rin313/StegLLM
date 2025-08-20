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
    esbuild:{
      drop: ["console"],//移除console.log
    }
  },
  site: 'https://Rin313.github.io',
  base: '/StegLLM',
  //outDir: './StegLLM/data/dist/StegLLM'
});